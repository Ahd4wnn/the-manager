import { useEffect, useState, type ReactNode } from "react";
import { reportsApi } from "../api/endpoints";
import { download } from "../api/client";
import type { FinancialSummary, StaffPerformanceReport } from "../api/types";
import { Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import { IconReceipt, IconUser, IconWallet } from "../components/icons";
import { inr, titleCase } from "../lib/format";

type Gran = "daily" | "weekly" | "monthly";

export default function Reports() {
  const [gran, setGran] = useState<Gran>("daily");
  const [loading, setLoading] = useState(true);
  const [fin, setFin] = useState<FinancialSummary | null>(null);
  const [perf, setPerf] = useState<StaffPerformanceReport | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([reportsApi.financial({ granularity: gran }), reportsApi.staffPerformance()])
      .then(([f, p]) => {
        if (!alive) return;
        setFin(f);
        setPerf(p);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [gran]);

  async function downloadExcel() {
    setDownloading(true);
    try {
      await download(reportsApi.excelUrl(gran), `report-${gran}.xlsx`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Financial analysis"
        subtitle="Revenue, expenses and staff performance."
        action={
          <button className="btn btn-primary" onClick={downloadExcel} disabled={downloading}>
            {downloading ? "Preparing…" : "Download Excel"}
          </button>
        }
      />

      <div className="rise" style={{ display: "inline-flex", gap: 2, background: "var(--gray-soft)", padding: 3, borderRadius: "var(--r-sm)", marginBottom: 20 }}>
        {(["daily", "weekly", "monthly"] as Gran[]).map((g) => (
          <button
            key={g}
            onClick={() => setGran(g)}
            className="btn btn-sm"
            style={{
              background: gran === g ? "var(--surface)" : "transparent",
              color: gran === g ? "var(--accent)" : "var(--text-2)",
              boxShadow: gran === g ? "var(--shadow-sm)" : "none",
              fontWeight: gran === g ? 600 : 500,
            }}
          >
            {titleCase(g)}
          </button>
        ))}
      </div>

      {loading || !fin ? (
        <Spinner label="Crunching numbers" />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <Kpi icon={<IconWallet width={20} height={20} />} label="Revenue collected" value={inr(fin.total_revenue)} tone="green" delay={40} />
            <Kpi icon={<IconReceipt width={20} height={20} />} label="Expenses" value={inr(fin.total_expenses)} tone="orange" delay={80} />
            <Kpi icon={<IconWallet width={20} height={20} />} label="Net" value={inr(fin.net)} tone={Number(fin.net) >= 0 ? "green" : "orange"} delay={120} />
            <Kpi icon={<IconReceipt width={20} height={20} />} label="Outstanding" value={inr(fin.outstanding)} tone="orange" delay={160} />
            <Kpi icon={<IconUser width={20} height={20} />} label="New patients" value={String(fin.patients)} delay={200} />
          </div>

          <div className="card rise" style={{ marginTop: 24, overflow: "hidden", animationDelay: "120ms" }}>
            <div className="card-pad" style={{ paddingBottom: 4 }}>
              <div className="section-title">Revenue vs expenses · {titleCase(gran)}</div>
            </div>
            <div style={{ padding: "8px 6px 6px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th style={{ textAlign: "right" }}>Revenue</th>
                    <th style={{ textAlign: "right" }}>Expenses</th>
                    <th style={{ textAlign: "right" }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {fin.buckets.length === 0 ? (
                    <tr><td colSpan={4} className="muted" style={{ textAlign: "center", padding: 28 }}>No activity in this range.</td></tr>
                  ) : (
                    fin.buckets.map((b) => (
                      <tr key={b.label}>
                        <td className="mono">{b.label}</td>
                        <td className="mono" style={{ textAlign: "right", color: "var(--green)" }}>{inr(b.revenue)}</td>
                        <td className="mono" style={{ textAlign: "right", color: "var(--orange)" }}>{inr(b.expenses)}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{inr(b.net)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {perf && perf.staff.length > 0 && (
            <div className="card rise" style={{ marginTop: 24, overflow: "hidden", animationDelay: "160ms" }}>
              <div className="card-pad" style={{ paddingBottom: 4 }}>
                <div className="section-title">Staff performance</div>
              </div>
              <div style={{ padding: "8px 6px 6px" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th style={{ textAlign: "right" }}>Treatments</th>
                      <th style={{ textAlign: "right" }}>Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.staff.map((s) => (
                      <tr key={s.user_id}>
                        <td style={{ fontWeight: 500 }}>
                          {s.full_name}
                          {s.designation && <span className="muted tiny"> · {s.designation}</span>}
                        </td>
                        <td className="muted">{titleCase(s.role)}</td>
                        <td className="mono" style={{ textAlign: "right" }}>{s.treatments_performed}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{inr(s.payments_collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = "blue",
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "blue" | "green" | "orange";
  delay?: number;
}) {
  const bg = tone === "green" ? "var(--green-soft)" : tone === "orange" ? "var(--orange-soft)" : "var(--accent-soft)";
  const fg = tone === "green" ? "var(--green)" : tone === "orange" ? "var(--orange)" : "var(--accent)";
  return (
    <div className="card card-pad rise" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, color: fg, display: "grid", placeItems: "center", marginBottom: 14 }}>
        {icon}
      </div>
      <div className="num" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</div>
      <div className="muted tiny" style={{ marginTop: 5 }}>{label}</div>
    </div>
  );
}
