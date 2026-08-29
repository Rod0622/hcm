"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Badge, Button, Card, Dialog, EmptyState, Icon, IconButton, Input, SegmentedControl, Select, Table, Tabs } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { financeApi } from "@/lib/finance/api";
import { addDays, investmentSplit, pctOf, round2, todayIso, type InvestmentRow, type PersonRow } from "@/lib/finance/calc";

const php = (n: number) => formatMoney(n, "PHP");
const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/* Financer/referrer picker with an inline "add new person" mini-form so a
   first-time financer can be recorded without leaving the deal dialog. */
function PersonPicker({ label, people, value, onChange, allowNone = false, onCreated }: {
  label: string;
  people: PersonRow[];
  value: string;
  onChange: (id: string) => void;
  allowNone?: boolean;
  onCreated: (p: PersonRow) => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/finance/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((payload as { error?: string }).error ?? "Could not add person");
      return;
    }
    const person: PersonRow = { id: (payload as { id: string }).id, name: name.trim(), is_me: false, notes: "" };
    onCreated(person);
    onChange(person.id);
    setName("");
    setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        <Select
          label={label}
          style={{ flex: 1 }}
          options={[
            ...(allowNone ? [{ value: "", label: "None" }] : [{ value: "", label: "Select…" }]),
            ...people.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <IconButton label="Add new person" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Icon name="user-plus" size={14} />
        </IconButton>
      </div>
      {adding ? (
        <div style={{ display: "flex", gap: 6 }}>
          <Input
            placeholder="New person's name"
            size="sm"
            style={{ flex: 1 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }}
          />
          <Button variant="secondary" size="sm" onClick={create} disabled={busy || !name.trim()}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </div>
      ) : null}
      {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
    </div>
  );
}

/* Rate ↔ amount pair: typing a % derives the amount from the principal;
   typing the amount directly clears the % (custom figure wins). */
function RateAmountPair({ rateLabel, amountLabel, principal, rate, amount, setRate, setAmount }: {
  rateLabel: string;
  amountLabel: string;
  principal: string;
  rate: string;
  amount: string;
  setRate: (v: string) => void;
  setAmount: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12 }}>
      <Input
        label={rateLabel}
        mono
        placeholder="e.g. 10"
        suffix="%"
        value={rate}
        onChange={(e) => {
          const v = e.target.value;
          setRate(v);
          if (v.trim() !== "") setAmount(String(pctOf(num(principal), num(v))));
        }}
      />
      <Input
        label={amountLabel}
        mono
        prefix="₱"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setRate("");
        }}
      />
    </div>
  );
}

