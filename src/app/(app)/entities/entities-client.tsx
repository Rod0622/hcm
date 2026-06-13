"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/app-shell";
import { Icon, Card, Badge, Button, Table, Input, Select, Dialog, EmptyState, IconButton } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type EntityRow = {
  id: string;
  name: string;
  country: string;
  currency: string;
  headcount: number;
  locations: number;
  taxId: string;
};

const CURRENCIES = ["USD", "PHP", "SGD", "EUR", "GBP", "AUD", "JPY"];

function EntityDialog({ tenantId, entity, onClose }: { tenantId: string; entity: EntityRow | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = React.useState(entity?.name ?? "");
  const [country, setCountry] = React.useState(entity?.country ?? "");
  const [currency, setCurrency] = React.useState(entity?.currency ?? "USD");
  const [taxId, setTaxId] = React.useState(entity?.taxId ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!name.trim() || country.trim().length !== 2) {
      setError("Name and a 2-letter country code are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      country_code: country.trim().toUpperCase(),
      currency,
      tax_registrations: taxId.trim() ? { tax_id: taxId.trim() } : {},
    };
    const { error } = entity
      ? await supabase.from("legal_entities").update(payload).eq("id", entity.id)
      : await supabase.from("legal_entities").insert({ tenant_id: tenantId, ...payload });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      title={entity ? `Edit ${entity.name}` : "New legal entity"}
      onClose={onClose}
      footer={
        <React.Fragment>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </React.Fragment>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Entity name" placeholder="e.g. Tenkara Japan K.K." value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Country code" placeholder="e.g. JP" mono value={country} onChange={(e) => setCountry(e.target.value)} />
          <Select label="Currency" options={CURRENCIES} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
        <Input label="Tax registration ID (optional)" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        {error ? <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </Dialog>
  );
}

export function Entities({ rows, tenantId, isAdmin }: { rows: EntityRow[]; tenantId: string; isAdmin: boolean }) {
  const [dialog, setDialog] = React.useState<{ open: boolean; entity: EntityRow | null }>({ open: false, entity: null });

  return (
    <Page
      eyebrow="Workforce"
      title="Legal entities"
      actions={isAdmin ? (
        <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => setDialog({ open: true, entity: null })}>
          New entity
        </Button>
      ) : null}
    >
      <Card padding="0">
        {rows.length === 0 ? (
          <EmptyState icon={<Icon name="building-2" size={18} />} title="No legal entities" description="Add the companies you employ people through." />
        ) : (
          <Table
            rowKey="id"
            columns={[
              { key: "name", label: "Entity", render: (r) => (
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="building-2" size={15} color="var(--text-3)" />
                  <span style={{ font: "var(--label-md)", fontSize: "var(--text-sm)", color: "var(--text-1)" }}>{r.name}</span>
                </span>
              )},
              { key: "country", label: "Country", mono: true, render: (r) => <Badge tone="neutral" mono>{r.country}</Badge> },
              { key: "currency", label: "Currency", mono: true },
              { key: "headcount", label: "Headcount", mono: true, align: "right" },
              { key: "locations", label: "Locations", mono: true, align: "right" },
              { key: "taxId", label: "Tax ID", mono: true, render: (r) => <span>{r.taxId || "—"}</span> },
              ...(isAdmin ? [{ key: "actions", label: "", align: "right" as const, render: (r: EntityRow) => (
                <IconButton label="Edit entity" onClick={() => setDialog({ open: true, entity: r })}>
                  <Icon name="pencil" size={14} />
                </IconButton>
              )}] : []),
            ]}
            rows={rows}
          />
        )}
      </Card>
      {dialog.open ? <EntityDialog tenantId={tenantId} entity={dialog.entity} onClose={() => setDialog({ open: false, entity: null })} /> : null}
    </Page>
  );
}
