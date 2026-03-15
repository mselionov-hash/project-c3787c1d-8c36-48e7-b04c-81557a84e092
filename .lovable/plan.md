

# Revised Migration Plan: P2P Legal Loan Document Platform MVP

---

## 1. What to KEEP (unchanged)

| Component | Notes |
|---|---|
| `src/hooks/useAuth.tsx` | Auth context, session, profile |
| `src/pages/Auth.tsx` | Login/signup |
| `src/pages/Index.tsx` | Redirect |
| `src/pages/NotFound.tsx` | 404 |
| `src/components/ui/*` | Full design system |
| `src/components/SendLoanModal.tsx` | Link borrower by email |
| `src/components/SignaturePad.tsx` | Keep as honest placeholder (see point 10 below) |
| DB tables: `profiles`, `loan_signatures` | No structural changes |
| DB functions: `handle_new_user`, `find_user_by_email`, `update_updated_at_column` | Keep |
| Storage bucket: `payment-screenshots` | Reuse for QR images and document files |

## 2. What to REMOVE or REPLACE

| Item | Action |
|---|---|
| `src/lib/store.ts` | **Delete** — dead localStorage code |
| `src/lib/types.ts` | **Delete** — dead local types |
| `awaiting_payment` status in `Dashboard.tsx` | **Remove** from status map |
| `src/lib/pdf.ts` | **Replace** — single hardcoded PDF generator replaced by template-driven document service |
| `src/components/SbpPaymentSection.tsx` | **Rename + Refactor** → `LoanRequisitesBlock.tsx` — shows allowed bank details for a specific loan |
| `src/components/PaymentMethodsManager.tsx` | **Refactor** — extend for structured bank details (not just link+QR) |
| `payment_methods` table | **Evolve** into `bank_details` (see schema below) |
| `loan_payments` table | **Repurpose** as `repayments` with confirmation fields |

---

## 3. Document Taxonomy (6 MVP types)

| # | Document Type | Code Key | When Created |
|---|---|---|---|
| 1 | **Договор займа** (Loan Contract) | `loan_contract` | After both parties sign |
| 2 | **Расписка о получении средств** (Tranche Receipt) | `tranche_receipt` | Per confirmed tranche — first-class document, NOT an appendix |
| 3 | **Приложение 1: Допустимые банковские реквизиты** | `appendix_bank_details` | At signing — snapshot of allowed bank details for disbursement and repayment |
| 4 | **Приложение 2: График погашения** | `appendix_repayment_schedule` | At signing or when schedule is defined |
| 5 | **Подтверждение частичного погашения** | `partial_repayment_confirmation` | When a repayment is confirmed by lender |
| 6 | **Подтверждение полного погашения** | `full_repayment_confirmation` | Auto-generated when outstanding balance reaches zero |

---

## 4. Revised Database Schema

### 4.1 `loans` — add fields

```sql
ALTER TABLE loans ADD COLUMN contract_number text UNIQUE;
ALTER TABLE loans ADD COLUMN disbursement_method text NOT NULL DEFAULT 'bank_transfer';
-- contract_number generated server-side via DB function (collision-safe)
```

**Contract number generation** — a DB function using a sequence:

```sql
CREATE SEQUENCE IF NOT EXISTS contract_number_seq;

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS trigger AS $$
BEGIN
  NEW.contract_number := 'ДЗ-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('contract_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_contract_number
  BEFORE INSERT ON loans
  FOR EACH ROW EXECUTE FUNCTION generate_contract_number();
```

Status values updated to:

```
draft | awaiting_signatures | signed_by_lender | signed_by_borrower | fully_signed | active | repaid | overdue
```

### 4.2 `bank_details` (replaces `payment_methods`)

```sql
CREATE TABLE public.bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bank_name text NOT NULL,
  detail_type text NOT NULL DEFAULT 'general',
  -- detail_type: 'disbursement' | 'repayment' | 'general'
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
-- RLS: owner CRUD, counterparty SELECT via loans join (same as current payment_methods)
```

### 4.3 `loan_allowed_bank_details` (contract-level detail selection)

```sql
CREATE TABLE public.loan_allowed_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  bank_detail_id uuid REFERENCES bank_details(id) NOT NULL,
  purpose text NOT NULL DEFAULT 'disbursement',
  -- purpose: 'disbursement' | 'repayment'
  party_role text NOT NULL,
  -- party_role: 'lender' | 'borrower'
  created_at timestamptz DEFAULT now()
);
-- When NULL/empty for a loan = "unrestricted mode" (any of that party's bank details)
```

### 4.4 `signing_snapshots` (immutable, comprehensive)

```sql
CREATE TABLE public.signing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  snapshot_type text NOT NULL,
  -- snapshot_type: 'contract_terms' | 'party_profile' | 'allowed_bank_details'
  signer_id uuid,
  role text,
  -- role: 'lender' | 'borrower' | NULL (for contract_terms)
  snapshot_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- RLS: INSERT by signer, SELECT by loan parties
```

