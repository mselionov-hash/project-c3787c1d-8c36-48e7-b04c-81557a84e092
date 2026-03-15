# Meta-Variable / Conditional Catalog

These variables control `[[IF ...]] ... [[ENDIF]]` conditional block inclusion in templates.

## Loan Contract Template

| Variable | Trigger Values | Effect |
|---|---|---|
| `INTEREST_MODE` | `INTEREST_FREE` | Include interest-free section 4 (clauses 4.1-4.2), exclude fixed-rate section |
| `INTEREST_MODE` | `FIXED_RATE` | Include fixed-rate section 4 (clauses 4.1-4.8), exclude interest-free section |
| `INTEREST_PAYMENT_SCHEDULE` | `MONTHLY` | Clause 4.5: monthly interest payment variant |
| `INTEREST_PAYMENT_SCHEDULE` | `AT_MATURITY` | Clause 4.5: pay interest at maturity variant |
| `INTEREST_PAYMENT_SCHEDULE` | `WITH_EACH_REPAYMENT` | Clause 4.5: pay interest with each repayment variant |
| `REPAYMENT_SCHEDULE_TYPE` | `NO_SCHEDULE_SINGLE_DEADLINE` | Clauses 5.7-5.8: no schedule, single deadline variant |
| `REPAYMENT_SCHEDULE_TYPE` | `INSTALLMENTS_FIXED` | Clauses 5.7-5.8: fixed installments + Appendix 2 + clause 7.4 |
| `REPAYMENT_SCHEDULE_TYPE` | `INSTALLMENTS_VARIABLE` | Clauses 5.7-5.8: variable installments + Appendix 2 + clause 7.4 |

## Tranche Receipt Template

| Variable | Trigger Values | Effect |
|---|---|---|
| `TRANCHE_METHOD` | `BANK_TRANSFER` | Clause 3.4: bank transfer wording (account to account) |
| `TRANCHE_METHOD` | `SBP` | Clause 3.4: SBP transfer wording |
| `LENDER_CO_SIGNATURE_ENABLED` | `YES` | Include optional lender co-signature block at end |
| `PAYMENT_PROOF_ATTACHMENT_ENABLED` | `YES` | Include appendix with payment document details |

## Notes

- All conditional flags use uppercase string values (not booleans).
- `INTEREST_PAYMENT_SCHEDULE` is only relevant when `INTEREST_MODE == FIXED_RATE`.
- `REPAYMENT_SCHEDULE_TYPE` with `INSTALLMENTS_*` values also controls inclusion of Приложение №2 in clause 12.2 and clause 7.4.
- `LENDER_CO_SIGNATURE_ENABLED` defaults to `NO` in MVP.
- `PAYMENT_PROOF_ATTACHMENT_ENABLED` defaults to `NO` in MVP.
