-- Tenkara HCM — demo seed
-- Demo logins (password for both: TenkaraDemo2026!)
--   rod@trytenkara.com  (owner)
--   ana@trytenkara.com  (admin — the "Ana Reyes" persona)

-- ---------- Auth users ----------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000001','authenticated','authenticated',
   'rod@trytenkara.com', extensions.crypt('TenkaraDemo2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}','{"full_name":"Rod"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000002','authenticated','authenticated',
   'ana@trytenkara.com', extensions.crypt('TenkaraDemo2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}','{"full_name":"Ana Reyes"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"rod@trytenkara.com","email_verified":true}','email', now(), now(), now()),
  (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"ana@trytenkara.com","email_verified":true}','email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- ---------- Tenant ----------
insert into public.tenants (id, slug, name) values
  ('11111111-1111-1111-1111-111111111111','tenkara','Tenkara');

insert into public.tenant_users (tenant_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','owner'),
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000002','admin');

-- ---------- Org structure ----------
insert into public.legal_entities (id, tenant_id, name, country_code, currency) values
  ('e1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Tenkara US Inc.','US','USD'),
  ('e1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Tenkara PH Corp.','PH','PHP'),
  ('e1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Tenkara SG Pte. Ltd.','SG','SGD');

insert into public.locations (id, tenant_id, legal_entity_id, name, country_code, timezone) values
  ('10c00000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','San Francisco','US','America/Los_Angeles'),
  ('10c00000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','New York','US','America/New_York'),
  ('10c00000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','Austin','US','America/Chicago'),
  ('10c00000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000003','Singapore','SG','Asia/Singapore'),
  ('10c00000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000002','Manila','PH','Asia/Manila');

insert into public.org_units (id, tenant_id, kind, name) values
  ('06000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','department','Engineering'),
  ('06000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','department','Finance'),
  ('06000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','department','Sales'),
  ('06000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','department','Operations'),
  ('06000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','department','Executive');

insert into public.positions (id, tenant_id, org_unit_id, title, level) values
  ('90000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','06000000-0000-0000-0000-000000000001','Senior Engineer','L5'),
  ('90000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','06000000-0000-0000-0000-000000000002','Finance Manager','M1'),
  ('90000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','06000000-0000-0000-0000-000000000003','Account Executive','L3'),
  ('90000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','06000000-0000-0000-0000-000000000001','VP Engineering','E1'),
  ('90000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','06000000-0000-0000-0000-000000000004','VP Operations','E1'),
  ('90000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','06000000-0000-0000-0000-000000000002','Payroll Specialist','L4'),
  ('90000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','06000000-0000-0000-0000-000000000005','Chief Executive Officer','E2');

-- ---------- People & workers ----------
insert into public.people (id, tenant_id, full_name, email) values
  ('be000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Mia Chen','mia@trytenkara.com'),
  ('be000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Leo Park','leo@trytenkara.com'),
  ('be000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Joy Lim','joy@trytenkara.com'),
  ('be000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Tom Okafor','tom@trytenkara.com'),
  ('be000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Sam Idris','sam@trytenkara.com'),
  ('be000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Nora Vance','nora@trytenkara.com'),
  ('be000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','Dana Cruz','dana@trytenkara.com');

insert into public.workers (id, tenant_id, person_id, legal_entity_id, position_id, org_unit_id, location_id,
  manager_worker_id, employee_number, status, work_email, hired_on) values
  ('aa000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','be000000-0000-0000-0000-000000000007',
   'e1000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000007','06000000-0000-0000-0000-000000000005',
   '10c00000-0000-0000-0000-000000000001', null,'EMP-0001','active','dana@trytenkara.com','2022-01-10'),
  ('aa000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','be000000-0000-0000-0000-000000000005',
   'e1000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000005','06000000-0000-0000-0000-000000000004',
   '10c00000-0000-0000-0000-000000000004','aa000000-0000-0000-0000-000000000007','EMP-0061','active','sam@trytenkara.com','2023-09-01'),
  ('aa000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','be000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000004','06000000-0000-0000-0000-000000000001',
   '10c00000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000007','EMP-0098','active','tom@trytenkara.com','2024-02-12'),
  ('aa000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','be000000-0000-0000-0000-000000000006',
   'e1000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000006','06000000-0000-0000-0000-000000000002',
   '10c00000-0000-0000-0000-000000000003','aa000000-0000-0000-0000-000000000004','EMP-0112','active','nora@trytenkara.com','2025-03-17'),
  ('aa000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','be000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','06000000-0000-0000-0000-000000000001',
   '10c00000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000004','EMP-0142','active','mia@trytenkara.com','2026-06-01'),
  ('aa000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','be000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000002','06000000-0000-0000-0000-000000000002',
   '10c00000-0000-0000-0000-000000000004','aa000000-0000-0000-0000-000000000005','EMP-0143','onboarding','leo@trytenkara.com','2026-06-08'),
  ('aa000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','be000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000003','06000000-0000-0000-0000-000000000003',
   '10c00000-0000-0000-0000-000000000005','aa000000-0000-0000-0000-000000000005','EMP-0144','onboarding','joy@trytenkara.com','2026-06-15');

-- Nora reports to Leo, who is inserted after her — set after both rows exist.
update public.workers set manager_worker_id = 'aa000000-0000-0000-0000-000000000002'
  where id = 'aa000000-0000-0000-0000-000000000006';

insert into public.compensation_records (tenant_id, worker_id, effective_date, event, base_amount, currency, frequency, components, reason) values
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000007','2022-01-10','hire',320000,'USD','annual','{"approved_by_label":"Board"}','Founding hire'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000005','2023-09-01','hire',192000,'SGD','annual','{"approved_by_label":"Dana Cruz"}','Hire'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000005','2025-04-01','merit',210000,'SGD','annual','{"approved_by_label":"Dana Cruz"}','Annual merit cycle'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000004','2024-02-12','hire',236000,'USD','annual','{"approved_by_label":"Dana Cruz"}','Hire'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000006','2025-03-17','hire',98000,'USD','annual','{"approved_by_label":"Leo Park"}','Hire'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000001','2026-06-01','hire',184000,'USD','annual','{"approved_by_label":"Tom Okafor","level":"L5","equity":"4,200 ISOs"}','Hire'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000002','2026-06-08','hire',142000,'SGD','annual','{"approved_by_label":"Sam Idris"}','Hire'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000003','2026-06-15','hire',2400000,'PHP','annual','{"approved_by_label":"Sam Idris"}','Hire');

-- ---------- Documents (Mia) ----------
insert into public.documents (tenant_id, worker_id, name, kind, status, created_at) values
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000001','Employment agreement','contract','signed','2026-05-21'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000001','Form I-9','government','verified','2026-05-28'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000001','Form W-4','tax','filed','2026-05-28'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000001','Equipment policy','policy','sent','2026-06-02'),
  ('11111111-1111-1111-1111-111111111111','aa000000-0000-0000-0000-000000000003','Employment agreement','contract','pending','2026-06-05');

