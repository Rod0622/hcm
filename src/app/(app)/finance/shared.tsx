import { Page } from "@/components/app-shell";
import { Banner, Card, EmptyState, Icon } from "@/components/ui";

/* Server-rendered fallbacks shared by every /finance page. */

export function FinanceLocked() {
  return (
    <Page eyebrow="Finance" title="Financing">
      <Card padding="0">
        <EmptyState
          icon={<Icon name="lock" size={18} />}
          title="Owner access only"
          description="The financing tracker is personal to the workspace owner."
        />
      </Card>
    </Page>
  );
}

export function FinanceSetup() {
  return (
    <Page eyebrow="Finance" title="Financing">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Banner
          tone="warning"
          title="Connect the Financing database"
          description="Add FINANCE_SUPABASE_SECRET_KEY to .env.local and restart — see docs/FINANCE.md for the two-minute setup."
        />
        <Card title="How to connect" subtitle="One secret key from the Financing Supabase project">
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, font: "var(--body-md)", color: "var(--text-2)" }}>
            <li>Open the Financing project&apos;s dashboard → Settings → API keys.</li>
            <li>Copy a secret key (starts with <code style={{ font: "var(--weight-regular) var(--text-xs)/1 var(--font-mono)" }}>sb_secret_</code>).</li>
            <li>Add <code style={{ font: "var(--weight-regular) var(--text-xs)/1 var(--font-mono)" }}>FINANCE_SUPABASE_SECRET_KEY=sb_secret_…</code> to <code style={{ font: "var(--weight-regular) var(--text-xs)/1 var(--font-mono)" }}>.env.local</code> and restart the dev server.</li>
          </ol>
        </Card>
      </div>
    </Page>
  );
}
