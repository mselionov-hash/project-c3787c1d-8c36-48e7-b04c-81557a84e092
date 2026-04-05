/**
 * Signature scheme service — TZ v2.2 gating logic.
 *
 * Key semantics (Revised Plan v5):
 * - canEnterSigningFlow() does NOT require APP6 completion
 * - APP6 is signed inside the signing flow
 * - canCompletePackage() requires APP6 completion
 * - signature_scheme_effective becomes UNEP_WITH_APPENDIX_6 only after package is fully_signed
 */

import { supabase } from '@/integrations/supabase/client';
import {
  SIGNATURE_SCHEME,
  SIGNATURE_SCHEME_EFFECTIVE,
  APP6_STATUS,
  PACKAGE_STATUS,
  type SignatureScheme,
  type SignatureSchemeEffective,
} from '../variables';
import { bothPartiesAcceptedCurrentRegulation } from './regulation-service';

/**
 * Determine if APP6 is required for a given signature scheme.
 */
export function isAppendix6Required(scheme: string): boolean {
  return scheme === SIGNATURE_SCHEME.UNEP_WITH_APPENDIX_6;
}

/**
 * Derive the effective signature scheme based on current state.
 *
 * - UKEP_ONLY requested → effective = UKEP_ONLY
 * - UNEP_WITH_APPENDIX_6 requested + APP6 completed + package fully_signed
 *   → effective = UNEP_WITH_APPENDIX_6
 * - UNEP_WITH_APPENDIX_6 requested + not yet fully complete
 *   → effective = UNEP_WITH_APPENDIX_6_PENDING
 */
export function deriveSignatureSchemeEffective(
  requested: string,
  app6Status: string,
  packageStatus: string,
): SignatureSchemeEffective {
  if (requested === SIGNATURE_SCHEME.UKEP_ONLY) {
    return SIGNATURE_SCHEME_EFFECTIVE.UKEP_ONLY;
  }

  if (requested === SIGNATURE_SCHEME.UNEP_WITH_APPENDIX_6) {
    if (
      app6Status === APP6_STATUS.COMPLETED &&
      packageStatus === PACKAGE_STATUS.FULLY_SIGNED
    ) {
      return SIGNATURE_SCHEME_EFFECTIVE.UNEP_WITH_APPENDIX_6;
    }
    return SIGNATURE_SCHEME_EFFECTIVE.UNEP_WITH_APPENDIX_6_PENDING;
  }

  return SIGNATURE_SCHEME_EFFECTIVE.PENDING;
}

/**
 * Get the effective signature scheme for a loan from the DB.
 */
export async function getSignatureSchemeEffective(
  loanId: string
): Promise<SignatureSchemeEffective> {
  const [loanRes, pkgRes] = await Promise.all([
    supabase.from('loans').select('signature_scheme_requested').eq('id', loanId).single(),
    supabase.from('signature_packages').select('app6_status, package_status').eq('loan_id', loanId).single(),
  ]);

  const requested = (loanRes.data as any)?.signature_scheme_requested ?? SIGNATURE_SCHEME.UKEP_ONLY;
  const app6Status = pkgRes.data?.app6_status ?? APP6_STATUS.NOT_APPLICABLE;
  const packageStatus = pkgRes.data?.package_status ?? PACKAGE_STATUS.DRAFT;

  return deriveSignatureSchemeEffective(requested, app6Status, packageStatus);
}

/**
 * Check if the signing flow can be entered.
 *
 * Requirements:
 * 1. For UNEP_WITH_APPENDIX_6: both parties must have accepted current EDO regulation
 * 2. Initial package must be generated (not checked here — caller responsibility)
 *
 * Does NOT require APP6 completion — APP6 is signed inside the flow.
 */
export async function canEnterSigningFlow(
  loanId: string,
  lenderId: string,
  borrowerId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const loanRes = await supabase
    .from('loans')
    .select('signature_scheme_requested')
    .eq('id', loanId)
    .single();

  const requested = (loanRes.data as any)?.signature_scheme_requested;

  if (requested === SIGNATURE_SCHEME.UNEP_WITH_APPENDIX_6) {
    const regCheck = await bothPartiesAcceptedCurrentRegulation(lenderId, borrowerId);
    if (!regCheck.accepted) {
      return {
        allowed: false,
        reason: `Для режима УНЭП обе стороны должны принять Регламент ЭДО. Не приняли: ${regCheck.missing.join(', ')}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if a package can transition to fully_signed.
 *
 * Requirements:
 * - If APP6 required: app6_status must be 'completed'
 * - All initial package docs must be signed (caller checks)
 */
export async function canCompletePackage(
  loanId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const pkgRes = await supabase
    .from('signature_packages')
    .select('app6_required, app6_status')
    .eq('loan_id', loanId)
    .single();

  if (!pkgRes.data) {
    return { allowed: false, reason: 'Пакет подписи не найден' };
  }

  if (pkgRes.data.app6_required && pkgRes.data.app6_status !== APP6_STATUS.COMPLETED) {
    return {
      allowed: false,
      reason: 'Приложение 6 должно быть подписано обеими сторонами до завершения пакета',
    };
  }

  return { allowed: true };
}

/**
 * Check if a post-package document (APP3/APP4/APP5) can be generated.
 *
 * Requirements:
 * - Package must be fully_signed
 * - If APP6 was required, it must be completed
 */
export async function canGeneratePostPackageDoc(
  loanId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const pkgRes = await supabase
    .from('signature_packages')
    .select('package_status, app6_required, app6_status')
    .eq('loan_id', loanId)
    .single();

  if (!pkgRes.data) {
    return { allowed: false, reason: 'Пакет подписи не найден' };
  }

  if (pkgRes.data.package_status !== PACKAGE_STATUS.FULLY_SIGNED) {
    return { allowed: false, reason: 'Первоначальный пакет документов ещё не подписан полностью' };
  }

  if (pkgRes.data.app6_required && pkgRes.data.app6_status !== APP6_STATUS.COMPLETED) {
    return { allowed: false, reason: 'Приложение 6 не завершено' };
  }

  return { allowed: true };
}

/**
 * Check if the loan can transition to SIGNED_NO_DEBT status.
 *
 * Requirements:
 * - Package must be fully_signed
 * - Zero confirmed tranches
 */
export async function canTransitionToSignedNoDebt(
  loanId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const [pkgRes, tranchesRes] = await Promise.all([
    supabase.from('signature_packages').select('package_status').eq('loan_id', loanId).single(),
    supabase.from('loan_tranches').select('id').eq('loan_id', loanId).eq('status', 'confirmed'),
  ]);

  if (!pkgRes.data || pkgRes.data.package_status !== PACKAGE_STATUS.FULLY_SIGNED) {
    return { allowed: false, reason: 'Пакет документов не подписан полностью' };
  }

  if ((tranchesRes.data?.length ?? 0) > 0) {
    return { allowed: false, reason: 'Есть подтверждённые транши — статус должен быть ACTIVE_WITH_DEBT' };
  }

  return { allowed: true };
}

/**
 * Get a human-readable label for a signature scheme.
 */
export function getSignatureSchemeLabel(scheme: string): string {
  switch (scheme) {
    case SIGNATURE_SCHEME.UKEP_ONLY:
      return 'УКЭП';
    case SIGNATURE_SCHEME.UNEP_WITH_APPENDIX_6:
      return 'УНЭП с Приложением 6';
    default:
      return scheme;
  }
}
