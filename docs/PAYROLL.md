# Payroll calculation spec — for validation

How every number on a payslip is produced. Verify one calculated run against
your accountant's figures before paying real people from this system.
Source of truth: `src/lib/payroll/engine.ts` and `src/lib/payroll/statutory.ts`
(unit-tested in `src/lib/__tests__/payroll.test.ts`).

## Base pay

- Salary is stored per compensation record with a quoted frequency
  (annual, semi-annual, monthly, semi-monthly, bi-weekly, weekly, daily, hourly).
- Annualized first: monthly ×12, semi-monthly ×24, bi-weekly ×26, weekly ×52,
  daily ×260, hourly ×2080, semi-annual ×2.
- Per-period base = annual ÷ periods per year of the PAY GROUP's frequency
  (semi-monthly 24, monthly 12, bi-weekly 26, weekly 52).
- The record used is the latest by effective date (≤ period end), newest
  created wins ties.

## Earnings & adjustments

- **Overtime**: clocked work minutes beyond 8h per day (from the time clock /
  Time Doctor sync) × hourly rate (annual ÷ 2080) × 1.25.
- **Unpaid leave**: approved unpaid days overlapping the period (weekends and
  country holidays excluded) × daily rate (annual ÷ 260), deducted.

## PH statutory (employee share)

| Item | Rule |
|---|---|
| SSS | 4.5% of monthly salary credit, MSC clamped to 5,000–35,000 (max 1,575/mo) |
| PhilHealth | 5% premium split 50/50 → 2.5%, income floor 10,000 / ceiling 100,000 |
| Pag-IBIG | 2% of up to 10,000 (max 200/mo) |
| BIR withholding | TRAIN semi-monthly table on taxable income (gross − statutory): 0 to ₱10,417; 15% over 10,417; ₱937.50 + 20% over 16,667; ₱4,270.70 + 25% over 33,333; ₱16,770.70 + 30% over 83,333; ₱91,770.70 + 35% over 333,333 |

Monthly pay groups approximate withholding as 2 × semi-monthly(taxable ÷ 2).

## Per-record flags

- **Taxable = off** → no withholding-tax lines.
- **Statutory = off** → no SSS/PhilHealth/Pag-IBIG/CPF lines.
- Both off → gross = net (contractor-style). Unpaid leave still deducts.

## US / SG — estimates only

- US: FICA 7.65% + flat 18% federal withholding estimate. Not filing-grade.
- SG: CPF employee 20% of ordinary wages up to 7,400/mo. No income-tax
  withholding (SG does not withhold).

## Known gaps (not yet modeled)

- 13th-month pay and its ₱90k tax exemption (planned)
- De minimis benefits, allowances, bonuses as separate pay codes
- Night differential / holiday pay multipliers (regular vs special)
- Final-pay tax recomputation on offboarding (estimate only)
- SSS MPF (provident) tier above ₱20k MSC; WISP
- Employer shares (only employee-side is computed today)

## Validation checklist

1. Pick one PH employee; open Payroll → run → click their register line for
   the component breakdown, or export "Components CSV".
2. Check SSS/PhilHealth/Pag-IBIG against the current year's tables.
3. Check BIR withholding against the semi-monthly revised withholding table.
4. Confirm OT hours match the attendance record and the 1.25x multiplier
   matches the applicable case (ordinary working day).
5. Rates change yearly — `statutory.ts` constants are the place to update.