-- ---------- Config studio ----------
insert into public.object_definitions (id, tenant_id, key, label, source) values
  ('0b000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','employee','Employee','system'),
  ('0b000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','worker','Worker','system');

insert into public.field_definitions (tenant_id, object_id, key, label, field_type, required, visibility, position) values
  ('11111111-1111-1111-1111-111111111111','0b000000-0000-0000-0000-000000000001','preferred_name','Preferred name','text','no','everyone',1),
  ('11111111-1111-1111-1111-111111111111','0b000000-0000-0000-0000-000000000001','tshirt_size','T-shirt size','select','no','hr',2),
  ('11111111-1111-1111-1111-111111111111','0b000000-0000-0000-0000-000000000001','visa_type','Visa type','select','conditional','hr',3),
  ('11111111-1111-1111-1111-111111111111','0b000000-0000-0000-0000-000000000001','visa_expiry','Visa expiry','date','conditional','hr',4),
  ('11111111-1111-1111-1111-111111111111','0b000000-0000-0000-0000-000000000001','emergency_contact','Emergency contact','contact','yes','hr',5),
  ('11111111-1111-1111-1111-111111111111','0b000000-0000-0000-0000-000000000002','cost_center','Cost center','reference','yes','finance',1),
  ('11111111-1111-1111-1111-111111111111','0b000000-0000-0000-0000-000000000002','union_member','Union membership','boolean','no','hr',2);