**What gets snapshotted at signing time:**
- `contract_terms` — full loan row at time of signing (amount, rates, dates, etc.)
- `party_profile` (x2) — each signer's profile data (name, passport, address, phone)
- `allowed_bank_details` — the set of `loan_allowed_bank_details` rows + resolved `bank_details` data

### 4.5 `loan_tranches`

```sql
CREATE TABLE public.loan_tranches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  tranche_number int NOT NULL,
  amount numeric NOT NULL,
  planned_date date NOT NULL,
  actual_date date,
  status text NOT NULL DEFAULT 'planned',
  -- statuses: planned | pending_confirmation | confirmed | rejected
  created_by uuid NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamptz,
  bank_detail_id uuid REFERENCES bank_details(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### 4.6 `payment_schedule_items` (separate from tranches)

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
  -- status: pending | partially_paid | paid | overdue
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 4.7 `repayments` (evolved from `loan_payments`)

Add columns to existing `loan_payments` table:

```sql
ALTER TABLE loan_payments ADD COLUMN confirmed_by uuid;
ALTER TABLE loan_payments ADD COLUMN confirmed_at timestamptz;
ALTER TABLE loan_payments ADD COLUMN schedule_item_id uuid REFERENCES payment_schedule_items(id);
```

### 4.8 `generated_documents` (metadata persistence)

```sql
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  -- document_type: loan_contract | tranche_receipt | appendix_bank_details | appendix_repayment_schedule | partial_repayment_confirmation | full_repayment_confirmation
  source_entity_id uuid,
  -- e.g. tranche_id for receipts, repayment_id for confirmations
  render_data_snapshot jsonb NOT NULL,
  template_version text NOT NULL DEFAULT '1.0',
  file_url text,
  -- optional: stored PDF URL in storage bucket
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL
);
-- RLS: INSERT by loan parties, SELECT by loan parties
```

---

## 5. Revised File Structure

```text
docs/
├── legal/
│   ├── source-docx/              # Reference .docx files (not used at runtime)
│   └── requirements/             # Legal requirements notes

src/
├── legal/
│   ├── templates/                # Runtime text templates (JSON/TS)
│   │   ├── loan-contract.ts
│   │   ├── tranche-receipt.ts
│   │   ├── appendix-bank-details.ts
│   │   ├── appendix-repayment-schedule.ts
│   │   ├── partial-repayment-confirmation.ts
│   │   └── full-repayment-confirmation.ts
│   ├── document-types/           # Type definitions per document
│   │   └── index.ts
│   ├── document-registry/        # Registry mapping type → template → renderer
│   │   └── index.ts
│   ├── snapshots/                # Snapshot creation logic
│   │   └── index.ts
│   └── services/                 # Document generation service
│       ├── pdf-renderer.ts       # jsPDF-based renderer (replaces lib/pdf.ts)
│       └── document-generator.ts # Orchestrator: snapshot → template → render → persist
├── components/
│   ├── SignaturePad.tsx           (keep — see note on honest labeling)
│   ├── SendLoanModal.tsx          (keep)
│   ├── BankDetailsManager.tsx     (refactored from PaymentMethodsManager)
│   ├── LoanRequisitesBlock.tsx    (refactored from SbpPaymentSection)
│   ├── TrancheList.tsx            (NEW)
│   ├── TrancheConfirmModal.tsx    (NEW)
│   ├── CreateTrancheModal.tsx     (NEW)
│   ├── RepaymentList.tsx          (NEW)
│   ├── CreateRepaymentModal.tsx   (NEW)
│   ├── PaymentSchedule.tsx        (NEW)
│   ├── DocumentsList.tsx          (NEW — lists generated docs for a loan)
│   └── ui/                        (keep all)
├── lib/
│   ├── utils.ts                   (keep)
│   └── pdf.ts                     (DELETE — replaced by legal/services/)
├── pages/
│   ├── Dashboard.tsx              (update statuses + stats)
│   ├── CreateLoan.tsx             (add bank detail selection at creation)
│   ├── LoanDetails.tsx            (major refactor — add sections for tranches, schedule, repayments, documents)
│   ├── Profile.tsx                (swap PaymentMethodsManager → BankDetailsManager)
│   └── ...                        (keep rest)

