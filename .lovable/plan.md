

# Revised Migration Plan with Phase 0: Template Onboarding and Variable Mapping

---

## Phase 0: Template Onboarding and Variable Mapping

### 0.1 Source Inventory

| Status | Document Type | Code Key | Source Reference | Runtime Template |
|---|---|---|---|---|
| **ready** | Договор займа | `loan_contract` | `docs/legal/source-docx/loan_contract_template.*` | `src/legal/templates/loan-contract.ts` |
| **ready** | Расписка о получении транша | `tranche_receipt` | `docs/legal/source-docx/tranche_receipt_template.*` | `src/legal/templates/tranche-receipt.ts` |
| **missing — design from scratch** | Приложение 1: Банковские реквизиты | `appendix_bank_details` | (embedded in contract template as sections 1-4 of Приложение 1) | `src/legal/templates/appendix-bank-details.ts` |
| **missing — design from scratch** | Приложение 2: График погашения | `appendix_repayment_schedule` | (embedded in contract template as conditional Приложение 2) | `src/legal/templates/appendix-repayment-schedule.ts` |
| **missing — design from scratch** | Подтверждение частичного погашения | `partial_repayment_confirmation` | none | `src/legal/templates/partial-repayment-confirmation.ts` |
| **missing — design from scratch** | Подтверждение полного погашения | `full_repayment_confirmation` | none | `src/legal/templates/full-repayment-confirmation.ts` |

### 0.2 Template Inventory

| Runtime Template File | Status | Notes |
|---|---|---|
| `src/legal/templates/loan-contract.ts` | **placeholder** → populate in Phase 4 | Full modular text with `[[IF]]` blocks exists in source pack |
| `src/legal/templates/tranche-receipt.ts` | **placeholder** → populate in Phase 4 | Full modular text with `[[IF]]` blocks exists in source pack |
| `src/legal/templates/appendix-bank-details.ts` | **placeholder** → design in Phase 4 | 4 sections: lender disbursement, borrower receiving, lender receiving, notice snapshot |
| `src/legal/templates/appendix-repayment-schedule.ts` | **placeholder** → design in Phase 4 | Conditional on `REPAYMENT_SCHEDULE_TYPE` |
| `src/legal/templates/partial-repayment-confirmation.ts` | **placeholder** → design in Phase 4 | New template |
| `src/legal/templates/full-repayment-confirmation.ts` | **placeholder** → design in Phase 4 | New template |

### 0.3 Variable Catalog (69 unique variables across ready templates)

#### Category: `scalar_printed` — direct values printed in document