-- ---------- Payroll ----------
insert into public.pay_groups (id, tenant_id, legal_entity_id, name, frequency, currency) values
  ('fa000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','US Semi-monthly','semi_monthly','USD');

insert into public.pay_periods (id, tenant_id, pay_group_id, period_start, period_end, pay_date, status) values
  ('fb000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','fa000000-0000-0000-0000-000000000001','2026-06-01','2026-06-15','2026-06-20','open');

insert into public.pay_codes (id, tenant_id, key, name, kind, country_code, taxable) values
  ('fc000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','base_salary','Base salary','earning','US',true),
  ('fc000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','us_fed_wh','US federal withholding','tax','US',false),
  ('fc000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','benefits_401k','401(k) employee','deduction','US',false);

insert into public.payroll_runs (id, tenant_id, pay_group_id, pay_period_id, status, totals, calculated_at, submitted_by) values
  ('fd000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','fa000000-0000-0000-0000-000000000001',
   'fb000000-0000-0000-0000-000000000001','in_review',
   '{"gross":21583.33,"taxes":5338.69,"deductions":1210.00,"net":15034.64,"employees":3}', now(),
   'aaaaaaaa-0000-0000-0000-000000000002');

insert into public.payroll_run_lines (id, tenant_id, run_id, worker_id, currency, gross, taxes, deductions, net, notes) values
  ('fe000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','fd000000-0000-0000-0000-000000000001',
   'aa000000-0000-0000-0000-000000000001','USD',7666.67,1892.41,412.00,5362.26,'{"change":"New hire"}'),
  ('fe000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','fd000000-0000-0000-0000-000000000001',
   'aa000000-0000-0000-0000-000000000004','USD',9833.33,2604.18,510.00,6719.15,'{}'),
  ('fe000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','fd000000-0000-0000-0000-000000000001',
   'aa000000-0000-0000-0000-000000000006','USD',4083.33,842.10,288.00,2953.23,'{}');

insert into public.payroll_exceptions (tenant_id, run_id, worker_id, severity, code, message, suggested_action) values
  ('11111111-1111-1111-1111-111111111111','fd000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000003',
   'blocker','missing_tax_id','Missing tax ID (TIN)','Request from employee');

-- ---------- Workflows ----------
insert into public.workflow_definitions (id, tenant_id, key, name, object_type, trigger_event, status, created_by) values
  ('1f000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','onboarding_us','Onboarding — US','worker','worker.hired','active','aaaaaaaa-0000-0000-0000-000000000002'),
  ('1f000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','onboarding_ph','Onboarding — PH','worker','worker.hired','active','aaaaaaaa-0000-0000-0000-000000000002');

insert into public.workflow_versions (id, tenant_id, definition_id, version, graph, published_at) values
  ('2f000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','1f000000-0000-0000-0000-000000000001',1,
   '{"nodes":[{"id":"t1","type":"trigger","title":"Worker hired (US)"},{"id":"d1","type":"document","title":"Send employment agreement"},{"id":"d2","type":"document","title":"Collect I-9 + W-4"},{"id":"a1","type":"approval","title":"Equipment request approval"},{"id":"i1","type":"integration","title":"Provision Google + Slack"},{"id":"n1","type":"notify","title":"Welcome message to manager"}],"edges":[{"from":"t1","to":"d1"},{"from":"d1","to":"d2"},{"from":"d2","to":"a1"},{"from":"a1","to":"i1"},{"from":"i1","to":"n1"}]}', now()),
  ('2f000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','1f000000-0000-0000-0000-000000000002',1,
   '{"nodes":[{"id":"t1","type":"trigger","title":"Worker hired (PH)"},{"id":"d1","type":"document","title":"Collect TIN"},{"id":"d2","type":"document","title":"SSS / PhilHealth / Pag-IBIG enrollment"}],"edges":[{"from":"t1","to":"d1"},{"from":"d1","to":"d2"}]}', now());

