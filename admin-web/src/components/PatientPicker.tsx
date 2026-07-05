import { useEffect, useMemo, useState } from "react";
import { patientsApi } from "../api/endpoints";
import type { Patient } from "../api/types";
import { Avatar } from "./ui";
import { IconSearch } from "./icons";
import { initials } from "../lib/format";

export default function PatientPicker({
  value,
  onChange,
}: {
  value: Patient | null;
  onChange: (p: Patient | null) => void;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    patientsApi.list().then(setPatients).catch(() => setPatients([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? patients.filter(
          (p) => p.full_name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q) || (p.phone ?? "").includes(q),
        )
      : patients;
    return base.slice(0, 6);
  }, [patients, query]);

  if (value) {
    return (
      <div
        className="input"
        style={{ display: "flex", alignItems: "center", gap: 11, height: 48 }}
      >
        <Avatar initials={initials(value.full_name)} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500 }}>{value.full_name}</div>
          <div className="mono tiny muted">{value.mrn}</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <IconSearch width={17} height={17} style={{ position: "absolute", left: 13, top: 12, color: "var(--text-3)" }} />
      <input
        className="input"
        style={{ paddingLeft: 38 }}
        placeholder="Search patient by name or MRN"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div
          className="card"
          style={{ position: "absolute", top: 46, left: 0, right: 0, padding: 6, zIndex: 60, boxShadow: "var(--shadow-lg)", animation: "pop 0.18s var(--ease)" }}
        >
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="menu-item"
              onMouseDown={() => {
                onChange(p);
                setOpen(false);
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar initials={initials(p.full_name)} size={26} />
                {p.full_name}
              </span>
              <span className="mono tiny muted">{p.mrn}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