| Variable | Used In | Source of Truth | In DB? | In UI? | Must Add To |
|---|---|---|---|---|---|
| `CONTRACT_NUMBER` | contract, receipt | `loans.contract_number` | No | No | `loans` table + server-side trigger |
| `CONTRACT_PLACE` | contract | `loans.city` | Yes | Yes | — (rename conceptually) |
| `LOAN_AMOUNT` | contract | `loans.amount` | Yes | Yes | — |
| `LOAN_CURRENCY` | contract | hardcoded `RUB` | — | — | platform config |
| `DAY_COUNT_BASIS` | contract | hardcoded `365/366` | — | — | platform config |
| `INTEREST_RATE_ANNUAL` | contract | `loans.interest_rate` | Yes | Yes | — |
| `EARLY_REPAYMENT_NOTICE_DAYS` | contract | `loans` or platform default | No | No | `loans` table (default 30) |
| `FINAL_REPAYMENT_DEADLINE` | contract | `loans.repayment_date` | Yes | Yes | — |
| `DISBURSEMENT_REFERENCE_RULE` | contract | platform config | No | No | platform config |
| `PAYMENT_REFERENCE_RULE` | contract | platform config | No | No | platform config |
| `LENDER_FULL_NAME` | both | `profiles.full_name` → snapshot | Yes | Yes | snapshot |
| `LENDER_DOB` | both | `profiles.date_of_birth` | **No** | **No** | **profiles + UI** |
| `LENDER_PASSPORT_SERIES` | both | `profiles.passport_series` | Yes | Yes | snapshot |
| `LENDER_PASSPORT_NUMBER` | both | `profiles.passport_number` | Yes | Yes | snapshot |
| `LENDER_PASSPORT_ISSUED_BY` | both | `profiles.passport_issued_by` | **No** | **No** | **profiles + UI** |
| `LENDER_PASSPORT_ISSUE_DATE` | both | `profiles.passport_issue_date` | **No** | **No** | **profiles + UI** |
| `LENDER_PASSPORT_DIVISION_CODE` | both | `profiles.passport_division_code` | **No** | **No** | **profiles + UI** |
| `LENDER_REG_ADDRESS` | both | `profiles.address` | Yes | Yes | snapshot |
| `LENDER_CONTACT_PHONE` | both | `profiles.phone` | Yes | Yes | snapshot |
| `LENDER_EMAIL` | both | `auth.users.email` → snapshot | Yes (auth) | Yes | snapshot |
| `LENDER_APP_ACCOUNT_ID` | both | `profiles.user_id` | Yes | No | snapshot |
| `BORROWER_FULL_NAME` | both | same as lender pattern | Yes | Yes | snapshot |
| `BORROWER_DOB` | both | `profiles.date_of_birth` | **No** | **No** | **profiles + UI** |
| `BORROWER_PASSPORT_SERIES` | both | `profiles.passport_series` | Yes | Yes | snapshot |
| `BORROWER_PASSPORT_NUMBER` | both | `profiles.passport_number` | Yes | Yes | snapshot |
| `BORROWER_PASSPORT_ISSUED_BY` | both | `profiles.passport_issued_by` | **No** | **No** | **profiles + UI** |
| `BORROWER_PASSPORT_ISSUE_DATE` | both | `profiles.passport_issue_date` | **No** | **No** | **profiles + UI** |
| `BORROWER_PASSPORT_DIVISION_CODE` | both | `profiles.passport_division_code` | **No** | **No** | **profiles + UI** |
| `BORROWER_REG_ADDRESS` | both | `profiles.address` | Yes | Yes | snapshot |
| `BORROWER_CONTACT_PHONE` | both | `profiles.phone` | Yes | Yes | snapshot |
| `BORROWER_EMAIL` | both | `auth.users.email` → snapshot | Yes (auth) | Yes | snapshot |
| `BORROWER_APP_ACCOUNT_ID` | both | `profiles.user_id` | Yes | No | snapshot |
| `TRANCHE_AMOUNT` | receipt | `loan_tranches.amount` | No | No | `loan_tranches` (new) |
| `TRANCHE_CURRENCY` | receipt | hardcoded `RUB` | — | — | platform config |
| `TRANCHE_DATE` | receipt | `loan_tranches.actual_date` | No | No | `loan_tranches` |
| `TRANCHE_TIME` | receipt | `loan_tranches.actual_time` | No | No | `loan_tranches` |
| `TRANCHE_TIMEZONE` | receipt | `loan_tranches.timezone` | No | No | `loan_tranches` |
| `TRANCHE_ID` | receipt | `loan_tranches.id` | No | No | `loan_tranches` |
| `TRANCHE_REFERENCE_TEXT` | receipt | `loan_tranches.reference_text` | No | No | `loan_tranches` |
| `TRANCHE_BANK_DOCUMENT_ID` | receipt | `loan_tranches.bank_document_id` | No | No | `loan_tranches` |
| `TRANCHE_BANK_DOCUMENT_DATE` | receipt | `loan_tranches.bank_document_date` | No | No | `loan_tranches` |
| `TRANCHE_TRANSFER_SOURCE` | receipt | `loan_tranches.transfer_source` | No | No | `loan_tranches` |
| `TRANCHE_SENDER_ACCOUNT_DISPLAY` | receipt | `loan_tranches` + bank_details render | No | No | `loan_tranches` |
| `TRANCHE_RECEIVER_ACCOUNT_DISPLAY` | receipt | `loan_tranches` + bank_details render | No | No | `loan_tranches` |
| `TRANCHE_RECEIPT_NUMBER` | receipt | `generated_documents` seq | No | No | system-generated |

#### Category: `derived_printed` — computed at render time

