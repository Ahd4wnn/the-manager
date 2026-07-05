import { useEffect, type ReactNode } from "react";
import { IconClose } from "./icons";
import type { AppointmentStatus, InvoiceStatus } from "../api/types";
import { titleCase } from "../lib/format";

export function Spinner({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "64px 0",
        color: "var(--text-3)",
      }}
    >
      <div className="spinner" />
      {label && <span className="tiny">{label}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 6,
        padding: "72px 24px",
      }}
    >
      {icon && (
        <div
          style={{
            width: 52,
            height: 52,
            display: "grid",
            placeItems: "center",
            borderRadius: 16,
            background: "var(--accent-soft)",
            color: "var(--accent)",
            marginBottom: 8,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {hint && (
        <div className="muted" style={{ maxWidth: 320 }}>
          {hint}
        </div>
      )}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.28)",
        backdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 100,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="card"
        style={{
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-lg)",
          animation: "pop 0.28s var(--ease)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px 14px",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {title}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 32, padding: 0 }}>
            <IconClose width={17} height={17} />
          </button>
        </div>
        <div style={{ padding: "0 22px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

const INVOICE_BADGE: Record<InvoiceStatus, string> = {
  draft: "badge-gray",
  issued: "badge-blue",
  partially_paid: "badge-orange",
  paid: "badge-green",
  cancelled: "badge-red",
};

const APPT_BADGE: Record<AppointmentStatus, string> = {
  booked: "badge-blue",
  checked_in: "badge-blue",
  in_progress: "badge-orange",
  completed: "badge-green",
  cancelled: "badge-red",
  no_show: "badge-red",
};

export function StatusBadge({
  status,
  kind,
}: {
  status: string;
  kind: "invoice" | "appointment";
}) {
  const cls =
    kind === "invoice"
      ? INVOICE_BADGE[status as InvoiceStatus]
      : APPT_BADGE[status as AppointmentStatus];
  return (
    <span className={`badge ${cls ?? "badge-gray"}`}>
      <span className="badge-dot" />
      {titleCase(status)}
    </span>
  );
}

export function Avatar({ initials, size = 34 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "var(--accent-soft)",
        color: "var(--accent)",
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
