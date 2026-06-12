-- Tenkara HCM — 017 pay options
-- Full frequency set on compensation and offers, plus per-record flags the
-- payroll engine honors: taxable (withholding tax) and apply_statutory
-- (SSS/PhilHealth/Pag-IBIG/CPF-type deductions).
alter table public.compensation_records drop constraint compensation_records_frequency_check;
alter table public.compensation_records add constraint compensation_records_frequency_check
  check (frequency in ('annual','semi_annual','monthly','semi_monthly','bi_weekly','weekly','daily','hourly'));
alter table public.compensation_records add column taxable boolean not null default true;
alter table public.compensation_records add column apply_statutory boolean not null default true;

alter table public.offers drop constraint offers_frequency_check;
alter table public.offers add constraint offers_frequency_check
  check (frequency in ('annual','semi_annual','monthly','semi_monthly','bi_weekly','weekly','daily','hourly'));
