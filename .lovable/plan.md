

# TZ v2.2 Variable Layer Migration — Implementation Plan v5

Implementing the approved plan. All phases (A through D) in a single pass.

## Files to Create (8)

### Phase A — Canonical Variable Registry
1. **`src/legal/variables/types.ts`** — Type definitions: `VariableResolutionSource`, `VariableDefinition`, canonical enums for `SignatureScheme` (`UKEP_ONLY`, `UNEP_WITH_APPENDIX_6`), `SignatureSchemeEffective`, `ReceiptPolicy`, `PackageStatus`, `App6Status`, `LoanStatus` (with `SIGNED_NO_DEBT` — correct spelling)
2. **`src/legal/variables/canonical.ts`** — All ~255 placeholders from the registry as `CANONICAL_VARIABLES: Record<string, VariableDefinition>`, plus `CONDITIONAL_VARS` (14), `AUTO_NUM_ANCHORS` (33), `REF_ANCHORS` (1) sets. ~30 vars marked `deferred`.
3. **`src/legal/variables/aliases.ts`** — `VARIABLE_ALIASES` map (old→new), `DEPRECATED_VARIABLES` set, `applyAliases()` function that emits both old and new names
4. **`src/legal/variables/index.ts`** — Re-exports

### Phase D — New Services
5. **`src/legal/services/signature-scheme.ts`** — `getSignatureSchemeEffective()`, `canEnterSigningFlow()` (requires regulation acceptance + generated package, does NOT require APP6 completion), `canCompletePackage()` (requires APP6 completion), `canGeneratePostPackageDoc()`, `canTransitionToSignedNoDebt()`
6. **`src/legal/services/receipt-policy.ts`** — Label mappers for `BANK_TRANSFER_ONLY`/`SBP_ONLY`/`BANK_TRANSFER_OR_SBP` → Russian text
7. **`src/legal/services/deal-logic.ts`** — `getDealVersion()`, `getInitiatorRole()`, `getOfferorRole()`, `getOffereeRole()`
8. **`src/legal/services/regulation-service.ts`** — `getCurrentRegulation()`, `hasUserAcceptedRegulation()`, `acceptRegulation()`, `bothPartiesAcceptedCurrentRegulation()`

## Files to Modify (4)

### Phase B — Template Engine
9. **`src/legal/services/template-engine.ts`** — Add `resolveInlinePrefixConditionals()` for `[При {VAR}=VALUE]` single-line syntax, `resolveAutoNumbering()`, `resolveReferences()`, `renderRepeatedRows()`, enhanced validation. Update `renderTemplate()` pipeline.

### Phase C — Resolver Expansion  
10. **`src/legal/services/variable-resolver.ts`** — Wrap all resolver returns with `applyAliases()`. Add new v2.2 vars to each resolver. Add `resolveApp6Variables()` and `resolveRegulationVariables()`. Deferred vars set to `[DEFERRED:VAR_NAME]`.

### Phase D — Config & Types
11. **`src/legal/services/platform-config.ts`** — Add `PLATFORM_BRAND_NAME`, `PLATFORM_OPERATOR_LEGAL_DETAILS`, `SUPPORT_CONTACTS_TEXT`, `INTEREST_ACCRUAL_START`, `EARLY_REPAYMENT_INTEREST_RULE`, `CONTRACT_LANGUAGE`, `LOAN_TYPE`
12. **`src/legal/document-types/index.ts`** — Add `UNEP_AGREEMENT` and `EDO_REGULATION` types (with `scope: 'platform' | 'loan'`)

## Database Migrations (5)

1. **Loans columns**: `signature_scheme_requested` (default `UKEP_ONLY`), `borrower_disbursement_receipt_policy`, `lender_repayment_receipt_policy`, `initiator_role`, `deal_version`, `loan_type`, `interest_accrual_start`, `early_repayment_interest_rule`
2. **`edo_regulations`** table with RLS
3. **`edo_regulation_acceptances`** table with RLS  
4. **`unep_agreements`** (APP6) table with RLS
5. **`signature_packages`** table with `signature_scheme_effective`, `package_status`, `app6_required`, `app6_status`, `signed_no_debt`

## Key Semantics

- **Active-debt status**: single canonical model — `SIGNED_NO_DEBT` = initial package signed + zero confirmed tranches. Full repayment → `CLOSED`.
- **Gating**: `canEnterSigningFlow()` checks regulation acceptance + package generated, NOT APP6 completion. APP6 completion gates only package completion and post-package docs.
- **Effective scheme**: `UNEP_WITH_APPENDIX_6_PENDING` when UNEP requested but APP6 not completed. Never falls back to `UKEP_ONLY`.
- **No template swap, no UI change, no route change**.

