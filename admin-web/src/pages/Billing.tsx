import { useEffect, useState } from "react";
import { billingApi, patientsApi } from "../api/endpoints";
import type { Invoice, Patient } from "../api/types";
import { ApiError } from "../api/client";
import { EmptyState, Modal, Spinner, StatusBadge } from "../components/ui";
import PageHeader from "../components/PageHeader";
import PatientPicker from "../components/PatientPicker";
import InvoiceDetail from "./InvoiceDetail";
import { IconPlus, IconReceipt } from "../components/icons";
import { inr } from "../lib/format";

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Record<number, Patient>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [invs, ps] = await Promise.all([billingApi.list(), patientsApi.list()]);
      setInvoices(invs);
      setPatients(Object.fromEntries(ps.map((p) => [p.id, p])));
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
        title="Billing"
        subtitle="Invoices, payments and UPI collection."
        action={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <IconPlus width={17} height={17} /> New invoice
          </button>
        }
      />

      {loading ? (
        <Spinner label="Loading invoices" />
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconReceipt width={24} height={24} />}
            title="No invoices yet"
            hint="Create an invoice — it can auto-pull a patient's recorded treatments."
            action={
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                <IconPlus width={17} height={17} /> New invoice
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
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="row-click" onClick={() => setOpenId(inv.id)}>
                    <td className="mono" style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                    <td>{patients[inv.patient_id]?.full_name ?? `#${inv.patient_id}`}</td>
                    <td><StatusBadge status={inv.status} kind="invoice" /></td>
                    <td className="mono" style={{ textAlign: "right" }}>{inr(inv.total_amount)}</td>
                    <td className="mono" style={{ textAlign: "right", color: Number(inv.balance_due) > 0 ? "var(--orange)" : "var(--text-3)" }}>
                      {inr(inv.balance_due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={(id) => {
          setCreateOpen(false);
          load();
          setOpenId(id);
        }}
      />
      <InvoiceDetail
        invoiceId={openId}
        patientName={openId ? patients[invoices.find((i) => i.id === openId)?.patient_id ?? -1]?.full_name : undefined}
        onClose={() => setOpenId(null)}
        onChanged={load}
      />
    </div>
  );
}

function CreateInvoiceModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (id: number) => void;
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [discount, setDiscount] = useState("");
  const [pull, setPull] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPatient(null);
      setDiscount("");
      setPull(true);
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
      const inv = await billingApi.create({
        patient_id: patient.id,
        pull_encounter_treatments: pull,
        discount_amount: discount || "0",
      });
      onDone(inv.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New invoice">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Patient</label>
          <PatientPicker value={patient} onChange={setPatient} />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "12px 14px",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
          }}
        >
          <input type="checkbox" checked={pull} onChange={(e) => setPull(e.target.checked)} style={{ width: 17, height: 17, accentColor: "var(--accent)" }} />
          <span>
            <div style={{ fontWeight: 500 }}>Pull recorded treatments</div>
            <div className="tiny muted">Add this patient's un-billed treatments automatically.</div>
          </span>
        </label>
        <div className="field">
          <label className="label">Discount (₹, optional)</label>
          <input className="input mono" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" />
        </div>
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Creating…" : "Create invoice"}</button>
      </form>
    </Modal>
  );
}
