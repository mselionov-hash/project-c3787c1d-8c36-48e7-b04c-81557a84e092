# Variable Catalog

Total unique variables across current templates: **69**
- Variables in contract template: **48**
- Variables in tranche receipt template: **50**

## Variable Catalog Table

| Variable | Documents | Class | Source of Truth | Status |
|---|---|---|---|---|
| `ALLOWED_BORROWER_RECEIVING_ACCOUNTS_TABLE` | loan_contract | render_block | allowed_accounts_snapshot + render layer | implement in render layer |
| `ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS_TABLE` | loan_contract | render_block | allowed_accounts_snapshot + render layer | implement in render layer |
| `ALLOWED_LENDER_RECEIVING_ACCOUNTS_TABLE` | loan_contract | render_block | allowed_accounts_snapshot + render layer | implement in render layer |
| `BORROWER_APP_ACCOUNT_ID` | loan_contract, tranche_receipt | scalar_printed | profiles.user_id → snapshot | ✅ in DB, move to snapshots |
| `BORROWER_CONTACT_PHONE` | loan_contract, tranche_receipt | scalar_printed | profiles.phone → snapshot | ✅ in DB+UI, move to snapshots |
| `BORROWER_DOB` | loan_contract, tranche_receipt | scalar_printed | profiles.date_of_birth → snapshot | ✅ added to DB+UI in Phase 2 |
| `BORROWER_EMAIL` | loan_contract, tranche_receipt | scalar_printed | auth.users.email → snapshot | ✅ in auth, move to snapshots |
| `BORROWER_FULL_NAME` | loan_contract, tranche_receipt | scalar_printed | profiles.full_name → snapshot | ✅ in DB+UI |
| `BORROWER_PASSPORT_DIVISION_CODE` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_division_code → snapshot | ✅ added to DB+UI in Phase 2 |
| `BORROWER_PASSPORT_ISSUED_BY` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_issued_by → snapshot | ✅ added to DB+UI in Phase 2 |
| `BORROWER_PASSPORT_ISSUE_DATE` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_issue_date → snapshot | ✅ added to DB+UI in Phase 2 |
| `BORROWER_PASSPORT_NUMBER` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_number → snapshot | ✅ in DB+UI |
| `BORROWER_PASSPORT_SERIES` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_series → snapshot | ✅ in DB+UI |
| `BORROWER_REG_ADDRESS` | loan_contract, tranche_receipt | scalar_printed | profiles.address → snapshot | ✅ in DB+UI |
| `BORROWER_SIGNATURE_BLOCK` | loan_contract, tranche_receipt | render_block | loan_signatures + render layer | implement in render layer |
| `CONTRACT_DATE` | loan_contract, tranche_receipt | document_metadata | loans.issue_date or loans.created_at | ✅ in DB |
| `CONTRACT_NUMBER` | loan_contract, tranche_receipt | scalar_printed | loans.contract_number (auto-generated) | ✅ added to DB in Phase 2 |
| `CONTRACT_PLACE` | loan_contract | scalar_printed | loans.city → snapshot | ✅ in DB+UI |
| `DAY_COUNT_BASIS` | loan_contract | scalar_printed | platform config (hardcoded 365/366) | platform config needed |
| `DISBURSEMENT_REFERENCE_RULE` | loan_contract | scalar_printed | platform config | platform config needed |
| `EARLY_REPAYMENT_NOTICE_DAYS` | loan_contract | scalar_printed | loans.early_repayment_notice_days | ✅ added to DB+UI in Phase 2 |
| `FINAL_REPAYMENT_DEADLINE` | loan_contract | scalar_printed | loans.repayment_date → snapshot | ✅ in DB+UI |
| `INTEREST_MODE` | loan_contract | conditional_flag | loans.interest_mode → snapshot | ✅ added to DB+UI in Phase 2 |
| `INTEREST_PAYMENT_SCHEDULE` | loan_contract | conditional_flag | loans.interest_payment_schedule → snapshot | ✅ added to DB+UI in Phase 2 |
| `INTEREST_RATE_ANNUAL` | loan_contract | scalar_printed | loans.interest_rate → snapshot | ✅ in DB+UI |
| `LAST_SIGNATURE_AT` | loan_contract, tranche_receipt | document_metadata | max(loan_signatures.signed_at) | derive from signatures |
| `LENDER_APP_ACCOUNT_ID` | loan_contract, tranche_receipt | scalar_printed | profiles.user_id → snapshot | ✅ in DB, move to snapshots |
| `LENDER_CO_SIGNATURE_ENABLED` | tranche_receipt | conditional_flag | platform config or per-loan flag | platform config needed |
| `LENDER_CONTACT_PHONE` | loan_contract, tranche_receipt | scalar_printed | profiles.phone → snapshot | ✅ in DB+UI |
| `LENDER_DOB` | loan_contract, tranche_receipt | scalar_printed | profiles.date_of_birth → snapshot | ✅ added to DB+UI in Phase 2 |
| `LENDER_EMAIL` | loan_contract, tranche_receipt | scalar_printed | auth.users.email → snapshot | ✅ in auth |
| `LENDER_FULL_NAME` | loan_contract, tranche_receipt | scalar_printed | profiles.full_name → snapshot | ✅ in DB+UI |
| `LENDER_PASSPORT_DIVISION_CODE` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_division_code → snapshot | ✅ added to DB+UI in Phase 2 |
| `LENDER_PASSPORT_ISSUED_BY` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_issued_by → snapshot | ✅ added to DB+UI in Phase 2 |
| `LENDER_PASSPORT_ISSUE_DATE` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_issue_date → snapshot | ✅ added to DB+UI in Phase 2 |
| `LENDER_PASSPORT_NUMBER` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_number → snapshot | ✅ in DB+UI |
| `LENDER_PASSPORT_SERIES` | loan_contract, tranche_receipt | scalar_printed | profiles.passport_series → snapshot | ✅ in DB+UI |
| `LENDER_REG_ADDRESS` | loan_contract, tranche_receipt | scalar_printed | profiles.address → snapshot | ✅ in DB+UI |
| `LENDER_SIGNATURE_BLOCK` | loan_contract | render_block | loan_signatures + render layer | implement in render layer |
| `LENDER_SIGNATURE_BLOCK_OPTIONAL` | tranche_receipt | render_block | loan_signatures + render layer | implement in render layer |
| `LOAN_AMOUNT` | loan_contract | scalar_printed | loans.amount → snapshot | ✅ in DB+UI |
| `LOAN_AMOUNT_IN_WORDS` | loan_contract | derived_printed | loans.amount → number-to-words | implement formatter |
| `LOAN_CURRENCY` | loan_contract | scalar_printed | platform config (hardcoded RUB) | platform config needed |
| `NOTICE_SNAPSHOT_TABLE` | loan_contract | render_block | party snapshot + render layer | implement in render layer |
| `PAYMENT_PROOF_ATTACHMENT_ENABLED` | tranche_receipt | conditional_flag | platform config or per-loan flag | platform config needed |
| `PAYMENT_REFERENCE_RULE` | loan_contract | scalar_printed | platform config | platform config needed |
| `PLATFORM_NAME` | loan_contract, tranche_receipt | document_metadata | platform config | platform config needed |
| `PLATFORM_OPERATOR_NAME` | loan_contract, tranche_receipt | document_metadata | platform config | platform config needed |
| `PLATFORM_URL` | loan_contract, tranche_receipt | document_metadata | platform config | platform config needed |
| `RECEIPT_TITLE` | tranche_receipt | document_metadata | hardcoded per template | hardcoded |
| `REPAYMENT_SCHEDULE_TYPE` | loan_contract | conditional_flag | loans.repayment_schedule_type → snapshot | ✅ added to DB+UI in Phase 2 |
| `SCHEDULE_TABLE` | loan_contract | render_block | payment_schedule_items + render layer | implement in render layer |
| `TRANCHE_AMOUNT` | tranche_receipt | scalar_printed | loan_tranches.amount | ✅ table created in Phase 2 |
| `TRANCHE_AMOUNT_IN_WORDS` | tranche_receipt | derived_printed | loan_tranches.amount → number-to-words | implement formatter |
| `TRANCHE_BANK_DOCUMENT_DATE` | tranche_receipt | scalar_printed | loan_tranches.bank_document_date | ✅ table created in Phase 2 |
| `TRANCHE_BANK_DOCUMENT_ID` | tranche_receipt | scalar_printed | loan_tranches.bank_document_id | ✅ table created in Phase 2 |
| `TRANCHE_CURRENCY` | tranche_receipt | scalar_printed | loan_tranches.currency (default RUB) | ✅ table created in Phase 2 |
| `TRANCHE_DATE` | tranche_receipt | scalar_printed | loan_tranches.actual_date | ✅ table created in Phase 2 |
| `TRANCHE_ID` | tranche_receipt | scalar_printed | loan_tranches.id | ✅ table created in Phase 2 |
| `TRANCHE_METHOD` | tranche_receipt | conditional_flag | loan_tranches.method | ✅ table created in Phase 2 |
| `TRANCHE_RECEIPT_DRAFT_CREATED_AT` | tranche_receipt | document_metadata | generated_documents.created_at | ✅ table created in Phase 2 |
| `TRANCHE_RECEIPT_NUMBER` | tranche_receipt | scalar_printed | generated_documents sequence | system-generated |
| `TRANCHE_RECEIPT_SIGNED_AT` | tranche_receipt | document_metadata | tranche receipt signature timestamp | derive from signatures |
| `TRANCHE_RECEIVER_ACCOUNT_DISPLAY` | tranche_receipt | scalar_printed | loan_tranches + bank_details render | ✅ table created in Phase 2 |
| `TRANCHE_REFERENCE_TEXT` | tranche_receipt | scalar_printed | loan_tranches.reference_text | ✅ table created in Phase 2 |
| `TRANCHE_SENDER_ACCOUNT_DISPLAY` | tranche_receipt | scalar_printed | loan_tranches + bank_details render | ✅ table created in Phase 2 |
| `TRANCHE_TIME` | tranche_receipt | scalar_printed | loan_tranches.actual_time | ✅ table created in Phase 2 |
| `TRANCHE_TIMEZONE` | tranche_receipt | scalar_printed | loan_tranches.timezone | ✅ table created in Phase 2 |
| `TRANCHE_TRANSFER_SOURCE` | tranche_receipt | scalar_printed | loan_tranches.transfer_source | ✅ table created in Phase 2 |

## Class Breakdown

| Class | Count | Description |
|---|---|---|
| `scalar_printed` | 42 | Direct values printed in document |
| `derived_printed` | 2 | Computed values (number-to-words) |
| `document_metadata` | 8 | Document-level metadata |
| `render_block` | 8 | Tables/blocks rendered from structured data |
| `conditional_flag` | 6 | Controls `[[IF]]` block inclusion |
| `system_only` | 3+ | Internal, never shown in documents |