| Variable | Used In | Derivation |
|---|---|---|
| `LOAN_AMOUNT_IN_WORDS` | contract | `loans.amount` → number-to-words function |
| `TRANCHE_AMOUNT_IN_WORDS` | receipt | `loan_tranches.amount` → number-to-words function |

#### Category: `document_metadata` — document-level, not from user input

| Variable | Used In | Source |
|---|---|---|
| `CONTRACT_DATE` | both | `loans.created_at` or `loans.issue_date` |
| `LAST_SIGNATURE_AT` | both | `loan_signatures` max `signed_at` for the loan |
| `PLATFORM_NAME` | both | platform config constant |
| `PLATFORM_OPERATOR_NAME` | both | platform config constant |
| `PLATFORM_URL` | both | platform config constant |
| `RECEIPT_TITLE` | receipt | hardcoded: "Расписка о получении Транша" |
| `TRANCHE_RECEIPT_DRAFT_CREATED_AT` | receipt | `generated_documents.created_at` |
| `TRANCHE_RECEIPT_SIGNED_AT` | receipt | tranche receipt signature timestamp |

#### Category: `render_block` — tables/blocks rendered from structured data

| Variable | Used In | Data Source |
|---|---|---|
| `ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS_TABLE` | contract (App 1) | `loan_allowed_bank_details` + `bank_details` snapshot |
| `ALLOWED_BORROWER_RECEIVING_ACCOUNTS_TABLE` | contract (App 1) | same |
| `ALLOWED_LENDER_RECEIVING_ACCOUNTS_TABLE` | contract (App 1) | same |
| `NOTICE_SNAPSHOT_TABLE` | contract (App 1) | party snapshot: email, phone, address, app ID |
| `SCHEDULE_TABLE` | contract (App 2) | `payment_schedule_items` |
| `LENDER_SIGNATURE_BLOCK` | contract | `loan_signatures` data + render |
| `BORROWER_SIGNATURE_BLOCK` | both | `loan_signatures` data + render |
| `LENDER_SIGNATURE_BLOCK_OPTIONAL` | receipt | optional co-signature |

#### Category: `conditional_flag` — controls `[[IF]]` block inclusion

| Variable | Values | Used In | Source |
|---|---|---|---|
| `INTEREST_MODE` | `INTEREST_FREE`, `FIXED_RATE` | contract | `loans` (new field) |
| `INTEREST_PAYMENT_SCHEDULE` | `MONTHLY`, `AT_MATURITY`, `WITH_EACH_REPAYMENT` | contract | `loans` (new field) |
| `REPAYMENT_SCHEDULE_TYPE` | `NO_SCHEDULE_SINGLE_DEADLINE`, `INSTALLMENTS_FIXED`, `INSTALLMENTS_VARIABLE` | contract | `loans` (new field) |
| `TRANCHE_METHOD` | `BANK_TRANSFER`, `SBP` | receipt | `loan_tranches.method` |
| `LENDER_CO_SIGNATURE_ENABLED` | `YES` / `NO` | receipt | platform config or per-loan flag |
| `PAYMENT_PROOF_ATTACHMENT_ENABLED` | `YES` / `NO` | receipt | platform config or per-loan flag |

#### Category: `system_only` — internal, never printed in documents

| Variable | Source |
|---|---|
| `TEMPLATE_VERSION` | hardcoded per template |
| `RULES_VERSION` | platform config |
| `DOCUMENT_HASH` | computed at generation |
| `SIGNED_CONTAINER` | UKEP provider (future) |
| `CERTIFICATE_SNAPSHOT` | UKEP provider (future) |
| `SIGNATURE_VALIDATION_RESULT` | UKEP provider (future) |
| `TRUSTED_TIMESTAMP` | UKEP provider (future) |
| `EVENT_LOG_ID` | platform event system (future) |
| `CONTRACT_SNAPSHOT_ID` | `signing_snapshots.id` |
| `TRANCHE_SNAPSHOT_ID` | `signing_snapshots.id` for tranche |
| `TRANCHE_RECEIPT_ID` | `generated_documents.id` |
| `TRANCHE_RECEIPT_STATUS` | `generated_documents` + signing status |
| `TRANCHE_SIGNABLE` | business logic flag |

