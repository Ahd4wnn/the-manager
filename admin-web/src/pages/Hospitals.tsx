import { useEffect, useState } from "react";
import { hospitalsApi, usersApi } from "../api/endpoints";
import type { Hospital } from "../api/types";
import { ApiError } from "../api/client";
import { EmptyState, Modal, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import { IconBuilding, IconPlus } from "../components/icons";

export default function Hospitals() {
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [ownerFor, setOwnerFor] = useState<Hospital | null>(null);
  const [editing, setEditing] = useState<Hospital | null>(null);

  async function load() {
    setLoading(true);
    try {
      setHospitals(await hospitalsApi.list());
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
        title="Hospitals"
        subtitle="Every clinic on the platform."
        action={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <IconPlus width={17} height={17} /> New hospital
          </button>
        }
      />

      {loading ? (
        <Spinner label="Loading hospitals" />
      ) : hospitals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconBuilding width={24} height={24} />}
            title="No hospitals yet"
            hint="Create your first hospital, then attach an owner to run it."
            action={
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                <IconPlus width={17} height={17} /> New hospital
              </button>
            }
          />
        </div>
      ) : (
        <div className="card rise" style={{ overflow: "hidden", animationDelay: "60ms" }}>
          <div style={{ padding: "18px 6px 4px" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>UPI</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 500 }}>{h.name}</td>
                    <td className="mono muted">{h.code}</td>
                    <td className="muted">{[h.city, h.state].filter(Boolean).join(", ") || "—"}</td>
                    <td>
                      {h.upi_vpa ? (
                        <span className="mono tiny">{h.upi_vpa}</span>
                      ) : (
                        <span className="badge badge-orange">Not set</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setOwnerFor(h)}>
                        Add owner
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(h)}>
                        Settings
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateHospitalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          load();
        }}
      />
      <AddOwnerModal hospital={ownerFor} onClose={() => setOwnerFor(null)} />
      <EditHospitalModal
        hospital={editing}
        onClose={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

function useForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = (k: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  return { values, set, setValues };
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      className="tiny"
      style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}
    >
      {error}
    </div>
  );
}

function CreateHospitalModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { values, set } = useForm({ name: "", code: "", city: "", state: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await hospitalsApi.create({
        name: values.name,
        code: values.code.toUpperCase(),
        city: values.city || null,
        state: values.state || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New hospital">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Hospital name</label>
          <input className="input" value={values.name} onChange={set("name")} required autoFocus />
        </div>
        <div className="field">
          <label className="label">Short code · used for patient & invoice numbers</label>
          <input
            className="input mono"
            placeholder="CITY01"
            value={values.code}
            onChange={set("code")}
            required
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">City</label>
            <input className="input" value={values.city} onChange={set("city")} />
          </div>
          <div className="field">
            <label className="label">State</label>
            <input className="input" value={values.state} onChange={set("state")} />
          </div>
        </div>
        <ErrorNote error={error} />
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating…" : "Create hospital"}
        </button>
      </form>
    </Modal>
  );
}

function AddOwnerModal({ hospital, onClose }: { hospital: Hospital | null; onClose: () => void }) {
  const { values, set, setValues } = useForm({ full_name: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (hospital) {
      setValues({ full_name: "", phone: "", password: "" });
      setError(null);
      setDone(false);
    }
  }, [hospital, setValues]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hospital) return;
    setBusy(true);
    setError(null);
    try {
      await usersApi.createOwner({
        full_name: values.full_name,
        phone: values.phone,
        password: values.password,
        hospital_id: hospital.id,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!hospital} onClose={onClose} title={`Add owner · ${hospital?.name ?? ""}`}>
      {done ? (
        <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
          <p>
            Owner <b>{values.full_name}</b> can now sign in with phone{" "}
            <span className="mono">{values.phone}</span>.
          </p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="label">Full name</label>
            <input className="input" value={values.full_name} onChange={set("full_name")} required autoFocus />
          </div>
          <div className="field">
            <label className="label">Phone (login)</label>
            <input className="input" value={values.phone} onChange={set("phone")} required />
          </div>
          <div className="field">
            <label className="label">Temporary password</label>
            <input className="input" value={values.password} onChange={set("password")} required minLength={6} />
          </div>
          <ErrorNote error={error} />
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Creating…" : "Create owner"}
          </button>
        </form>
      )}
    </Modal>
  );
}

function EditHospitalModal({
  hospital,
  onClose,
  onDone,
}: {
  hospital: Hospital | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { values, set, setValues } = useForm({
    upi_vpa: "",
    upi_payee_name: "",
    gstin: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hospital) {
      setValues({
        upi_vpa: hospital.upi_vpa ?? "",
        upi_payee_name: hospital.upi_payee_name ?? "",
        gstin: hospital.gstin ?? "",
        phone: hospital.phone ?? "",
      });
      setError(null);
    }
  }, [hospital, setValues]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hospital) return;
    setBusy(true);
    setError(null);
    try {
      await hospitalsApi.update(hospital.id, {
        upi_vpa: values.upi_vpa || null,
        upi_payee_name: values.upi_payee_name || null,
        gstin: values.gstin || null,
        phone: values.phone || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!hospital} onClose={onClose} title={`Settings · ${hospital?.name ?? ""}`}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">UPI ID (VPA) · for payment QR codes</label>
          <input className="input mono" placeholder="clinic@okhdfc" value={values.upi_vpa} onChange={set("upi_vpa")} />
        </div>
        <div className="field">
          <label className="label">UPI payee name</label>
          <input className="input" value={values.upi_payee_name} onChange={set("upi_payee_name")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">GSTIN</label>
            <input className="input mono" value={values.gstin} onChange={set("gstin")} />
          </div>
          <div className="field">
            <label className="label">Phone</label>
            <input className="input" value={values.phone} onChange={set("phone")} />
          </div>
        </div>
        <ErrorNote error={error} />
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </Modal>
  );
}
