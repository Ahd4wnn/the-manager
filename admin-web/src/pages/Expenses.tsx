import { useEffect, useState } from "react";
import { expensesApi } from "../api/endpoints";
import type { Expense } from "../api/types";
import { ApiError } from "../api/client";
import { EmptyState, Modal, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import { IconPlus, IconWallet } from "../components/icons";
import { formatDate, inr } from "../lib/format";

const CATEGORIES = ["Salary", "Supplies", "Rent", "Utilities", "Equipment", "Maintenance", "Marketing", "Other"];

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setExpenses(await expensesApi.list());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Day-to-day operating costs."
        action={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <IconPlus width={17} height={17} /> Add expense
          </button>
        }
      />

      {loading ? (
        <Spinner label="Loading expenses" />
      ) : expenses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconWallet width={24} height={24} />}
            title="No expenses yet"
            hint="Record daily costs like salaries, supplies and rent."
            action={
              <button className="btn btn-primary" onClick={() => setOpen(true)}>
                <IconPlus width={17} height={17} /> Add expense
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
                  <th>Date</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="muted tiny">{formatDate(e.spent_on)}</td>
                    <td><span className="badge badge-gray">{e.category}</span></td>
                    <td className="muted">{e.note || "—"}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 500 }}>{inr(e.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ fontWeight: 600 }}>Total</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{inr(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddExpenseModal open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </div>
  );
}

function AddExpenseModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({ category: "Supplies", amount: "", spent_on: today, note: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setV({ category: "Supplies", amount: "", spent_on: today, note: "" });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await expensesApi.create({ category: v.category, amount: v.amount || "0", spent_on: v.spent_on, note: v.note || null });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add expense">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">Category</label>
            <select className="select" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Amount (₹)</label>
            <input className="input mono" inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} required autoFocus />
          </div>
        </div>
        <div className="field">
          <label className="label">Date</label>
          <input className="input" type="date" value={v.spent_on} onChange={(e) => setV({ ...v, spent_on: e.target.value })} required />
        </div>
        <div className="field">
          <label className="label">Note (optional)</label>
          <input className="input" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
        </div>
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Saving…" : "Add expense"}</button>
      </form>
    </Modal>
  );
}
