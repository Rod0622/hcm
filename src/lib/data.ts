/* Tenkara HCM — shared mock data for the clickable demo.
   Replace with Supabase queries as modules go live (see src/lib/supabase). */

import type { BadgeTone } from "@/components/ui";

export type Employee = {
  id: string;
  name: string;
  role: string;
  dept: string;
  location: string;
  entity: string;
  start: string;
  salary: string;
  status: string;
  tone: BadgeTone;
  manager: string;
};

export const user = { name: "Ana Reyes", role: "Head of People", email: "ana@trytenkara.com" };

export const employees: Employee[] = [
  { id: "EMP-0142", name: "Mia Chen", role: "Senior Engineer", dept: "Engineering", location: "San Francisco", entity: "Tenkara US Inc.", start: "2026-06-01", salary: "$184,000", status: "Active", tone: "success", manager: "Tom Okafor" },
  { id: "EMP-0143", name: "Leo Park", role: "Finance Manager", dept: "Finance", location: "Singapore", entity: "Tenkara SG Pte. Ltd.", start: "2026-06-08", salary: "S$142,000", status: "Onboarding", tone: "info", manager: "Sam Idris" },
  { id: "EMP-0144", name: "Joy Lim", role: "Account Executive", dept: "Sales", location: "Manila", entity: "Tenkara PH Corp.", start: "2026-06-15", salary: "₱2,400,000", status: "Docs pending", tone: "warning", manager: "Sam Idris" },
  { id: "EMP-0098", name: "Tom Okafor", role: "VP Engineering", dept: "Engineering", location: "New York", entity: "Tenkara US Inc.", start: "2024-02-12", salary: "$236,000", status: "Active", tone: "success", manager: "Dana Cruz" },
  { id: "EMP-0061", name: "Sam Idris", role: "VP Operations", dept: "Operations", location: "Singapore", entity: "Tenkara SG Pte. Ltd.", start: "2023-09-01", salary: "S$210,000", status: "Active", tone: "success", manager: "Dana Cruz" },
  { id: "EMP-0112", name: "Nora Vance", role: "Payroll Specialist", dept: "Finance", location: "Austin", entity: "Tenkara US Inc.", start: "2025-03-17", salary: "$98,000", status: "Active", tone: "success", manager: "Leo Park" },
];

export const profile = {
  id: "EMP-0142", name: "Mia Chen", role: "Senior Engineer", dept: "Engineering",
  location: "San Francisco", entity: "Tenkara US Inc.", start: "2026-06-01",
  type: "Full-time", manager: "Tom Okafor", email: "mia@trytenkara.com",
  salary: "$184,000", currency: "USD / yr", level: "L5", equity: "4,200 ISOs",
  compHistory: [
    { date: "2026-06-01", event: "Hire", amount: "$184,000", by: "Tom Okafor" },
  ],
  documents: [
    { name: "Employment agreement", kind: "Contract", date: "2026-05-21", status: "Signed", tone: "success" as BadgeTone },
    { name: "Form I-9", kind: "Government", date: "2026-05-28", status: "Verified", tone: "success" as BadgeTone },
    { name: "Form W-4", kind: "Tax", date: "2026-05-28", status: "Filed", tone: "success" as BadgeTone },
    { name: "Equipment policy", kind: "Policy", date: "—", status: "Awaiting signature", tone: "warning" as BadgeTone },
  ],
  devices: [
    { name: "MacBook Pro 14” M4", id: "DEV-2201", assigned: "2026-05-30", status: "Active", tone: "success" as BadgeTone },
    { name: "YubiKey 5C", id: "DEV-2202", assigned: "2026-05-30", status: "Active", tone: "success" as BadgeTone },
  ],
  activity: [
    { when: "2h ago", who: "Workflow", what: "Onboarding — US step 6 of 8 completed: Slack access granted" },
    { when: "Yesterday", who: "Nora Vance", what: "Added to pay group US Semi-monthly, effective Jun 1" },
    { when: "Jun 8", who: "Tom Okafor", what: "Approved equipment request DEV-2201" },
    { when: "May 28", who: "Mia Chen", what: "Signed Form W-4 · source: employee portal" },
  ],
};

export const approvals = [
  { who: "Joy Lim", what: "PTO request · Jun 22–26 (5 days)", kind: "Leave" },
  { who: "Leo Park", what: "Salary change · +6% effective Jul 1", kind: "Compensation" },
  { who: "Mia Chen", what: "Equipment · 2nd monitor", kind: "Equipment" },
];

export const workflowRuns = [
  { name: "Onboarding — US", target: "Mia Chen", step: "6 of 8", status: "Running", tone: "info" as BadgeTone },
  { name: "Onboarding — PH", target: "Joy Lim", step: "2 of 9", status: "Blocked", tone: "danger" as BadgeTone },
  { name: "Promotion approval", target: "Leo Park", step: "3 of 4", status: "Waiting", tone: "warning" as BadgeTone },
  { name: "Offboarding — US", target: "Raj Mehta", step: "Done", status: "Completed", tone: "success" as BadgeTone },
];