### 0.4 Meta-Variable / Conditional Catalog

| Document | Variable | Trigger Values | Effect |
|---|---|---|---|
| loan_contract | `INTEREST_MODE` | `INTEREST_FREE` / `FIXED_RATE` | Toggles section 4 (interest vs interest-free) |
| loan_contract | `INTEREST_PAYMENT_SCHEDULE` | `MONTHLY` / `AT_MATURITY` / `WITH_EACH_REPAYMENT` | Toggles clause 4.5 variant |
| loan_contract | `REPAYMENT_SCHEDULE_TYPE` | `NO_SCHEDULE_SINGLE_DEADLINE` / `INSTALLMENTS_FIXED` / `INSTALLMENTS_VARIABLE` | Toggles clause 5.7-5.8 variant + Appendix 2 inclusion + clause 7.4 |
| tranche_receipt | `TRANCHE_METHOD` | `BANK_TRANSFER` / `SBP` | Toggles clause 3.4 wording |
| tranche_receipt | `LENDER_CO_SIGNATURE_ENABLED` | `YES` | Includes optional lender co-signature block |
| tranche_receipt | `PAYMENT_PROOF_ATTACHMENT_ENABLED` | `YES` | Includes payment proof appendix |

### 0.5 Gap Report

#### Profile fields missing (must add to `profiles` table + Profile UI):

| Field | DB Column | Currently in DB? |
|---|---|---|
| Date of birth | `date_of_birth` | No |
| Passport issued by | `passport_issued_by` | No |
| Passport issue date | `passport_issue_date` | No |
| Passport division code | `passport_division_code` | No |
| Email | from `auth.users` | Yes (auth only, not in profiles) |

#### Loan fields missing (must add to `loans` table + CreateLoan UI):

| Field | DB Column | Currently in DB? |
|---|---|---|
| Contract number | `contract_number` | No |
| Interest mode | `interest_mode` | No (only `interest_rate` exists) |
| Interest payment schedule | `interest_payment_schedule` | No |
| Repayment schedule type | `repayment_schedule_type` | No |
| Disbursement method | `disbursement_method` | No |
| Early repayment notice days | `early_repayment_notice_days` | No |

#### New tables needed:

- `bank_details` (replacing `payment_methods`)
- `loan_allowed_bank_details`
- `signing_snapshots`
- `loan_tranches` (with rich transfer-proof fields)
- `payment_schedule_items`
- `generated_documents`

#### Rendering layer gaps:

- `[[IF ...]] ... [[ENDIF]]` conditional renderer
- Table/block variable renderer for account tables, schedule table, notice table, signature blocks
- Number-to-words formatter (Russian)

#### Platform config needed:

- `PLATFORM_NAME`, `PLATFORM_URL`, `PLATFORM_OPERATOR_NAME`
- `DISBURSEMENT_REFERENCE_RULE`, `PAYMENT_REFERENCE_RULE`
- `LOAN_CURRENCY` (default `RUB`)

---

## 1. What to KEEP

| Component | Notes |
|---|---|
| `src/hooks/useAuth.tsx` | Auth context |
| `src/pages/Auth.tsx`, `Index.tsx`, `NotFound.tsx` | Keep as-is |
| `src/components/ui/*` | Full design system |
| `src/components/SendLoanModal.tsx` | Link borrower by email |
| `src/components/SignaturePad.tsx` | Keep as honest placeholder (non-UKEP label) |
| DB tables: `profiles`, `loan_signatures` | Keep with modifications to `profiles` |
| DB functions: `handle_new_user`, `find_user_by_email` | Keep |
| Storage bucket: `payment-screenshots` | Reuse |

## 2. What to REMOVE or REPLACE

| Item | Action |
|---|---|
| `src/lib/store.ts` | **Delete** |
| `src/lib/types.ts` | **Delete** |
| `src/lib/pdf.ts` | **Replace** with `src/legal/services/pdf-renderer.ts` in Phase 4 |
| `src/components/SbpPaymentSection.tsx` | **Rename** → `LoanRequisitesBlock.tsx` (already done in Phase 1) |
| `src/components/PaymentMethodsManager.tsx` | **Refactor** → `BankDetailsManager.tsx` |
| `payment_methods` table | **Evolve** → `bank_details` |
| `loan_payments` table | **Add** `confirmed_by`, `confirmed_at`, `schedule_item_id` |
| `awaiting_payment` status in Dashboard | **Remove** |

