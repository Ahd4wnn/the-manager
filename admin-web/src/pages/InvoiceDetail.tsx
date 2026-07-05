import { useCallback, useEffect, useState } from "react";
import { billingApi } from "../api/endpoints";
import type { Invoice, PaymentMethod, UpiQr } from "../api/types";
import { ApiError, download } from "../api/client";
import { Modal, Spinner, StatusBadge } from "../components/ui";
import { IconReceipt, IconWallet } from "../components/icons";
import { inr, titleCase } from "../lib/format";

export default function InvoiceDetail({
  invoiceId,
  patientName,
  onClose,
  onChanged,
}: {
  invoiceId: number | null;
  patientName?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<UpiQr | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      setInvoice(await billingApi.get(invoiceId));
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    setInvoice(null);
    setQr(null);
    setQrError(null);
    if (invoiceId) load();
  }, [invoiceId, load]);

  async function showQr() {
    if (!invoiceId) return;
    setQrError(null);
    try {
      setQr(await billingApi.upiQr(invoiceId));
    } catch (err) {
      setQrError(err instanceof ApiError ? err.message : "Failed to build QR");
    }
  }

  async function issue() {
    if (!invoiceId) return;
    await billingApi.issue(invoiceId);
    await load();
    onChanged();
  }

  const open = invoiceId !== null;

  return (
    <Modal open={open} onClose={onClose} title={invoice?.invoice_number ?? "Invoice"} width={560}>
      {loading || !invoice ? (
        <Spinner />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 500 }}>{patientName ?? `Patient #${invoice.patient_id}`}</div>
              <div className="tiny muted mono">{invoice.invoice_number}</div>
            </div>
            <StatusBadge status={invoice.status} kind="invoice" />
          </div>

          {/* Line items */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
            {invoice.items.map((it) => (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{it.description}</div>
                  <div className="tiny muted">
                    {it.quantity} × {inr(it.unit_price)} · GST {Number(it.gst_rate)}%
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 500 }}>{inr(it.line_total)}</div>
              </div>
            ))}

            <div style={{ padding: "12px 14px", background: "var(--surface-2)" }}>
              <Line label="Subtotal" value={inr(invoice.subtotal)} />
              {Number(invoice.discount_amount) > 0 && <Line label="Discount" value={`− ${inr(invoice.discount_amount)}`} />}
              <Line label="GST" value={inr(invoice.tax_amount)} />
              <Line label="Total" value={inr(invoice.total_amount)} strong />
              <Line label="Paid" value={inr(invoice.amount_paid)} />
              <Line
                label="Balance due"
                value={inr(invoice.balance_due)}
                strong
                tone={Number(invoice.balance_due) > 0 ? "orange" : "green"}
              />
            </div>
          </div>

          {/* Payments */}
          {invoice.payments.length > 0 && (
            <div>
              <div className="section-title" style={{ marginBottom: 8 }}>Payments</div>
              {invoice.payments.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="tiny muted">{titleCase(p.method)}{p.reference ? ` · ${p.reference}` : ""}</span>
                  <span className="mono tiny">{inr(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* UPI QR */}
          {qr && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <img
                src={`data:image/png;base64,${qr.qr_png_base64}`}
                alt="UPI QR"
                width={188}
                height={188}
                style={{ borderRadius: "var(--r)", border: "1px solid var(--border)" }}
              />
              <div className="tiny muted" style={{ marginTop: 8 }}>
                Scan to pay {inr(qr.amount)} · share this screen on WhatsApp
              </div>
            </div>
          )}
          {qrError && <div className="tiny" style={{ color: "var(--red)" }}>{qrError}</div>}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary"
              onClick={() => download(`/billing/${invoice.id}/pdf`, `${invoice.invoice_number}.pdf`)}
            >
              <IconReceipt width={16} height={16} /> PDF
            </button>
            {invoice.status === "draft" && (
              <button className="btn btn-secondary" onClick={issue}>Issue invoice</button>
            )}
            {Number(invoice.balance_due) > 0 && invoice.status !== "cancelled" && (
              <>
                <button className="btn btn-secondary" onClick={showQr}>
                  <IconWallet width={17} height={17} /> UPI QR
                </button>
                <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setPayOpen(true)}>
                  Record payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <PaymentModal
        invoiceId={payOpen ? invoiceId : null}
        maxAmount={invoice?.balance_due ?? "0"}
        onClose={() => setPayOpen(false)}
        onDone={() => {
          setPayOpen(false);
          setQr(null);
          load();
          onChanged();
        }}
      />
    </Modal>
  );
}

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "orange" | "green";
}) {
  const color = tone === "orange" ? "var(--orange)" : tone === "green" ? "var(--green)" : undefined;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span className={strong ? "" : "muted tiny"} style={{ fontWeight: strong ? 600 : 400, fontSize: strong ? 14 : undefined }}>
        {label}
      </span>
      <span className="mono" style={{ fontWeight: strong ? 600 : 400, color }}>{value}</span>
    </div>
  );
}

function PaymentModal({
  invoiceId,
  maxAmount,
  onClose,
  onDone,
}: {
  invoiceId: number | null;
  maxAmount: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      setAmount(maxAmount);
      setMethod("cash");
      setReference("");
      setError(null);
    }
  }, [invoiceId, maxAmount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId) return;
    setBusy(true);
    setError(null);
    try {
      await billingApi.addPayment(invoiceId, {
        amount: amount || "0",
        method,
        reference: reference || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={invoiceId !== null} onClose={onClose} title="Record payment" width={420}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Amount (₹)</label>
          <input className="input mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label className="label">Method</label>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="insurance">Insurance</option>
            <option value="other">Other</option>
          </select>
        </div>
        {method !== "cash" && (
          <div className="field">
            <label className="label">Reference (optional)</label>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI txn / card ref" />
          </div>
        )}
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Saving…" : "Record payment"}</button>
      </form>
    </Modal>
  );
}
