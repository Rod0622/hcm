import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/* Tenkara marketing landing page — ported from the design-system website kit. */

const css = `
  .land { background: var(--bg-surface); }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 32px; }

  .nav { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg-surface) 82%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-1); }
  .nav-inner { height: 60px; display: flex; align-items: center; gap: 28px; }
  .brand { display: flex; align-items: center; gap: 9px; }
  .nav-links { display: flex; gap: 22px; flex: 1; }
  .nav-links a { font: var(--weight-medium) var(--text-sm)/1 var(--font-sans); color: var(--text-2); text-decoration: none; }
  .nav-links a:hover { color: var(--text-1); }
  .nav-cta { display: flex; align-items: center; gap: 10px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 36px; padding: 0 16px; border-radius: var(--radius-md); font: var(--weight-medium) var(--text-sm)/1 var(--font-sans); text-decoration: none; cursor: pointer; border: 1px solid transparent; transition: background var(--duration-fast) var(--ease-out); }
  .btn:hover { text-decoration: none; }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-secondary { background: var(--bg-surface); color: var(--text-1); border-color: var(--border-1); box-shadow: var(--shadow-xs); }
  .btn-secondary:hover { background: var(--bg-hover); }
  .btn-ghost { color: var(--text-2); }
  .btn-ghost:hover { color: var(--text-1); background: var(--bg-hover); }
  .btn-lg { height: 42px; padding: 0 20px; font-size: var(--text-md); }

  .hero { position: relative; padding: 96px 0 0; text-align: center; overflow: hidden; }
  .hero-glow { position: absolute; top: -240px; left: 50%; transform: translateX(-50%); width: 880px; height: 520px; background: radial-gradient(ellipse at center, color-mix(in srgb, var(--gold-500) 16%, transparent), transparent 65%); pointer-events: none; }
  .hero-badge { display: inline-flex; align-items: center; gap: 7px; height: 26px; padding: 0 12px; border-radius: var(--radius-full); border: 1px solid var(--border-1); background: var(--bg-base); font: var(--weight-medium) var(--text-xs)/1 var(--font-sans); color: var(--text-2); white-space: nowrap; }
  .hero-badge i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
  .hero h1 { font: var(--weight-regular) var(--text-5xl)/1.1 var(--font-serif); letter-spacing: var(--tracking-serif); color: var(--text-1); margin: 22px auto 0; max-width: 840px; text-wrap: balance; }
  .hero p { font: var(--weight-regular) var(--text-lg)/var(--leading-relaxed) var(--font-sans); color: var(--text-2); max-width: 600px; margin: 18px auto 0; text-wrap: pretty; }
  .hero-ctas { display: flex; justify-content: center; gap: 12px; margin-top: 30px; }
  .hero-meta { margin-top: 14px; font: var(--weight-regular) var(--text-xs)/1 var(--font-sans); color: var(--text-3); }

  .frame-wrap { position: relative; margin: 64px auto -2px; max-width: 1020px; padding: 0 32px; }
  .frame { border: 1px solid var(--border-1); border-bottom: none; border-radius: var(--radius-xl) var(--radius-xl) 0 0; box-shadow: var(--shadow-lg); overflow: hidden; background: var(--gray-950); }
  .frame-bar { height: 36px; display: flex; align-items: center; gap: 6px; padding: 0 14px; background: #211c16; border-bottom: 1px solid rgba(255,244,224,0.09); }
  .frame-bar i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,0.14); }

  .section { padding: 88px 0; border-top: 1px solid var(--border-1); }
  .eyebrow { font: var(--label-caps); letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--text-accent); }
  .section h2 { font: var(--weight-regular) var(--text-3xl)/1.18 var(--font-serif); letter-spacing: var(--tracking-serif); color: var(--text-1); margin-top: 12px; max-width: 560px; text-wrap: balance; }
  .section .lede { font: var(--body-md); font-size: 15px; color: var(--text-2); max-width: 560px; margin-top: 12px; text-wrap: pretty; }

  .modules { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 44px; }
  .module { border: 1px solid var(--border-1); border-radius: var(--radius-lg); padding: 22px; background: var(--bg-surface); display: flex; flex-direction: column; gap: 10px; transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out); }
  .module:hover { border-color: var(--border-2); box-shadow: var(--shadow-sm); }
  .module .ic { width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--accent-subtle); color: var(--text-accent); display: flex; align-items: center; justify-content: center; }
  .module h3 { font: var(--title-card); color: var(--text-1); }
  .module p { font: var(--body-sm); color: var(--text-2); text-wrap: pretty; }

  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .checklist { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
  .check { display: flex; gap: 10px; font: var(--body-sm); font-size: var(--text-md); color: var(--text-1); }
  .check .ci { color: var(--success); flex-shrink: 0; margin-top: 2px; }

  .diagram { background: var(--bg-base); border: 1px solid var(--border-1); border-radius: var(--radius-xl); padding: 28px; background-image: radial-gradient(var(--border-1) 1px, transparent 1px); background-size: 18px 18px; display: flex; flex-direction: column; gap: 14px; }
  .wnode { display: flex; align-items: center; gap: 10px; background: var(--bg-surface); border: 1px solid var(--border-1); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); padding: 10px 14px; width: 260px; }
  .wnode .ic { width: 26px; height: 26px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .wnode b { font: var(--label-md); font-size: var(--text-xs); color: var(--text-1); display: block; }
  .wnode small { font: var(--body-sm); font-size: var(--text-2xs); color: var(--text-3); }
  .wlink { width: 1px; height: 16px; background: var(--border-2); margin-left: 27px; }

  .countries { display: flex; flex-direction: column; gap: 10px; }
  .country { display: flex; align-items: center; gap: 12px; border: 1px solid var(--border-1); background: var(--bg-surface); border-radius: var(--radius-md); padding: 12px 16px; }
  .country b { font: var(--label-md); color: var(--text-1); width: 130px; }
  .country span { font: var(--body-sm); font-size: var(--text-xs); color: var(--text-2); flex: 1; }
  .pill { display: inline-flex; align-items: center; gap: 5px; height: 20px; padding: 0 8px; border-radius: var(--radius-full); font: var(--weight-medium) var(--text-2xs)/1 var(--font-sans); background: var(--success-subtle); color: var(--success-text); flex: none !important; }
  .pill i { width: 6px; height: 6px; border-radius: 50%; background: var(--success); }

  .cta { background: var(--gray-950); color: #f1ece1; text-align: center; padding: 96px 32px; }
  .cta h2 { font: var(--weight-regular) var(--text-3xl)/1.18 var(--font-serif); letter-spacing: var(--tracking-serif); text-wrap: balance; }
  .cta p { font: var(--body-md); color: #a79d8c; margin-top: 12px; }
  .cta .hero-ctas { margin-top: 28px; }
  .btn-inverse { background: #f1ece1; color: #161310; }
  .btn-inverse:hover { background: #fff; }
  .btn-outline-dark { border-color: rgba(255,244,224,0.18); color: #f1ece1; }
  .btn-outline-dark:hover { background: rgba(255,244,224,0.06); }

  .land footer { border-top: 1px solid var(--border-1); padding: 40px 0; }
  .foot { display: flex; align-items: center; gap: 16px; }
  .foot .links { display: flex; gap: 20px; flex: 1; justify-content: flex-end; }
  .foot a { font: var(--body-sm); font-size: var(--text-xs); color: var(--text-3); text-decoration: none; }
  .foot a:hover { color: var(--text-1); }

  @media (max-width: 880px) {
    .modules { grid-template-columns: 1fr; }
    .split { grid-template-columns: 1fr; gap: 40px; }
    .nav-links { display: none; }
  }
`;