---

## 3. Target Architecture

### 3.1 Database Schema

**`profiles` — add 4 fields:**

```sql
ALTER TABLE profiles ADD COLUMN date_of_birth date;
ALTER TABLE profiles ADD COLUMN passport_issued_by text DEFAULT '';
ALTER TABLE profiles ADD COLUMN passport_issue_date date;
ALTER TABLE profiles ADD COLUMN passport_division_code text DEFAULT '';
```

**`loans` — add 6 fields:**

```sql
ALTER TABLE loans ADD COLUMN contract_number text UNIQUE;
ALTER TABLE loans ADD COLUMN disbursement_method text NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE loans ADD COLUMN interest_mode text NOT NULL DEFAULT 'interest_free';
ALTER TABLE loans ADD COLUMN interest_payment_schedule text;
ALTER TABLE loans ADD COLUMN repayment_schedule_type text NOT NULL DEFAULT 'no_schedule_single_deadline';
ALTER TABLE loans ADD COLUMN early_repayment_notice_days int NOT NULL DEFAULT 30;
```

Contract number: collision-safe server-side via sequence + trigger.

**`bank_details` (replaces `payment_methods`):**

```sql
CREATE TABLE public.bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT '',
  bank_name text NOT NULL,
  detail_type text NOT NULL DEFAULT 'general',
  transfer_link text,
  qr_image_url text,
  recipient_display_name text,
  card_number text,
  phone text,
  account_number text,
  bik text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**`loan_allowed_bank_details`:**

```sql
CREATE TABLE public.loan_allowed_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  bank_detail_id uuid REFERENCES bank_details(id) NOT NULL,
  purpose text NOT NULL DEFAULT 'disbursement',
  party_role text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**`signing_snapshots` (immutable, 3 types):**

```sql
CREATE TABLE public.signing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  snapshot_type text NOT NULL,
  signer_id uuid,
  role text,
  snapshot_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

Snapshot types: `contract_terms`, `party_profile`, `allowed_bank_details`.

**`loan_tranches` (rich transfer-proof fields):**

```sql
CREATE TABLE public.loan_tranches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  tranche_number int NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'RUB',
  planned_date date NOT NULL,
  actual_date date,
  actual_time time,
  timezone text DEFAULT 'Europe/Moscow',
  method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'planned',
  sender_bank_detail_id uuid REFERENCES bank_details(id),
  receiver_bank_detail_id uuid REFERENCES bank_details(id),
  sender_account_display text,
  receiver_account_display text,
  reference_text text,
  bank_document_id text,
  bank_document_date date,
  transfer_source text,
  created_by uuid NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**`payment_schedule_items`:**

```sql
CREATE TABLE public.payment_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  item_number int NOT NULL,
  due_date date NOT NULL,
  principal_amount numeric NOT NULL DEFAULT 0,
  interest_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**`loan_payments` — add fields:**

```sql
ALTER TABLE loan_payments ADD COLUMN confirmed_by uuid;
ALTER TABLE loan_payments ADD COLUMN confirmed_at timestamptz;
ALTER TABLE loan_payments ADD COLUMN schedule_item_id uuid REFERENCES payment_schedule_items(id);
```

**`generated_documents`:**

```sql
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  source_entity_id uuid,
  render_data_snapshot jsonb NOT NULL,
  template_version text NOT NULL DEFAULT '1.0',
  file_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL
);
```

### 3.2 File Structure

```text
docs/legal/
├── source-docx/                   # Reference .docx (not runtime)
│   └── .gitkeep
├── requirements/                  # Legal requirements
│   └── .gitkeep