function DealDialog({ people, deal, onClose, onPersonCreated }: {
  people: PersonRow[];
  deal: InvestmentRow | null;
  onClose: () => void;
  onPersonCreated: (p: PersonRow) => void;
}) {
  const router = useRouter();
  const [txDate, setTxDate] = React.useState(deal?.transaction_date ?? todayIso());
  const [financerId, setFinancerId] = React.useState(deal?.financer_id ?? "");
  const [principal, setPrincipal] = React.useState(deal ? String(deal.principal) : "");
  const [interestRate, setInterestRate] = React.useState(deal?.interest_rate != null ? String(deal.interest_rate) : "");
  const [interestAmount, setInterestAmount] = React.useState(deal ? String(deal.interest_amount) : "0");
  const [maturity, setMaturity] = React.useState(deal?.maturity_date ?? addDays(todayIso(), 30));
  const [maturityTouched, setMaturityTouched] = React.useState(Boolean(deal));
  const [returnRate, setReturnRate] = React.useState(deal ? (deal.business_return_rate != null ? String(deal.business_return_rate) : "") : "10");
  const [returnAmount, setReturnAmount] = React.useState(deal ? String(deal.business_return_amount) : "0");
  const [referrerId, setReferrerId] = React.useState(deal?.referrer_id ?? "");
  const [cutRate, setCutRate] = React.useState(deal?.referrer_cut_rate != null ? String(deal.referrer_cut_rate) : "");
  const [cutAmount, setCutAmount] = React.useState(deal ? String(deal.referrer_cut_amount) : "0");
  const [notes, setNotes] = React.useState(deal?.notes ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const financer = people.find((p) => p.id === financerId);

  const onPrincipalChange = (v: string) => {
    setPrincipal(v);
    const p = num(v);
    if (interestRate.trim() !== "") setInterestAmount(String(pctOf(p, num(interestRate))));
    if (returnRate.trim() !== "") setReturnAmount(String(pctOf(p, num(returnRate))));
    if (cutRate.trim() !== "") setCutAmount(String(pctOf(p, num(cutRate))));
  };

  const split = investmentSplit({
    principal: num(principal),
    interest_amount: num(interestAmount),
    business_return_amount: num(returnAmount),
    referrer_cut_amount: referrerId ? num(cutAmount) : 0,
  });

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = {
      id: deal?.id,
      transaction_date: txDate,
      financer_id: financerId,
      principal: num(principal),
      interest_rate: interestRate.trim() === "" ? null : num(interestRate),
      interest_amount: num(interestAmount),
      maturity_date: maturity,
      business_return_rate: returnRate.trim() === "" ? null : num(returnRate),
      business_return_amount: num(returnAmount),
      referrer_id: referrerId || null,
      referrer_cut_rate: cutRate.trim() === "" ? null : num(cutRate),
      referrer_cut_amount: referrerId ? num(cutAmount) : 0,
      notes,
    };
    const err = await financeApi("investments", deal ? "PATCH" : "POST", body);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      title={deal ? "Edit investment" : "Record investment"}
      description="Interest is what the financer is promised; the referral cut stays between you and the referrer."
      onClose={onClose}
      width={520}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : deal ? "Save changes" : "Record"}</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input
            label="Transaction date"
            type="date"
            mono
            value={txDate}
            onChange={(e) => {
              setTxDate(e.target.value);
              if (!maturityTouched && e.target.value) setMaturity(addDays(e.target.value, 30));
            }}
          />
          <Input
            label="Payout date"
            type="date"
            mono
            hint="Defaults to 30 days after the transaction"
            value={maturity}
            onChange={(e) => { setMaturity(e.target.value); setMaturityTouched(true); }}
          />
        </div>
        <PersonPicker label="Financer" people={people} value={financerId} onChange={setFinancerId} onCreated={onPersonCreated} />
        {financer?.is_me ? (
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
            Own capital — leave interest at 0 and the whole business return is your profit.
          </span>
        ) : null}
        <Input label="Amount invested" mono prefix="₱" placeholder="e.g. 50000" value={principal} onChange={(e) => onPrincipalChange(e.target.value)} />
        <RateAmountPair
          rateLabel="Interest %"
          amountLabel="Promised interest"
          principal={principal}
          rate={interestRate}
          amount={interestAmount}
          setRate={setInterestRate}
          setAmount={setInterestAmount}
        />
        <RateAmountPair
          rateLabel="Return %"
          amountLabel="Business return on this money"
          principal={principal}
          rate={returnRate}
          amount={returnAmount}
          setRate={setReturnRate}
          setAmount={setReturnAmount}
        />
        <PersonPicker label="Referred by (optional)" people={people.filter((p) => !p.is_me && p.id !== financerId)} value={referrerId} onChange={setReferrerId} allowNone onCreated={onPersonCreated} />
        {referrerId ? (
          <RateAmountPair
            rateLabel="Cut %"
            amountLabel="Referrer's cut"
            principal={principal}
            rate={cutRate}
            amount={cutAmount}
            setRate={setCutRate}
            setAmount={setCutAmount}
          />
        ) : null}
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div style={{
          display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px",
          background: "var(--bg-inset)", border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)",
          font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-2)",
        }}>
          <span>On {maturity || "the payout date"}: pay <strong style={{ color: "var(--text-1)" }}>{php(split.financerPayout)}</strong> to {financer?.name ?? "the financer"} (capital + interest)</span>
          {referrerId ? <span>Pay <strong style={{ color: "var(--text-1)" }}>{php(round2(num(cutAmount)))}</strong> to {people.find((p) => p.id === referrerId)?.name} (referral cut, outside the interest)</span> : null}
          <span>
            You keep{" "}
            <strong style={{ color: split.myProfit >= 0 ? "var(--success-text)" : "var(--danger-text)" }}>{php(split.myProfit)}</strong>
            {" "}of the {php(round2(num(returnAmount)))} return
          </span>
        </div>
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

