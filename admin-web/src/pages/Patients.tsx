import { useEffect, useMemo, useState } from "react";
import { patientsApi } from "../api/endpoints";
import type { Patient, PatientType } from "../api/types";
import { ApiError } from "../api/client";
import { Avatar, EmptyState, Modal, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import { IconPlus, IconSearch, IconUser } from "../components/icons";
import { initials } from "../lib/format";

export default function Patients() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Patient | null>(null);

  async function load() {
    setLoading(true);
    try {
      setPatients(await patientsApi.list());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q),
    );
  }, [patients, query]);

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Internal and outside patients."
        action={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <IconPlus width={17} height={17} /> New patient
          </button>
        }
      />

      <div className="rise" style={{ position: "relative", marginBottom: 16, maxWidth: 380 }}>
        <IconSearch
          width={17}
          height={17}
          style={{ position: "absolute", left: 13, top: 12, color: "var(--text-3)" }}
        />
        <input
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Search name, MRN or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <Spinner label="Loading patients" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconUser width={24} height={24} />}
            title={query ? "No matches" : "No patients yet"}
            hint={query ? "Try a different search." : "Register your first patient to get started."}
            action={
              !query && (
                <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                  <IconPlus width={17} height={17} /> New patient
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="card rise" style={{ overflow: "hidden", animationDelay: "60ms" }}>
          <div style={{ padding: "18px 6px 4px" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>MRN</th>
                  <th>Type</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="row-click" onClick={() => setDetail(p)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <Avatar initials={initials(p.full_name)} />
                        <span style={{ fontWeight: 500 }}>{p.full_name}</span>
                      </div>
                    </td>
                    <td className="mono muted">{p.mrn}</td>
                    <td>
                      <span className={`badge ${p.patient_type === "internal" ? "badge-blue" : "badge-gray"}`}>
                        {p.patient_type === "internal" ? "Internal" : "Outside"}
                      </span>
                    </td>
                    <td className="muted">{p.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PatientFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          load();
        }}
      />
      <PatientDetailModal
        patient={detail}
        onClose={() => setDetail(null)}
        onSaved={() => {
          setDetail(null);
          load();
        }}
      />
    </div>
  );
}

const EMPTY = {
  full_name: "",
  patient_type: "outside" as PatientType,
  gender: "",
  phone: "",
  address: "",
  blood_group: "",
  allergies: "",
};

function PatientFormModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [v, setV] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setV({ ...EMPTY });
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await patientsApi.create({
        full_name: v.full_name,
        patient_type: v.patient_type,
        gender: (v.gender || null) as Patient["gender"],
        phone: v.phone || null,
        address: v.address || null,
        blood_group: v.blood_group || null,
        allergies: v.allergies || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New patient" width={520}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Full name</label>
          <input className="input" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} required autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">Patient type</label>
            <select className="select" value={v.patient_type} onChange={(e) => setV({ ...v, patient_type: e.target.value as PatientType })}>
              <option value="outside">Outside</option>
              <option value="internal">Internal</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Gender</label>
            <select className="select" value={v.gender} onChange={(e) => setV({ ...v, gender: e.target.value })}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">Phone</label>
            <input className="input" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Blood group</label>
            <input className="input" placeholder="O+" value={v.blood_group} onChange={(e) => setV({ ...v, blood_group: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label className="label">Address</label>
          <input className="input" value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
        </div>
        <div className="field">
          <label className="label">Allergies (optional)</label>
          <textarea className="input" value={v.allergies} onChange={(e) => setV({ ...v, allergies: e.target.value })} />
        </div>
        {error && (
          <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Saving…" : "Register patient"}
        </button>
      </form>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="muted tiny">{label}</span>
      <span style={{ fontWeight: 500, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

function PatientDetailModal({
  patient,
  onClose,
}: {
  patient: Patient | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!patient) return null;
  return (
    <Modal open={!!patient} onClose={onClose} title={patient.full_name} width={460}>
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 8 }}>
        <Avatar initials={initials(patient.full_name)} size={46} />
        <div>
          <div className="mono muted">{patient.mrn}</div>
          <span className={`badge ${patient.patient_type === "internal" ? "badge-blue" : "badge-gray"}`} style={{ marginTop: 4 }}>
            {patient.patient_type === "internal" ? "Internal" : "Outside"}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Row label="Phone" value={patient.phone} />
        <Row label="Gender" value={patient.gender} />
        <Row label="Blood group" value={patient.blood_group} />
        <Row label="Address" value={patient.address} />
        <Row label="Allergies" value={patient.allergies} />
      </div>
    </Modal>
  );
}
