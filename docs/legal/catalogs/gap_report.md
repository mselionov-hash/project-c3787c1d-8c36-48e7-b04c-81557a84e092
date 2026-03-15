# Gap Report for MVP Document System

## What exists now (after Phase 2 DB migrations)

### DB tables and fields — READY
- `profiles`: full_name, phone, passport_series, passport_number, address, date_of_birth, passport_issued_by, passport_issue_date, passport_division_code
- `loans`: amount, interest_rate, penalty_rate, repayment_date, issue_date, city, contract_number (auto-gen), interest_mode, interest_payment_schedule, repayment_schedule_type, early_repayment_notice_days, lender/borrower name/passport/address
- `bank_details`: replaces payment_methods with richer fields
- `loan_allowed_bank_details`: links bank details to loans with purpose/party_role
- `signing_snapshots`: immutable JSONB snapshots (contract_terms, party_profile, allowed_bank_details)
- `loan_tranches`: rich transfer-proof fields
- `payment_schedule_items`: repayment schedule items
- `generated_documents`: document metadata with render_data_snapshot
- `loan_signatures`: existing, working
- `loan_payments`: extended with confirmed_by, confirmed_at, schedule_item_id

### UI pages — READY
- Profile page: all passport fields including DOB, issued_by, issue_date, division_code
- CreateLoan: interest_mode, interest_payment_schedule, repayment_schedule_type, early_repayment_notice_days
- BankDetailsManager: new bank_details table

### Source templates — READY (as reference text)
- Loan contract template: full text extracted
- Tranche receipt template: full text extracted

## What is missing — must implement in Phase 3-4

### 1. Runtime template engine (Phase 4)
- `[[IF ...]] ... [[ENDIF]]` conditional block renderer
- Scalar variable substitution: `{VARIABLE}` → value
- Table/block variable renderer for:
  - `ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS_TABLE`
  - `ALLOWED_BORROWER_RECEIVING_ACCOUNTS_TABLE`
  - `ALLOWED_LENDER_RECEIVING_ACCOUNTS_TABLE`
  - `NOTICE_SNAPSHOT_TABLE`
  - `SCHEDULE_TABLE`
  - `LENDER_SIGNATURE_BLOCK`
  - `BORROWER_SIGNATURE_BLOCK`
  - `LENDER_SIGNATURE_BLOCK_OPTIONAL`

### 2. Derived value formatters (Phase 4)
- `LOAN_AMOUNT_IN_WORDS`: Russian number-to-words formatter
- `TRANCHE_AMOUNT_IN_WORDS`: same formatter

### 3. Platform config constants (Phase 4)
- `PLATFORM_NAME`
- `PLATFORM_URL`
- `PLATFORM_OPERATOR_NAME`
- `DAY_COUNT_BASIS` (hardcoded: "фактическое количество календарных дней; 365/366")
- `LOAN_CURRENCY` (hardcoded: "RUB")
- `DISBURSEMENT_REFERENCE_RULE`
- `PAYMENT_REFERENCE_RULE`
- `LENDER_CO_SIGNATURE_ENABLED` (default: "NO")
- `PAYMENT_PROOF_ATTACHMENT_ENABLED` (default: "NO")

### 4. Missing template designs (Phase 4)
- Appendix 1: allowed bank details (structure known from contract Приложение №1)
- Appendix 2: repayment schedule (structure known from `SCHEDULE_TABLE` block)
- Partial repayment confirmation (no source template — design from scratch)
- Full repayment confirmation (no source template — design from scratch)

### 5. Tranche management UI (Phase 3)
- CreateTrancheModal
- TrancheList
- TrancheConfirmModal (borrower confirms receipt)

### 6. Repayment UI (Phase 3)
- CreateRepaymentModal
- RepaymentList
- PaymentSchedule display/management

### 7. PDF renderer (Phase 4)
- jsPDF with Cyrillic (NotoSans) support
- Replace legacy `src/lib/pdf.ts`

### 8. Document generation orchestrator (Phase 4)
- Gather data from snapshots + tranches + schedule
- Resolve template variables
- Render document
- Persist to `generated_documents`

## Variables already supported by current DB/UI

| Variable | Source | Status |
|---|---|---|
| All `LENDER_*` / `BORROWER_*` profile fields | profiles table | ✅ All fields present after Phase 2 |
| `CONTRACT_NUMBER` | loans.contract_number | ✅ Auto-generated |
| `CONTRACT_PLACE` | loans.city | ✅ |
| `LOAN_AMOUNT` | loans.amount | ✅ |
| `INTEREST_RATE_ANNUAL` | loans.interest_rate | ✅ |
| `INTEREST_MODE` | loans.interest_mode | ✅ |
| `INTEREST_PAYMENT_SCHEDULE` | loans.interest_payment_schedule | ✅ |
| `REPAYMENT_SCHEDULE_TYPE` | loans.repayment_schedule_type | ✅ |
| `FINAL_REPAYMENT_DEADLINE` | loans.repayment_date | ✅ |
| `EARLY_REPAYMENT_NOTICE_DAYS` | loans.early_repayment_notice_days | ✅ |
| `CONTRACT_DATE` | loans.issue_date / created_at | ✅ |
| All `TRANCHE_*` fields | loan_tranches table | ✅ Table exists, UI pending (Phase 3) |

## Variables requiring runtime implementation only (no DB/UI changes)

| Variable | Implementation needed |
|---|---|
| `LOAN_AMOUNT_IN_WORDS` | Number-to-words formatter |
| `TRANCHE_AMOUNT_IN_WORDS` | Number-to-words formatter |
| `LAST_SIGNATURE_AT` | Query max(loan_signatures.signed_at) |
| `TRANCHE_RECEIPT_NUMBER` | Sequence in generated_documents |
| `PLATFORM_*` | Platform config constants |
| `DAY_COUNT_BASIS`, `LOAN_CURRENCY` | Hardcoded constants |
| `DISBURSEMENT_REFERENCE_RULE`, `PAYMENT_REFERENCE_RULE` | Platform config |
| All `*_TABLE` render blocks | Render layer implementation |
| All `*_SIGNATURE_BLOCK` render blocks | Render layer implementation |