const MODULES = [
  { icon: "users", title: "Core HR", body: "Employee records, org chart, legal entities, documents — with custom fields on every object." },
  { icon: "banknote", title: "Payroll", body: "Versioned rules for earnings, deductions, and taxes. Preview every run; exceptions surface before money moves." },
  { icon: "shield-check", title: "Compliance", body: "Country packs with deadlines, required documents, and payroll blockers. Audit-ready by default." },
  { icon: "workflow", title: "Workflows", body: "No-code lifecycle automation: triggers, approvals, tasks, documents, and integrations." },
  { icon: "laptop", title: "IT automation", body: "Provision apps and devices on hire. Revoke everything on exit — automatically, with evidence." },
  { icon: "sparkles", title: "AI assistant", body: "Ask about policy, payroll variance, or attrition in plain language. Answers cite the graph." },
];

function MiniStat({ label, value, note, noteColor }: { label: string; value: string; note: string; noteColor: string }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 12 }}>
      <div style={{ font: "600 8px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</div>
      <div style={{ font: "600 18px/1.3 var(--font-mono)", color: "var(--text-1)" }}>{value}</div>
      <div style={{ font: "500 9px/1 var(--font-sans)", color: noteColor }}>{note}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="land">
      <style>{css}</style>

      <nav className="nav">
        <div className="wrap nav-inner">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logotype-black.png" alt="Tenkara" style={{ height: 20, width: "auto" }} />
          </div>
          <div className="nav-links">
            <a href="#modules">Platform</a>
            <a href="#workflows">Workflows</a>
            <a href="#compliance">Compliance</a>
            <a href="#">Pricing</a>
          </div>
          <div className="nav-cta">
            <Link className="btn btn-ghost" href="/dashboard">Sign in</Link>
            <a className="btn btn-primary" href="#">Get a demo</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-glow" />
        <div className="wrap">
          <span className="hero-badge"><i />Payroll · Compliance · HR · IT · AI</span>
          <h1>The workforce operating system</h1>
          <p>Payroll, compliance, HR, and IT automation on one employee graph. Configurable down to every field, policy, and approval — in every country you operate.</p>
          <div className="hero-ctas">
            <a className="btn btn-primary btn-lg" href="#">Get a demo</a>
            <Link className="btn btn-secondary btn-lg" href="/dashboard">Explore the product</Link>
          </div>
          <div className="hero-meta">No consultants required.</div>
        </div>
        <div className="frame-wrap">
          <div className="frame">
            <div className="frame-bar"><i /><i /><i /></div>
            <div data-theme="dark" style={{ background: "var(--bg-base)", padding: 20, display: "grid", gridTemplateColumns: "150px 1fr", gap: 16, textAlign: "left" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logotype-white.png" alt="Tenkara" style={{ height: 11, width: "auto" }} />
                </div>
                <div style={{ height: 22, borderRadius: 5, background: "var(--bg-active)", display: "flex", alignItems: "center", padding: "0 8px", font: "var(--weight-medium) 10px/1 var(--font-sans)", color: "var(--text-1)" }}>Home</div>
                {["Employees", "Payroll", "Compliance", "Workflows"].map((l) => (
                  <div key={l} style={{ height: 22, display: "flex", alignItems: "center", padding: "0 8px", font: "10px/1 var(--font-sans)", color: "var(--text-2)" }}>{l}</div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ font: "var(--weight-semibold) 16px/1.2 var(--font-sans)", letterSpacing: "-0.02em", color: "var(--text-1)" }}>Good morning, Ana</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <MiniStat label="Headcount" value="142" note="+6 this month" noteColor="var(--success-text)" />
                  <MiniStat label="Net pay" value="$1.28M" note="118 employees" noteColor="var(--text-3)" />
                  <MiniStat label="Open roles" value="9" note="4 in offer" noteColor="var(--text-3)" />
                  <MiniStat label="Compliance" value="3" note="1 blocker" noteColor="var(--danger-text)" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10 }}>
                  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ font: "600 10px/1 var(--font-sans)", color: "var(--text-1)" }}>Headcount movements</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 64 }}>
                      {[58, 64, 68, 76, 88].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--accent-subtle)", border: "1px solid var(--accent-muted)", borderRadius: "3px 3px 1px 1px" }} />
                      ))}
                      <div style={{ flex: 1, height: "100%", background: "var(--chart-1)", borderRadius: "3px 3px 1px 1px" }} />
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ font: "600 10px/1 var(--font-sans)", color: "var(--text-1)" }}>Workflow runs</div>
                    {[
                      ["var(--info)", "Onboarding — US · 6 of 8"],
                      ["var(--danger)", "Onboarding — PH · blocked"],
                      ["var(--warning)", "Promotion · waiting"],
                      ["var(--success)", "Offboarding — US · done"],
                    ].map(([c, t]) => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, font: "9px/1 var(--font-sans)", color: "var(--text-2)" }}>
                        <i style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />{t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section" id="modules">
        <div className="wrap">
          <span className="eyebrow">Platform</span>
          <h2>Every module. One employee graph.</h2>
          <p className="lede">Hire, promote, transfer, relocate, terminate — every event flows through the same graph, so payroll, compliance, and IT stay correct automatically.</p>
          <div className="modules">
            {MODULES.map((m) => (
              <div className="module" key={m.title}>
                <span className="ic"><Icon name={m.icon} size={16} /></span>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="workflows">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Workflow engine</span>
            <h2>Events drive the system</h2>
            <p className="lede">Build lifecycle automation visually. Every hire, promotion, and exit triggers the right approvals, tasks, and provisioning — across HR, IT, and Finance.</p>
            <div className="checklist">
              {[
                "Branch by country, entity, or worker type",
                "Approvals with escalation and delegation",
                "Every run audited: actor, time, old → new",
              ].map((t) => (
                <div className="check" key={t}><span className="ci"><Icon name="circle-check" size={16} /></span>{t}</div>
              ))}
            </div>
          </div>
          <div className="diagram">
            <div className="wnode"><span className="ic" style={{ background: "var(--accent-subtle)", color: "var(--text-accent)" }}><Icon name="zap" size={14} /></span><span><b>Employee hired</b><small>Trigger · any entity</small></span></div>
            <div className="wlink" />
            <div className="wnode"><span className="ic" style={{ background: "var(--warning-subtle)", color: "var(--warning-text)" }}><Icon name="split" size={14} /></span><span><b>Country?</b><small>Condition · 3 branches</small></span></div>
            <div className="wlink" />
            <div className="wnode"><span className="ic" style={{ background: "var(--violet-100)", color: "var(--violet-500)" }}><Icon name="user-check" size={14} /></span><span><b>Manager approval</b><small>Escalates after 48h</small></span></div>
            <div className="wlink" />
            <div className="wnode"><span className="ic" style={{ background: "var(--info-subtle)", color: "var(--info-text)" }}><Icon name="plug" size={14} /></span><span><b>Provision Google Workspace</b><small>Integration · retries on failure</small></span></div>
          </div>
        </div>
      </section>

      <section className="section" id="compliance">
        <div className="wrap split">
          <div className="countries">
            <div className="country"><b>United States</b><span>I-9 · W-4 · 941 quarterly · state taxes</span><span className="pill"><i />14/16</span></div>
            <div className="country"><b>Philippines</b><span>TIN · SSS · PhilHealth · Pag-IBIG · 13th month</span><span className="pill" style={{ background: "var(--warning-subtle)", color: "var(--warning-text)" }}><i style={{ background: "var(--warning)" }} />9/12</span></div>
            <div className="country"><b>Singapore</b><span>CPF · IR8A · leave entitlements</span><span className="pill"><i />11/11</span></div>
          </div>
          <div>
            <span className="eyebrow">Compliance engine</span>
            <h2>Compliant in every country you hire</h2>
            <p className="lede">Country packs encode required fields, documents, deadlines, and statutory rates. Missing requirements block payroll before they become penalties.</p>
            <div className="checklist">
              {[
                "Rules versioned by effective date and entity",
                "Evidence collected as work happens",
                "One-click audit reports per entity",
              ].map((t) => (
                <div className="check" key={t}><span className="ci"><Icon name="circle-check" size={16} /></span>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>Run people operations like software</h2>
        <p>See your org, payroll, and compliance on one graph — in a 30-minute demo.</p>
        <div className="hero-ctas">
          <a className="btn btn-inverse btn-lg" href="#">Get a demo</a>
          <Link className="btn btn-outline-dark btn-lg" href="/dashboard">Explore the product</Link>
        </div>
      </section>

      <footer>
        <div className="wrap foot">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logotype-black.png" alt="Tenkara" style={{ height: 16, width: "auto" }} />
          </div>
          <span style={{ font: "var(--body-sm)", fontSize: "var(--text-xs)", color: "var(--text-3)" }}>© 2026 Tenkara, Inc.</span>
          <div className="links">
            <a href="#">Security</a><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
