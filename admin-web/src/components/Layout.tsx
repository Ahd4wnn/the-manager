import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useApp, canManage } from "../context/AppContext";
import { initials } from "../lib/format";
import { Avatar } from "./ui";
import {
  IconBuilding,
  IconCalendar,
  IconChevronDown,
  IconGrid,
  IconHeart,
  IconLogout,
  IconReceipt,
  IconStethoscope,
  IconUser,
  IconUsers,
} from "./icons";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  show: boolean;
}

export default function Layout() {
  const { me, isAdmin, role, activeHospitalId, selectHospital } = useApp();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const memberships = me?.memberships ?? [];
  const active = memberships.find((m) => m.hospital_id === activeHospitalId);

  const nav: NavItem[] = [
    { to: "/", label: "Overview", icon: <IconGrid width={19} height={19} />, show: true },
    { to: "/patients", label: "Patients", icon: <IconUser width={19} height={19} />, show: !isAdmin },
    { to: "/appointments", label: "Appointments", icon: <IconCalendar width={19} height={19} />, show: !isAdmin },
    { to: "/treatments", label: "Treatments", icon: <IconStethoscope width={19} height={19} />, show: !isAdmin },
    { to: "/billing", label: "Billing", icon: <IconReceipt width={19} height={19} />, show: !isAdmin },
    { to: "/staff", label: "Staff", icon: <IconUsers width={19} height={19} />, show: !isAdmin && canManage(role) },
    { to: "/hospitals", label: "Hospitals", icon: <IconBuilding width={19} height={19} />, show: isAdmin },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 244,
          flexShrink: 0,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "22px 14px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 22px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(160deg, #0a84ff, #0060c0)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <IconHeart width={17} height={17} />
          </div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 600, letterSpacing: "-0.02em", fontSize: 15 }}>
              The Manager
            </div>
            <div className="tiny muted" style={{ fontSize: 11 }}>
              {isAdmin ? "Platform admin" : "Clinic console"}
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav
            .filter((n) => n.show)
            .map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className="navlink">
                {n.icon}
                <span>{n.label}</span>
              </NavLink>
            ))}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 8px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <Avatar initials={initials(me?.full_name ?? "?")} size={32} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {me?.full_name}
              </div>
              <div className="tiny muted" style={{ textTransform: "capitalize" }}>
                {role}
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              title="Sign out"
              onClick={() => navigate("/logout")}
              style={{ width: 32, padding: 0 }}
            >
              <IconLogout width={17} height={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: 60,
            flexShrink: 0,
            borderBottom: "1px solid var(--border)",
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "saturate(180%) blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
          }}
        >
          {/* Hospital switcher */}
          {!isAdmin && memberships.length > 0 ? (
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSwitcherOpen((o) => !o)}
                onBlur={() => setTimeout(() => setSwitcherOpen(false), 120)}
                style={{ gap: 8 }}
              >
                <IconBuilding width={16} height={16} />
                <span style={{ fontWeight: 500 }}>{active?.hospital_name ?? "Select hospital"}</span>
                <IconChevronDown width={14} height={14} style={{ color: "var(--text-3)" }} />
              </button>
              {switcherOpen && (
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    top: 40,
                    left: 0,
                    minWidth: 240,
                    padding: 6,
                    zIndex: 50,
                    boxShadow: "var(--shadow-lg)",
                    animation: "pop 0.2s var(--ease)",
                  }}
                >
                  {memberships.map((m) => (
                    <button
                      key={m.hospital_id}
                      onMouseDown={() => selectHospital(m.hospital_id)}
                      className="menu-item"
                      style={{ fontWeight: m.hospital_id === activeHospitalId ? 600 : 400 }}
                    >
                      <span>{m.hospital_name}</span>
                      <span className="tiny muted" style={{ textTransform: "capitalize" }}>
                        {m.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>Platform administration</div>
          )}

          <div className="tiny muted mono">{me?.phone}</div>
        </header>

        <main style={{ flex: 1, overflow: "auto", padding: "28px 28px 48px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