src/legal/
├── templates/                     # Runtime text templates
│   ├── loan-contract.ts
│   ├── tranche-receipt.ts
│   ├── appendix-bank-details.ts
│   ├── appendix-repayment-schedule.ts
│   ├── partial-repayment-confirmation.ts
│   └── full-repayment-confirmation.ts
├── document-types/
│   └── index.ts                   # DocumentType enum + configs (done)
├── document-registry/
│   └── index.ts                   # type → template → renderer mapping (done)
├── snapshots/
│   └── index.ts                   # Snapshot creation logic
└── services/
    ├── pdf-renderer.ts            # jsPDF renderer
    └── document-generator.ts      # Orchestrator

src/components/
├── BankDetailsManager.tsx         # Refactored from PaymentMethodsManager
├── LoanRequisitesBlock.tsx        # Refactored (done)
├── TrancheList.tsx
├── TrancheConfirmModal.tsx
├── CreateTrancheModal.tsx
├── RepaymentList.tsx
├── CreateRepaymentModal.tsx
├── PaymentSchedule.tsx
├── DocumentsList.tsx
└── SignaturePad.tsx               # Honest non-UKEP label
```

---

## 4. Phased Implementation Plan

### Phase 1: Cleanup + File Structure + Page Skeleton (DONE)
- Deleted dead code, created `src/legal/*` stubs, added placeholder sections to LoanDetails, renamed SbpPaymentSection.

### Phase 2: Backend Schema + Snapshots + Bank Details
- Add 4 fields to `profiles` (dob, passport_issued_by, passport_issue_date, passport_division_code)
- Add 6 fields to `loans` (contract_number, disbursement_method, interest_mode, interest_payment_schedule, repayment_schedule_type, early_repayment_notice_days)
- Create contract_number sequence + trigger
- Create `bank_details` table with RLS (migrate from `payment_methods`)
- Create `loan_allowed_bank_details` with RLS
- Create `signing_snapshots` with RLS (INSERT by signer, SELECT by loan parties, no UPDATE/DELETE)
- Create `payment_schedule_items` with RLS
- Create `loan_tranches` with RLS
- Add `confirmed_by`, `confirmed_at`, `schedule_item_id` to `loan_payments`
- Create `generated_documents` with RLS
- Update Profile UI for new passport fields
- Refactor `PaymentMethodsManager` → `BankDetailsManager`
- Update CreateLoan form for interest_mode, repayment_schedule_type, interest_payment_schedule
- Implement snapshot creation logic in `src/legal/snapshots/`

### Phase 3: Tranches + Repayment Schedule + Repayments
- `CreateTrancheModal` — lender creates tranche with transfer-proof fields
- `TrancheList` — display all tranches with statuses
- `TrancheConfirmModal` — borrower confirms receipt → first confirmed tranche sets loan to `active`
- `PaymentSchedule` — create/display schedule items
- `CreateRepaymentModal` — borrower records repayment
- `RepaymentList` — lender confirms repayments
- Auto-detect full repayment (sum of confirmed repayments >= sum of confirmed tranches) → loan status `repaid`
- `LoanRequisitesBlock` integration for allowed bank details

### Phase 4: Document Generation
- Populate all 6 runtime templates from source pack text
- Build `[[IF]]` / `[[ENDIF]]` conditional renderer
- Build table/block variable renderer (accounts tables, schedule table, signature blocks)
- Build Russian number-to-words formatter
- Build `document-generator.ts` orchestrator: gather data → resolve template → render → persist to `generated_documents`
- Build `pdf-renderer.ts` using jsPDF with Cyrillic support
- `DocumentsList` component — list + download generated documents
- Auto-generate `full_repayment_confirmation` when balance reaches zero
- Generate `partial_repayment_confirmation` on each confirmed repayment
- Generate `tranche_receipt` on each confirmed tranche
- Delete old `src/lib/pdf.ts`
- Add platform config constants (PLATFORM_NAME, PLATFORM_URL, etc.)

### Phase 5: Browser Testing + Fixes
- End-to-end: create loan → sign → create tranche → confirm → repay → generate all 6 doc types
- Verify contract number collision safety
- Verify snapshot immutability (no UPDATE/DELETE policies)
- Test conditional rendering (interest-free vs fixed-rate, schedule types)
- Test empty states, error handling, mobile
- Verify all RLS policies

