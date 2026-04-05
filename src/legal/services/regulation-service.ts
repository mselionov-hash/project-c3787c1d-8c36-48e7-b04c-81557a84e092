/**
 * EDO Regulation service — TZ v2.2.
 * Manages regulation versions and user acceptances.
 */

import { supabase } from '@/integrations/supabase/client';

interface Regulation {
  id: string;
  version: string;
  title: string;
  content_hash: string | null;
  effective_from: string;
  is_current: boolean;
}

interface RegulationAcceptanceCheck {
  accepted: boolean;
  missing: string[];
}

/**
 * Get the current active EDO regulation.
 */
export async function getCurrentRegulation(): Promise<Regulation | null> {
  const { data, error } = await supabase
    .from('edo_regulations')
    .select('*')
    .eq('is_current', true)
    .single();

  if (error || !data) return null;
  return data as Regulation;
}

/**
 * Check if a specific user has accepted a specific regulation.
 */
export async function hasUserAcceptedRegulation(
  userId: string,
  regulationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('edo_regulation_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('regulation_id', regulationId)
    .single();

  return !!data;
}

/**
 * Record a user's acceptance of a regulation.
 */
export async function acceptRegulation(
  userId: string,
  regulationId: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const { error } = await supabase
    .from('edo_regulation_acceptances')
    .insert({
      user_id: userId,
      regulation_id: regulationId,
      ip_address: metadata?.ipAddress ?? null,
      user_agent: metadata?.userAgent ?? null,
    });

  if (error) {
    throw new Error(`Не удалось записать принятие регламента: ${error.message}`);
  }
}

/**
 * Check that BOTH parties have accepted the current EDO regulation.
 * Required before a UNEP signing flow can begin.
 *
 * Returns { accepted: true } if both have accepted, or
 * { accepted: false, missing: ['lender' | 'borrower'] } with who hasn't.
 */
export async function bothPartiesAcceptedCurrentRegulation(
  lenderId: string,
  borrowerId: string
): Promise<RegulationAcceptanceCheck> {
  const regulation = await getCurrentRegulation();

  if (!regulation) {
    return {
      accepted: false,
      missing: ['Регламент ЭДО не опубликован'],
    };
  }

  const [lenderAccepted, borrowerAccepted] = await Promise.all([
    hasUserAcceptedRegulation(lenderId, regulation.id),
    hasUserAcceptedRegulation(borrowerId, regulation.id),
  ]);

  const missing: string[] = [];
  if (!lenderAccepted) missing.push('Займодавец');
  if (!borrowerAccepted) missing.push('Заёмщик');

  return {
    accepted: missing.length === 0,
    missing,
  };
}
