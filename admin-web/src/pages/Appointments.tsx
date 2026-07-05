import { useEffect, useMemo, useState } from "react";
import { appointmentsApi, patientsApi } from "../api/endpoints";
import type { Appointment, AppointmentStatus, Patient } from "../api/types";
import { ApiError } from "../api/client";
import { EmptyState, Modal, Spinner, StatusBadge } from "../components/ui";
import PageHeader from "../components/PageHeader";
import PatientPicker from "../components/PatientPicker";
import { IconCalendar, IconPlus } from "../components/icons";
import { formatDateTime } from "../lib/format";

const NEXT: Partial<Record<AppointmentStatus, { to: AppointmentStatus; label: string }>> = {
  booked: { to: "checked_in", label: "Check in" },
  checked_in: { to: "in_progress", label: "Start" },
  in_progress: { to: "completed", label: "Complete" },
};

export default function Appointments() {
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Record<number, Patient>>({});
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [a, ps] = await Promise.all([appointmentsApi.list(), patientsApi.list()]);
      setAppts(a);
      setPatients(Object.fromEntries(ps.map((p) => [p.id, p])));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(
    () => [...appts].sort((a, b) => +new Date(a.scheduled_start) - +new Date(b.scheduled_start)),
    [appts],
  );

  async function advance(a: Appointment, to: AppointmentStatus) {
    await appointmentsApi.update(a.id, { status: to });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Bookings and walk-ins."
        action={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <IconPlus width={17} height={17} /> New booking
          </button>
        }
      />

      {loading ? (
        <Spinner label="Loading appointments" />
      ) : sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconCalendar width={24} height={24} />}
            title="No appointments"
            hint="Book a slot for a patient to see it here."
            action={
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                <IconPlus width={17} height={17} /> New booking
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
                  <th>When</th>
                  <th>Patient</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => {
                  const next = NEXT[a.status];
                  return (
                    <tr key={a.id}>
                      <td className="mono tiny">{formatDateTime(a.scheduled_start)}</td>
                      <td style={{ fontWeight: 500 }}>{patients[a.patient_id]?.full_name ?? `#${a.patient_id}`}</td>
                      <td className="muted">{a.reason || "—"}</td>
                      <td><StatusBadge status={a.status} kind="appointment" /></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {next && (
                          <button className="btn btn-secondary btn-sm" onClick={() => advance(a, next.to)}>
                            {next.label}
                          </button>
                        )}
                        {(a.status === "booked" || a.status === "checked_in") && (
                          <button className="btn btn-ghost btn-sm" onClick={() => advance(a, "cancelled")}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BookingModal open={createOpen} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function defaultSlot(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function BookingModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [when, setWhen] = useState(defaultSlot());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPatient(null);
      setWhen(defaultSlot());
      setReason("");
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) {
      setError("Pick a patient.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await appointmentsApi.create({
        patient_id: patient.id,
        scheduled_start: new Date(when).toISOString(),
        reason: reason || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New booking">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Patient</label>
          <PatientPicker value={patient} onChange={setPatient} />
        </div>
        <div className="field">
          <label className="label">Date & time</label>
          <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">Reason (optional)</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Follow-up, consultation…" />
        </div>
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Booking…" : "Book appointment"}</button>
      </form>
    </Modal>
  );
}
