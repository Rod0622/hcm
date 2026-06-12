/* Statutory payroll math (employee-side) per country.
   PH follows the 2024+ contribution tables and the TRAIN semi-monthly
   withholding brackets; US/SG are simplified estimates, labeled as such in
   the line items. All amounts are per pay period. */

export type StatutoryItem = {
  code: string;
  name: string;
  kind: "tax" | "deduction";
  amount: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/* TRAIN-law semi-monthly withholding table (2023 onward). */
export function birWithholdingSemiMonthly(taxable: number): number {
  if (taxable <= 10417) return 0;
  if (taxable <= 16666) return (taxable - 10417) * 0.15;
  if (taxable <= 33332) return 937.5 + (taxable - 16667) * 0.2;
  if (taxable <= 83332) return 4270.7 + (taxable - 33333) * 0.25;
  if (taxable <= 333332) return 16770.7 + (taxable - 83333) * 0.3;
  return 91770.7 + (taxable - 333333) * 0.35;
}

export function phStatutory(monthlyBasic: number, periodGross: number, periodsPerMonth: number): StatutoryItem[] {
  // SSS: 4.5% employee share of the monthly salary credit (5k–35k band).
  const msc = Math.min(Math.max(monthlyBasic, 5000), 35000);
  const sss = (msc * 0.045) / periodsPerMonth;
  // PhilHealth: 5% premium split 50/50, income floor 10k / ceiling 100k.
  const philhealth = (Math.min(Math.max(monthlyBasic, 10000), 100000) * 0.025) / periodsPerMonth;
  // Pag-IBIG: 2% employee share capped at a 10k base (max 200/month).
  const pagibig = (Math.min(monthlyBasic, 10000) * 0.02) / periodsPerMonth;

  const taxablePerSemiMonthly = (periodGross * periodsPerMonth) / 2 - (sss + philhealth + pagibig) * periodsPerMonth / 2;
  const withholding = (birWithholdingSemiMonthly(Math.max(taxablePerSemiMonthly, 0)) * 2) / periodsPerMonth;

  return [
    { code: "ph_sss_ee", name: "SSS (employee)", kind: "deduction", amount: round2(sss) },
    { code: "ph_philhealth_ee", name: "PhilHealth (employee)", kind: "deduction", amount: round2(philhealth) },
    { code: "ph_pagibig_ee", name: "Pag-IBIG (employee)", kind: "deduction", amount: round2(pagibig) },
    { code: "ph_bir_wh", name: "BIR withholding", kind: "tax", amount: round2(withholding) },
  ];
}

export function usStatutory(periodGross: number): StatutoryItem[] {
  return [
    { code: "us_fica", name: "FICA (estimate)", kind: "tax", amount: round2(periodGross * 0.0765) },
    { code: "us_fed_wh", name: "US federal withholding (estimate)", kind: "tax", amount: round2(periodGross * 0.18) },
  ];
}

export function sgStatutory(monthlyBasic: number, periodsPerMonth: number): StatutoryItem[] {
  // CPF employee share 20% of ordinary wages, ceiling 7,400/month (2026).
  const cpf = (Math.min(monthlyBasic, 7400) * 0.2) / periodsPerMonth;
  return [{ code: "sg_cpf_ee", name: "CPF (employee)", kind: "deduction", amount: round2(cpf) }];
}

export function statutoryFor(country: string, monthlyBasic: number, periodGross: number, periodsPerMonth: number): StatutoryItem[] {
  if (country === "PH") return phStatutory(monthlyBasic, periodGross, periodsPerMonth);
  if (country === "US") return usStatutory(periodGross);
  if (country === "SG") return sgStatutory(monthlyBasic, periodsPerMonth);
  return [];
}