export const payroll = {
  period: "Jun 1–15, 2026", payDate: "Jun 20, 2026", group: "US Semi-monthly",
  gross: "$1,612,480", net: "$1,284,302", taxes: "$262,114", contributions: "$66,064",
  employees: 118, status: "In review",
  exceptions: [
    { who: "Joy Lim", issue: "Missing tax ID (TIN)", severity: "Blocker", tone: "danger" as BadgeTone, action: "Request from employee" },
    { who: "Dan Wu", issue: "Negative net pay — deduction exceeds gross", severity: "Blocker", tone: "danger" as BadgeTone, action: "Adjust deduction" },
    { who: "Eva Ross", issue: "Retro pay spans 2 periods", severity: "Warning", tone: "warning" as BadgeTone, action: "Review calculation" },
    { who: "Liam Ortiz", issue: "Overtime 22% above average", severity: "Warning", tone: "warning" as BadgeTone, action: "Confirm timesheet" },
  ],
  lines: [
    { name: "Mia Chen", gross: "$7,666.67", taxes: "$1,892.41", deductions: "$412.00", net: "$5,362.26", change: "New hire", tone: "info" as BadgeTone },
    { name: "Tom Okafor", gross: "$9,833.33", taxes: "$2,604.18", deductions: "$510.00", net: "$6,719.15", change: "—", tone: "neutral" as BadgeTone },
    { name: "Nora Vance", gross: "$4,083.33", taxes: "$842.10", deductions: "$288.00", net: "$2,953.23", change: "—", tone: "neutral" as BadgeTone },
    { name: "Eva Ross", gross: "$5,420.00", taxes: "$1,141.84", deductions: "$331.00", net: "$3,947.16", change: "Retro +$340", tone: "warning" as BadgeTone },
    { name: "Liam Ortiz", gross: "$6,114.50", taxes: "$1,388.92", deductions: "$295.00", net: "$4,430.58", change: "OT +18.5h", tone: "warning" as BadgeTone },
  ],
};

export const compliance = {
  packs: [
    { country: "United States", entity: "Tenkara US Inc.", done: 14, total: 16, next: "941 quarterly filing · Jul 31" },
    { country: "Philippines", entity: "Tenkara PH Corp.", done: 9, total: 12, next: "SSS contribution · Jun 30" },
    { country: "Singapore", entity: "Tenkara SG Pte. Ltd.", done: 11, total: 11, next: "CPF submission · Jul 14" },
  ],
  tasks: [
    { task: "Collect TIN for 1 employee", country: "PH", due: "Jun 18", severity: "Blocker", tone: "danger" as BadgeTone, owner: "Nora Vance" },
    { task: "Form I-9 reverification — 2 visas expiring", country: "US", due: "Jun 26", severity: "High", tone: "warning" as BadgeTone, owner: "Ana Reyes" },
    { task: "SSS / PhilHealth / Pag-IBIG June remittance", country: "PH", due: "Jun 30", severity: "High", tone: "warning" as BadgeTone, owner: "Nora Vance" },
    { task: "Quarterly 941 federal filing", country: "US", due: "Jul 31", severity: "Scheduled", tone: "neutral" as BadgeTone, owner: "Nora Vance" },
    { task: "Annual leave policy acknowledgment — 4 pending", country: "SG", due: "Jul 15", severity: "Low", tone: "neutral" as BadgeTone, owner: "Sam Idris" },
  ],
  audit: [
    { when: "Today 09:14", actor: "Nora Vance", action: "Updated PH contribution table v2026.2 → v2026.3", source: "Config studio" },
    { when: "Yesterday 17:02", actor: "Workflow", action: "Blocked payroll run: missing TIN for EMP-0144", source: "Rules engine" },
    { when: "Jun 8 11:30", actor: "Ana Reyes", action: "Approved remote-work policy v4 for SG entity", source: "Approvals" },
  ],
};

export const fields = [
  { name: "Preferred name", key: "preferred_name", type: "Text", object: "Employee", required: "No", visibility: "Everyone" },
  { name: "T-shirt size", key: "tshirt_size", type: "Select", object: "Employee", required: "No", visibility: "HR only" },
  { name: "Visa type", key: "visa_type", type: "Select", object: "Employee", required: "Conditional", visibility: "HR only" },
  { name: "Visa expiry", key: "visa_expiry", type: "Date", object: "Employee", required: "Conditional", visibility: "HR only" },
  { name: "Emergency contact", key: "emergency_contact", type: "Contact", object: "Employee", required: "Yes", visibility: "HR only" },
  { name: "Cost center", key: "cost_center", type: "Reference", object: "Worker", required: "Yes", visibility: "Finance" },
  { name: "Union membership", key: "union_member", type: "Boolean", object: "Worker", required: "No", visibility: "HR only" },
];