function SettleDialog({ deal, people, onClose }: { deal: InvestmentRow; people: PersonRow[]; onClose: () => void }) {
  const router = useRouter();
  const [paidDate, setPaidDate] = React.useState(todayIso());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const split = investmentSplit(deal);
  const name = (id: string | null) => people.find((p) => p.id === id)?.name ?? "Unknown";

  const settle = async () => {
    setBusy(true);
    const err = await financeApi("investments", "PATCH", { id: deal.id, action: "settle", paid_date: paidDate });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      title="Mark as paid out"
      description="Record that the financer (and referrer) have been paid."
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={settle} disabled={busy}>{busy ? "Saving…" : "Mark paid"}</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, font: "var(--body-sm)", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
          <span>{name(deal.financer_id)} gets <strong style={{ color: "var(--text-1)" }}>{php(split.financerPayout)}</strong></span>
          {deal.referrer_id ? <span>{name(deal.referrer_id)} gets <strong style={{ color: "var(--text-1)" }}>{php(split.referrerCut)}</strong> (referral cut)</span> : null}
          <span>Your profit: <strong style={{ color: split.myProfit >= 0 ? "var(--success-text)" : "var(--danger-text)" }}>{php(split.myProfit)}</strong></span>
        </div>
        <Input label="Date paid" type="date" mono value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

function PersonDialog({ person, onClose }: { person: PersonRow | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = React.useState(person?.name ?? "");
  const [notes, setNotes] = React.useState(person?.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = await financeApi("people", person ? "PATCH" : "POST", { id: person?.id, name, notes });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      title={person ? `Edit ${person.name}` : "New person"}
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save"}</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Notes (optional)" placeholder="e.g. contact number, how you met" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

export function Investments({ people: initialPeople, investments }: { people: PersonRow[]; investments: InvestmentRow[] }) {
  const router = useRouter();
  /* People created inline from the deal dialog are appended locally so the
     pickers update immediately; router.refresh reconciles afterwards. */
  const [extraPeople, setExtraPeople] = React.useState<PersonRow[]>([]);
  const people = React.useMemo(() => {
    const known = new Set(initialPeople.map((p) => p.id));
    return [...initialPeople, ...extraPeople.filter((p) => !known.has(p.id))];
  }, [initialPeople, extraPeople]);
  const onPersonCreated = (p: PersonRow) => setExtraPeople((prev) => [...prev, p]);

  const [tab, setTab] = React.useState("deals");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dealDialog, setDealDialog] = React.useState<{ open: boolean; deal: InvestmentRow | null }>({ open: false, deal: null });
  const [settleDialog, setSettleDialog] = React.useState<InvestmentRow | null>(null);
  const [personDialog, setPersonDialog] = React.useState<{ open: boolean; person: PersonRow | null }>({ open: false, person: null });
  const [rowError, setRowError] = React.useState<string | null>(null);

  const personName = (id: string | null) => people.find((p) => p.id === id)?.name ?? "Unknown";
  const filtered = investments.filter((i) => statusFilter === "all" || i.status === statusFilter);

  const remove = async (deal: InvestmentRow) => {
    if (!window.confirm(`Delete the ${php(deal.principal)} investment from ${personName(deal.financer_id)}? This cannot be undone.`)) return;
    const err = await financeApi("investments", "DELETE", { id: deal.id });
    setRowError(err);
    if (!err) router.refresh();
  };

  const removePerson = async (person: PersonRow) => {
    if (!window.confirm(`Delete ${person.name}?`)) return;
    const err = await financeApi("people", "DELETE", { id: person.id });
    setRowError(err);
    if (!err) router.refresh();
  };

  const reopen = async (deal: InvestmentRow) => {
    const err = await financeApi("investments", "PATCH", { id: deal.id, action: "reopen" });
    setRowError(err);
    if (!err) router.refresh();
  };

  /* All-time totals per person for the People tab. */
  const personTotals = React.useMemo(() => {
    const totals = new Map<string, { invested: number; interest: number; referral: number; deals: number }>();
    const entry = (id: string) => {
      let t = totals.get(id);
      if (!t) {
        t = { invested: 0, interest: 0, referral: 0, deals: 0 };
        totals.set(id, t);
      }
      return t;
    };
    for (const inv of investments) {
      const f = entry(inv.financer_id);
      f.invested = round2(f.invested + inv.principal);
      f.interest = round2(f.interest + inv.interest_amount);
      f.deals += 1;
      if (inv.referrer_id) {
        const r = entry(inv.referrer_id);
        r.referral = round2(r.referral + inv.referrer_cut_amount);
      }
    }
    return totals;
  }, [investments]);

  return (
    <Page
      eyebrow="Finance"
      title="Investments"
      actions={
        tab === "deals" ? (
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setDealDialog({ open: true, deal: null })}>
            Record investment
          </Button>
        ) : (
          <Button variant="primary" size="sm" icon={<Icon name="user-plus" size={14} />} onClick={() => setPersonDialog({ open: true, person: null })}>
            New person
          </Button>
        )
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Tabs
          tabs={[
            { value: "deals", label: "Investments", count: investments.length },
            { value: "people", label: "People", count: people.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        {rowError ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{rowError}</span> : null}

        {tab === "deals" ? (
          <Card
            padding="0"
            title="All investments"
            subtitle="Interest is the financer's; the referral cut and your margin stay private"
            actions={
              <SegmentedControl
                size="sm"
                options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "paid", label: "Paid" }]}
                value={statusFilter}
                onChange={(v: string) => setStatusFilter(v)}
              />
            }
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Icon name="hand-coins" size={18} />}
                title="No investments yet"
                description="Record the first one — financer, amount, promised interest, and optional referrer."
                action={
                  <Button variant="primary" size="sm" onClick={() => setDealDialog({ open: true, deal: null })}>Record investment</Button>
                }
              />
            ) : (
              <Table
                rowKey="id"
                compact
                columns={[
                  { key: "transaction_date", label: "Date", mono: true },
                  { key: "financer", label: "Financer", render: (r: InvestmentRow) => (
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{personName(r.financer_id)}</span>
                  )},
                  { key: "principal", label: "Invested", mono: true, align: "right", render: (r: InvestmentRow) => php(r.principal) },
                  { key: "interest", label: "Interest", mono: true, align: "right", render: (r: InvestmentRow) => (
                    <span>{php(r.interest_amount)}{r.interest_rate != null ? <span style={{ color: "var(--text-3)" }}> ({r.interest_rate}%)</span> : null}</span>
                  )},
                  { key: "payout", label: "Payout due", mono: true, align: "right", render: (r: InvestmentRow) => php(r.payout_due) },
                  { key: "maturity_date", label: "Payout date", mono: true },
                  { key: "referrer", label: "Referral cut", mono: true, align: "right", render: (r: InvestmentRow) =>
                    r.referrer_id ? `${php(r.referrer_cut_amount)} → ${personName(r.referrer_id)}` : "—" },
                  { key: "profit", label: "My profit", mono: true, align: "right", render: (r: InvestmentRow) => (
                    <span style={{ color: r.my_profit >= 0 ? "var(--success-text)" : "var(--danger-text)" }}>{php(r.my_profit)}</span>
                  )},
                  { key: "status", label: "Status", render: (r: InvestmentRow) =>
                    r.status === "paid"
                      ? <Badge tone="success">Paid {r.paid_date ?? ""}</Badge>
                      : r.maturity_date < todayIso()
                        ? <Badge tone="danger">Overdue</Badge>
                        : <Badge tone="accent">Active</Badge> },
                  { key: "actions", label: "", align: "right", render: (r: InvestmentRow) => (
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {r.status === "active" ? (
                        <IconButton label="Mark paid out" onClick={() => setSettleDialog(r)}>
                          <Icon name="check" size={14} />
                        </IconButton>
                      ) : (
                        <IconButton label="Reopen" onClick={() => reopen(r)}>
                          <Icon name="undo-2" size={14} />
                        </IconButton>
                      )}
                      <IconButton label="Edit" onClick={() => setDealDialog({ open: true, deal: r })}>
                        <Icon name="pencil" size={14} />
                      </IconButton>
                      <IconButton label="Delete" onClick={() => remove(r)}>
                        <Icon name="trash-2" size={14} />
                      </IconButton>
                    </span>
                  )},
                ]}
                rows={filtered}
              />
            )}
          </Card>
        ) : (
          <Card padding="0" title="People" subtitle="Financers and referrers — all-time totals">
            <Table
              rowKey="id"
              compact
              columns={[
                { key: "name", label: "Name", render: (r: PersonRow) => (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                    {r.is_me ? <Badge tone="info">Me</Badge> : null}
                  </span>
                )},
                { key: "invested", label: "Invested", mono: true, align: "right", render: (r: PersonRow) => php(personTotals.get(r.id)?.invested ?? 0) },
                { key: "interest", label: "Interest earned", mono: true, align: "right", render: (r: PersonRow) => php(personTotals.get(r.id)?.interest ?? 0) },
                { key: "referral", label: "Referral cuts", mono: true, align: "right", render: (r: PersonRow) => php(personTotals.get(r.id)?.referral ?? 0) },
                { key: "deals", label: "Deals", mono: true, align: "right", render: (r: PersonRow) => personTotals.get(r.id)?.deals ?? 0 },
                { key: "notes", label: "Notes", render: (r: PersonRow) => <span style={{ color: "var(--text-3)" }}>{r.notes || "—"}</span> },
                { key: "actions", label: "", align: "right", render: (r: PersonRow) => (
                  <span style={{ display: "inline-flex", gap: 2 }}>
                    <IconButton label="Edit" onClick={() => setPersonDialog({ open: true, person: r })}>
                      <Icon name="pencil" size={14} />
                    </IconButton>
                    {!r.is_me ? (
                      <IconButton label="Delete" onClick={() => removePerson(r)}>
                        <Icon name="trash-2" size={14} />
                      </IconButton>
                    ) : null}
                  </span>
                )},
              ]}
              rows={people}
            />
          </Card>
        )}
      </div>

      {dealDialog.open ? (
        <DealDialog people={people} deal={dealDialog.deal} onClose={() => setDealDialog({ open: false, deal: null })} onPersonCreated={onPersonCreated} />
      ) : null}
      {settleDialog ? <SettleDialog deal={settleDialog} people={people} onClose={() => setSettleDialog(null)} /> : null}
      {personDialog.open ? <PersonDialog person={personDialog.person} onClose={() => setPersonDialog({ open: false, person: null })} /> : null}
    </Page>
  );
}
