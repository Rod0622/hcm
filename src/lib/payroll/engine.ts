/* Payroll line calculation: base salary prorated to the pay frequency,
   overtime at 1.25x from clocked hours beyond 8h/day, unpaid leave deducted
   at the daily rate, then country statutory items. Pure and unit-testable —
   the API route feeds it data and persists the result. */

import { statutoryFor } from "./statutory";

export type Frequency = "monthly" | "semi_monthly" | "bi_weekly" | "weekly";

export type CompFrequency =
  | "annual" | "semi_annual" | "monthly" | "semi_monthly"
  | "bi_weekly" | "weekly" | "daily" | "hourly";

/* Periods per year for a quoted salary frequency (260 working days, 2080h). */
export const ANNUAL_MULTIPLIER: Record<CompFrequency, number> = {
  annual: 1,
  semi_annual: 2,
  monthly: 12,
  semi_monthly: 24,
  bi_weekly: 26,
  weekly: 52,
  daily: 260,
  hourly: 2080,
};

export function annualize(amount: number, frequency: CompFrequency): number {
  return amount * (ANNUAL_MULTIPLIER[frequency] ?? 1);
}

export type WorkerPayInput = {
  workerId: string;
  name: string;
  country: string;
  baseAmount: number | null;
  baseFrequency: CompFrequency;
  taxable: boolean;          // false → no withholding tax lines
  applyStatutory: boolean;   // false → no SSS/PhilHealth/Pag-IBIG/CPF lines
  otMinutes: number;
  unpaidLeaveDays: number;
  newHire: boolean;
};

export type PayItem = {
  code: string;
  name: string;
  kind: "earning" | "deduction" | "tax";
  amount: number;
  quantity?: number;
  rate?: number;
};

export type PayException = {
  severity: "blocker" | "warning" | "info";
  code: string;
  message: string;
  action: string;
};

export type PayLine = {
  workerId: string;
  gross: number;
  taxes: number;
  deductions: number;
  net: number;
  items: PayItem[];
  note: string | null;
  exceptions: PayException[];
};

const PERIODS_PER_YEAR: Record<Frequency, number> = {
  monthly: 12,
  semi_monthly: 24,
  bi_weekly: 26,
  weekly: 52,
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calculateLine(input: WorkerPayInput, frequency: Frequency): PayLine | { excluded: true; exception: PayException; workerId: string } {
  if (input.baseAmount == null || input.baseAmount <= 0) {
    return {
      excluded: true,
      workerId: input.workerId,
      exception: {
        severity: "blocker",
        code: "missing_compensation",
        message: `${input.name} has no compensation record — excluded from the run`,
        action: "Add a compensation record on the employee profile",
      },
    };
  }

  const annualBase = annualize(input.baseAmount, input.baseFrequency);
  const periodsPerYear = PERIODS_PER_YEAR[frequency];
  const periodsPerMonth = periodsPerYear / 12;
  const base = annualBase / periodsPerYear;
  const hourlyRate = annualBase / (52 * 40);
  const otHours = input.otMinutes / 60;
  const ot = otHours * hourlyRate * 1.25;
  const unpaid = input.unpaidLeaveDays * (annualBase / 260);

  const items: PayItem[] = [
    { code: "base_salary", name: "Base salary", kind: "earning", amount: round2(base) },
  ];
  if (ot > 0) {
    items.push({ code: "ot_125", name: "Overtime (1.25x)", kind: "earning", amount: round2(ot), quantity: round2(otHours), rate: round2(hourlyRate * 1.25) });
  }
  if (unpaid > 0) {
    items.push({ code: "unpaid_leave", name: "Unpaid leave", kind: "deduction", amount: round2(unpaid), quantity: input.unpaidLeaveDays });
  }

  const gross = round2(base + ot);
  const statutory = statutoryFor(input.country, annualBase / 12, gross, periodsPerMonth)
    .filter((s) => (s.kind === "tax" ? input.taxable : input.applyStatutory));
  for (const s of statutory) {
    items.push({ code: s.code, name: s.name, kind: s.kind, amount: s.amount });
  }

  const taxes = round2(statutory.filter((s) => s.kind === "tax").reduce((sum, s) => sum + s.amount, 0));
  const deductions = round2(statutory.filter((s) => s.kind === "deduction").reduce((sum, s) => sum + s.amount, 0) + unpaid);
  const net = round2(gross - taxes - deductions);

  const exceptions: PayException[] = [];
  if (net < 0) {
    exceptions.push({
      severity: "blocker",
      code: "negative_net",
      message: `${input.name}: net pay is negative — deductions exceed gross`,
      action: "Review unpaid leave and deductions",
    });
  }
  if (otHours > 30) {
    exceptions.push({
      severity: "warning",
      code: "ot_variance",
      message: `${input.name}: ${round2(otHours)}h overtime this period`,
      action: "Confirm the timesheet before approving",
    });
  }

  const noteParts: string[] = [];
  if (input.newHire) noteParts.push("New hire");
  if (otHours > 0) noteParts.push(`OT +${round2(otHours)}h`);
  if (input.unpaidLeaveDays > 0) noteParts.push(`Unpaid −${input.unpaidLeaveDays}d`);
  if (!input.taxable) noteParts.push("Tax-exempt");
  if (!input.applyStatutory) noteParts.push("No statutory");

  return {
    workerId: input.workerId,
    gross,
    taxes,
    deductions,
    net,
    items,
    note: noteParts.length ? noteParts.join(" · ") : null,
    exceptions,
  };
}
