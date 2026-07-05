import { useEffect, useState } from "react";
import { treatmentsApi } from "../api/endpoints";
import type { Patient, Treatment } from "../api/types";
import { ApiError } from "../api/client";
import { useApp, canManage } from "../context/AppContext";
import { EmptyState, Modal, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import PatientPicker from "../components/PatientPicker";
import { IconPlus, IconStethoscope } from "../components/icons";
import { inr } from "../lib/format";

export default function Treatments() {
  const { role } = useApp();
  const manage = canManage(role);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Treatment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCatalog(await treatmentsApi.listCatalog());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Treatments"
        subtitle="Service catalog and what's been given to patients."
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setRecordOpen(true)}>
              Record for patient
            </button>
            {manage && (
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                <IconPlus width={17} height={17} /> New service
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <Spinner label="Loading catalog" />
      ) : catalog.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconStethoscope width={24} height={24} />}
            title="No services yet"
            hint={manage ? "Add the treatments and services your clinic offers." : "Ask a manager to set up the catalog."}
            action={
              manage && (
                <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                  <IconPlus width={17} height={17} /> New service
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
                  <th>Service</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                  <th style={{ textAlign: "right" }}>GST</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>
                      {t.name}
                      {!t.is_active && <span className="badge badge-gray" style={{ marginLeft: 8 }}>Inactive</span>}
                    </td>
                    <td className="muted">{t.category || "—"}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{inr(t.default_price)}</td>
                    <td className="mono muted" style={{ textAlign: "right" }}>{Number(t.gst_rate)}%</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ServiceModal open={createOpen} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); }} />
      <RecordModal open={recordOpen} catalog={catalog} onClose={() => setRecordOpen(false)} />
    </div>
  );
}

function ServiceModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ name: "", category: "", default_price: "", gst_rate: "18" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setV({ name: "", category: "", default_price: "", gst_rate: "18" });
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await treatmentsApi.createCatalog({
        name: v.name,
        category: v.category || null,
        default_price: v.default_price || "0",
        gst_rate: v.gst_rate || "0",
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New service">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Service name</label>
          <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required autoFocus />
        </div>
        <div className="field">
          <label className="label">Category</label>
          <input className="input" placeholder="OPD, Lab, Procedure…" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">Price (₹)</label>
            <input className="input mono" inputMode="decimal" value={v.default_price} onChange={(e) => setV({ ...v, default_price: e.target.value })} required />
          </div>
          <div className="field">
            <label className="label">GST %</label>
            <select className="select" value={v.gst_rate} onChange={(e) => setV({ ...v, gst_rate: e.target.value })}>
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
        </div>
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Saving…" : "Add service"}</button>
      </form>
    </Modal>
  );
}

function RecordModal({ open, catalog, onClose }: { open: boolean; catalog: Treatment[]; onClose: () => void }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [treatmentId, setTreatmentId] = useState("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setPatient(null);
      setTreatmentId("");
      setQty("1");
      setError(null);
      setDone(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient || !treatmentId) {
      setError("Pick a patient and a service.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await treatmentsApi.recordEncounter({
        patient_id: patient.id,
        treatment_id: Number(treatmentId),
        quantity: Number(qty) || 1,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record treatment">
      {done ? (
        <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
          <p>Recorded for <b>{patient?.full_name}</b>. It will appear on their next invoice.</p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={onClose}>Done</button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="label">Patient</label>
            <PatientPicker value={patient} onChange={setPatient} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div className="field">
              <label className="label">Service</label>
              <select className="select" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
                <option value="">Select…</option>
                {catalog.filter((t) => t.is_active).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} · {inr(t.default_price)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Qty</label>
              <input className="input mono" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>
          {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Recording…" : "Record treatment"}</button>
        </form>
      )}
    </Modal>
  );
}