DELETE:
├── src/lib/store.ts
├── src/lib/types.ts
```

---

## 6. Signature Handling (Honest Labeling)

`SignaturePad` is kept but the UI must clearly label it as:

> «Рукописная подпись в электронной форме (не является квалифицированной электронной подписью — УКЭП)»

No UKEP implementation in MVP. The signature is a visual placeholder with IP/timestamp metadata. The system does not claim legal equivalence to UKEP.

---

## 7. Template Coverage Audit

For each document type, the template file in `src/legal/templates/` will define:
- A `sections` array of text blocks with `{{variable}}` placeholders
- A `variables` map listing every placeholder and its data source

| Document Type | Template File | Key Variables | Missing DB Fields |
|---|---|---|---|
| `loan_contract` | `loan-contract.ts` | `contract_number`, `lender_*`, `borrower_*`, `amount`, `interest_rate`, `penalty_rate`, dates, `city`, signatures | `contract_number` (adding) |
| `tranche_receipt` | `tranche-receipt.ts` | `contract_number`, `tranche_number`, `amount`, `actual_date`, `lender_name`, `borrower_name`, confirmation timestamps | `loan_tranches.*` (new table) |
| `appendix_bank_details` | `appendix-bank-details.ts` | `contract_number`, list of allowed bank details per party | `loan_allowed_bank_details.*`, `bank_details.*` (new tables) |
| `appendix_repayment_schedule` | `appendix-repayment-schedule.ts` | `contract_number`, schedule items with dates, amounts | `payment_schedule_items.*` (new table) |
| `partial_repayment_confirmation` | `partial-repayment-confirmation.ts` | `contract_number`, repayment amount, date, remaining balance | `loan_payments.confirmed_by/at` (adding) |
| `full_repayment_confirmation` | `full-repayment-confirmation.ts` | `contract_number`, total repaid, final date, confirmation | Same + computed balance |

---

## 8. Phased Implementation Plan

### Phase 1: Cleanup + Route/Page Skeleton + File Structure
**No DB changes.**
- Delete `src/lib/store.ts`, `src/lib/types.ts`
- Remove `awaiting_payment` from Dashboard status map
- Create empty directory structure: `src/legal/templates/`, `src/legal/document-types/`, `src/legal/document-registry/`, `src/legal/snapshots/`, `src/legal/services/`, `docs/legal/source-docx/`, `docs/legal/requirements/`
- Create stub files with type exports for document types
- Add placeholder sections to `LoanDetails.tsx` (tranches, schedule, repayments, documents — empty state UI only)
- Rename `SbpPaymentSection` → `LoanRequisitesBlock` (same logic, just rename)

### Phase 2: Backend Schema + Snapshots + Bank Details Model
- Migration: add `contract_number`, `disbursement_method` to `loans`, create sequence + trigger
- Migration: create `bank_details` table with RLS
- Migration: create `loan_allowed_bank_details` table with RLS
- Migration: create `signing_snapshots` table with RLS
- Migration: create `payment_schedule_items` table with RLS
- Migration: create `loan_tranches` table with RLS
- Migration: add `confirmed_by`, `confirmed_at`, `schedule_item_id` to `loan_payments`
- Migration: create `generated_documents` table with RLS
- Refactor `PaymentMethodsManager` → `BankDetailsManager` to use new `bank_details` table
- Implement snapshot creation logic in `src/legal/snapshots/` — called from signing flow
- Update `handleSign` in `LoanDetails` to create 3 snapshot types (contract_terms, party_profile, allowed_bank_details)
- Migrate existing `payment_methods` data if any (or just drop — MVP)

### Phase 3: Tranches + Repayment Schedule + Repayments
- `CreateTrancheModal` — lender creates tranche
- `TrancheList` — status display per tranche
- `TrancheConfirmModal` — borrower confirms receipt → status `confirmed`, loan becomes `active` on first confirmed tranche
- `LoanRequisitesBlock` — show allowed bank details when lender initiates tranche
- `PaymentSchedule` — display/create schedule items
- `CreateRepaymentModal` — borrower records repayment
- `RepaymentList` — lender confirms repayments
- Auto-detect full repayment → set loan status to `repaid`

### Phase 4: Document Generation
- Implement runtime templates (all 6 types) in `src/legal/templates/`
- Build `document-registry` — maps `document_type` → template + renderer
- Build `pdf-renderer.ts` using jsPDF (replace `lib/pdf.ts`)
- Build `document-generator.ts` — orchestrates: gather data → snapshot → render → persist metadata to `generated_documents`
- `DocumentsList` component on LoanDetails — list all generated documents with download buttons
- Auto-generate `full_repayment_confirmation` when balance = 0
- Delete old `src/lib/pdf.ts`

### Phase 5: Browser Testing + Fixes
- End-to-end test: create loan → sign → create tranche → confirm → repay → generate all documents
- Verify contract number uniqueness under concurrent creation
- Test empty states, error states, mobile responsiveness
- Verify RLS policies on all new tables
- Verify snapshot immutability

---

## 9. Key Design Decisions Summary

- **Debt arises from confirmed tranches only**, not from contract signing
- **Appendix 1 = bank details, Appendix 2 = repayment schedule** (not the other way around)
- **Tranche receipt is a standalone document**, not an appendix
- **Contract number is server-generated** via DB sequence (collision-safe)
- **Bank details model supports** unrestricted mode (empty `loan_allowed_bank_details` = any detail allowed) and selected-details-only mode
- **Signatures are labeled honestly** as non-UKEP visual signatures
- **Document metadata is persisted** in `generated_documents` with `render_data_snapshot` for audit trail
- **Templates are runtime TS objects**, not hardcoded PDF logic; source `.docx` files are reference-only in `docs/`

