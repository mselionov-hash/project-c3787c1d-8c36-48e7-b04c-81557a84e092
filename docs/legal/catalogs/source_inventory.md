# Source Inventory

| Status | Document Type | Code Key | Source Reference | Runtime Template |
|---|---|---|---|---|
| **ready** | Договор займа | `loan_contract` | `lovable_readable_legal_source_pack.md` → Runtime template section | `src/legal/templates/loan-contract.ts` |
| **ready** | Расписка о получении транша | `tranche_receipt` | `lovable_readable_legal_source_pack.md` → Runtime template section | `src/legal/templates/tranche-receipt.ts` |
| **ready** | Требования к договору | — | `lovable_readable_legal_source_pack.md` → Requirements section | `docs/legal/requirements/loan_contract_requirements.md` |
| **ready** | Требования к расписке | — | `lovable_readable_legal_source_pack.md` → Requirements section | `docs/legal/requirements/tranche_receipt_requirements.md` |
| **missing — design from scratch** | Приложение 1: Банковские реквизиты | `appendix_bank_details` | Embedded in contract as Приложение №1 sections | `src/legal/templates/appendix-bank-details.ts` |
| **missing — design from scratch** | Приложение 2: График погашения | `appendix_repayment_schedule` | Embedded in contract as Приложение №2 | `src/legal/templates/appendix-repayment-schedule.ts` |
| **missing — design from scratch** | Подтверждение частичного погашения | `partial_repayment_confirmation` | No source template exists | `src/legal/templates/partial-repayment-confirmation.ts` |
| **missing — design from scratch** | Подтверждение полного погашения | `full_repayment_confirmation` | No source template exists | `src/legal/templates/full-repayment-confirmation.ts` |

## Notes

- Receipt (tranche_receipt) is a **separate document**, not Appendix 2.
- Appendix 1 = allowed bank details for disbursement and repayment.
- Appendix 2 = repayment schedule (conditional on `REPAYMENT_SCHEDULE_TYPE`).
- Original `.docx` files are reference-only; not parsed at runtime.
- All runtime templates use TypeScript string templates with `{VARIABLE}` placeholders and `[[IF ...]] ... [[ENDIF]]` conditional blocks.
