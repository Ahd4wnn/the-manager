import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { billingApi, hospitalsApi, patientsApi, appointmentsApi } from "../api/endpoints";
import type { Invoice, Patient } from "../api/types";
import { inr } from "../lib/format";
import { Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import {
  IconBuilding,
  IconCalendar,
  IconReceipt,
  IconUser,
  IconWallet,
} from "../components/icons";

function StatCard({
  icon,
  label,
  value,
  tone = "blue",
  delay = 0,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "blue" | "green" | "orange";
  delay?: number;
  onClick?: () => void;
}) {
  const bg =
    tone === "green" ? "var(--green-soft)" : tone === "orange" ? "var(--orange-soft)" : "var(--accent-soft)";
  const fg =
    tone === "green" ? "var(--green)" : tone === "orange" ? "var(--orange)" : "var(--accent)";
  return (
    <div
      className="card card-pad rise"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms`, cursor: onClick ? "pointer" : "default" }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: bg,
          color: fg,
          display: "grid",
          placeItems: "center",
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <div className="num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </div>
      <div className="muted" style={{ marginTop: 7 }}>
        {label}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { me, isAdmin, activeHospitalId } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hospitalCount, setHospitalCount] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [apptToday, setApptToday] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        if (isAdmin) {
          const hs = await hospitalsApi.list();
          if (alive) setHospitalCount(hs.length);
        } else if (activeHospitalId) {
          const [ps, invs, appts] = await Promise.all([
            patientsApi.list(),
            billingApi.list(),
            appointmentsApi.list(),
          ]);
          if (!alive) return;
          setPatients(ps);
          setInvoices(invs);
          const today = new Date().toDateString();
          setApptToday(
            appts.filter((a) => new Date(a.scheduled_start).toDateString() === today).length,
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin, activeHospitalId]);

  if (loading) return <Spinner label="Loading overview" />;

  const outstanding = invoices.reduce((s, i) => s + Number(i.balance_due), 0);
  const collected = invoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const greeting = me?.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader title={`Hello, ${greeting}`} subtitle="Here's what's happening today." />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {isAdmin ? (
          <StatCard
            icon={<IconBuilding width={20} height={20} />}
            label="Hospitals on the platform"
            value={String(hospitalCount)}
            onClick={() => navigate("/hospitals")}
            delay={40}
          />
        ) : (
          <>
            <StatCard
              icon={<IconUser width={20} height={20} />}
              label="Registered patients"
              value={String(patients.length)}
              onClick={() => navigate("/patients")}
              delay={40}
            />
            <StatCard
              icon={<IconCalendar width={20} height={20} />}
              label="Appointments today"
              value={String(apptToday)}
              onClick={() => navigate("/appointments")}
              delay={90}
            />
            <StatCard
              icon={<IconWallet width={20} height={20} />}
              label="Outstanding balance"
              value={inr(outstanding)}
              tone="orange"
              onClick={() => navigate("/billing")}
              delay={140}
            />
            <StatCard
              icon={<IconReceipt width={20} height={20} />}
              label="Collected (all time)"
              value={inr(collected)}
              tone="green"
              onClick={() => navigate("/billing")}
              delay={190}
            />
          </>
        )}
      </div>

      {isAdmin && (
        <div className="card card-pad rise" style={{ marginTop: 24, animationDelay: "120ms" }}>
          <div className="section-title" style={{ marginBottom: 6 }}>
            Getting started
          </div>
          <p className="muted" style={{ maxWidth: 560 }}>
            Create a hospital, then add an owner account for it. Owners can then set up their
            managers, staff, treatment catalog and start registering patients.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/hospitals")}>
            Manage hospitals
          </button>
        </div>
      )}
    </div>
  );
}