insert into public.workflow_runs (id, tenant_id, definition_id, version_id, subject_type, subject_id, status, current_node) values
  ('3f000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','1f000000-0000-0000-0000-000000000001',
   '2f000000-0000-0000-0000-000000000001','worker','aa000000-0000-0000-0000-000000000001','running','i1'),
  ('3f000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','1f000000-0000-0000-0000-000000000002',
   '2f000000-0000-0000-0000-000000000002','worker','aa000000-0000-0000-0000-000000000003','blocked','d1');

insert into public.approvals (tenant_id, subject, kind, requested_for_worker_id, assignee_user_id, status, due_at) values
  ('11111111-1111-1111-1111-111111111111','PTO request · Jun 22–26 (5 days)','leave','aa000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000002','pending','2026-06-18'),
  ('11111111-1111-1111-1111-111111111111','Salary change · +6% effective Jul 1','compensation','aa000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','pending','2026-06-25'),
  ('11111111-1111-1111-1111-111111111111','Equipment · 2nd monitor','equipment','aa000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','pending','2026-06-16');

-- ---------- Compliance ----------
insert into public.compliance_packs (id, tenant_id, legal_entity_id, country_code, name) values
  ('c0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','US','United States — federal core'),
  ('c0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000002','PH','Philippines — statutory'),
  ('c0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000003','SG','Singapore — statutory');

insert into public.compliance_requirements (id, tenant_id, pack_id, key, name, kind, applies_to, severity, blocks_payroll, recurrence) values
  ('c1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','us_i9','Form I-9 verification','document','worker','blocker',true,null),
  ('c1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','us_941','Quarterly 941 federal filing','deadline','legal_entity','scheduled',false,'quarterly'),
  ('c1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000002','ph_tin','Tax identification number (TIN)','required_field','worker','blocker',true,null),
  ('c1000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000002','ph_sss','SSS / PhilHealth / Pag-IBIG remittance','remittance','legal_entity','high',false,'monthly'),
  ('c1000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000003','sg_cpf','CPF submission','remittance','legal_entity','high',false,'monthly');

insert into public.compliance_statuses (tenant_id, requirement_id, subject_type, subject_id, status, due_on, owner_user_id) values
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-000000000003','worker','aa000000-0000-0000-0000-000000000003','overdue','2026-06-18','aaaaaaaa-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-000000000004','legal_entity','e1000000-0000-0000-0000-000000000002','pending','2026-06-30','aaaaaaaa-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-000000000002','legal_entity','e1000000-0000-0000-0000-000000000001','pending','2026-07-31','aaaaaaaa-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-000000000005','legal_entity','e1000000-0000-0000-0000-000000000003','pending','2026-07-14','aaaaaaaa-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-000000000001','worker','aa000000-0000-0000-0000-000000000001','satisfied',null,'aaaaaaaa-0000-0000-0000-000000000002');

-- ---------- Human-readable activity for profile feeds ----------
insert into public.audit_events (tenant_id, actor_label, action, object_type, object_id, source, created_at) values
  ('11111111-1111-1111-1111-111111111111','Workflow','Onboarding — US step 6 of 8 completed: Slack access granted','workers','aa000000-0000-0000-0000-000000000001','workflow', now() - interval '2 hours'),
  ('11111111-1111-1111-1111-111111111111','Nora Vance','Added to pay group US Semi-monthly, effective Jun 1','workers','aa000000-0000-0000-0000-000000000001','payroll', now() - interval '1 day'),
  ('11111111-1111-1111-1111-111111111111','Tom Okafor','Approved equipment request DEV-2201','workers','aa000000-0000-0000-0000-000000000001','approvals', timestamptz '2026-06-08 11:30+00'),
  ('11111111-1111-1111-1111-111111111111','Mia Chen','Signed Form W-4 · source: employee portal','workers','aa000000-0000-0000-0000-000000000001','portal', timestamptz '2026-05-28 09:00+00');
