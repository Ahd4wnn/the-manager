import { useEffect, useState } from "react";
import { medicinesApi } from "../api/endpoints";
import type { Medicine, MedicineLogAction } from "../api/types";
import { ApiError } from "../api/client";
import { useApp, canManage } from "../context/AppContext";
import { EmptyState, Modal, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import { IconPlus, IconStethoscope } from "../components/icons";
import { titleCase } from "../lib/format";

const ACTIONS: { value: MedicineLogAction; label: string }[] = [
  { value: "restock", label: "Restock (+)" },
  { value: "open_packet", label: "Open packet" },
  { value: "use", label: "Use (−)" },
  { value: "adjust", label: "Adjust (±)" },
];

export default function Medicines() {
  const { role } = useApp();
  const manage = canManage(role);
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [logFor, setLogFor] = useState<Medicine | null>(null);

  async function load() {
    setLoading(true);
    try {
      setMeds(await medicinesApi.list());
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
        title="Medicines"
        subtitle="Inventory and stock tracking."
        action={
          manage && (
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <IconPlus width={17} height={17} /> New medicine
            </button>
          )
        }
      />

      {loading ? (
        <Spinner label="Loading inventory" />
      ) : meds.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconStethoscope width={24} height={24} />}
            title="No medicines yet"
            hint={manage ? "Add medicines to start tracking stock." : "Ask a manager to set up the inventory."}
            action={manage && <button className="btn btn-primary" onClick={() => setAddOpen(true)}><IconPlus width={17} height={17} /> New medicine</button>}
          />
        </div>
      ) : (
        <div className="card rise" style={{ overflow: "hidden", animationDelay: "60ms" }}>
          <div style={{ padding: "18px 6px 4px" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Unit</th>
                  <th style={{ textAlign: "right" }}>In stock</th>
                  <th style={{ textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m) => {
                  const low = Number(m.current_stock) <= Number(m.low_stock_threshold) && Number(m.low_stock_threshold) > 0;
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td className="muted">{m.unit}{m.pack_size ? ` · ${m.pack_size}/pack` : ""}</td>
                      <td className="mono" style={{ textAlign: "right" }}>
                        {Number(m.current_stock)}
                        {low && <span className="badge badge-orange" style={{ marginLeft: 8 }}>Low</span>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setLogFor(m)}>Log stock</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddMedicineModal open={addOpen} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); }} />
      <LogModal medicine={logFor} onClose={() => setLogFor(null)} onDone={() => { setLogFor(null); load(); }} />
    </div>
  );
}

function AddMedicineModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ name: "", unit: "tablet", pack_size: "", current_stock: "", low_stock_threshold: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setV({ name: "", unit: "tablet", pack_size: "", current_stock: "", low_stock_threshold: "" });
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await medicinesApi.create({
        name: v.name,
        unit: v.unit || "unit",
        pack_size: v.pack_size ? Number(v.pack_size) : null,
        current_stock: v.current_stock || "0",
        low_stock_threshold: v.low_stock_threshold || "0",
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New medicine">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Name</label>
          <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">Unit</label>
            <input className="input" placeholder="tablet, ml…" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Pack size</label>
            <input className="input mono" inputMode="numeric" value={v.pack_size} onChange={(e) => setV({ ...v, pack_size: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">Opening stock</label>
            <input className="input mono" inputMode="decimal" value={v.current_stock} onChange={(e) => setV({ ...v, current_stock: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Low-stock alert</label>
            <input className="input mono" inputMode="decimal" value={v.low_stock_threshold} onChange={(e) => setV({ ...v, low_stock_threshold: e.target.value })} />
          </div>
        </div>
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Saving…" : "Add medicine"}</button>
      </form>
    </Modal>
  );
}

function LogModal({ medicine, onClose, onDone }: { medicine: Medicine | null; onClose: () => void; onDone: () => void }) {
  const [action, setAction] = useState<MedicineLogAction>("restock");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (medicine) {
      setAction("restock");
      setQuantity("");
      setNote("");
      setError(null);
    }
  }, [medicine]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!medicine) return;
    setBusy(true);
    setError(null);
    try {
      await medicinesApi.addLog({
        medicine_id: medicine.id,
        action,
        quantity: quantity || "0",
        note: note || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!medicine} onClose={onClose} title={`Log stock · ${medicine?.name ?? ""}`}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Action</label>
          <select className="select" value={action} onChange={(e) => setAction(e.target.value as MedicineLogAction)}>
            {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        {action !== "open_packet" && (
          <div className="field">
            <label className="label">Quantity ({medicine?.unit})</label>
            <input className="input mono" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
          </div>
        )}
        <div className="field">
          <label className="label">Note (optional)</label>
          <input className="input" placeholder={action === "open_packet" ? "Opened a new strip" : ""} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Saving…" : `Record ${titleCase(action)}`}</button>
      </form>
    </Modal>
  );
}
