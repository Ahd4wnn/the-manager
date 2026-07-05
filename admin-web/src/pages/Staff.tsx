import { useEffect, useState } from "react";
import { usersApi } from "../api/endpoints";
import type { Role, UserWithRole } from "../api/types";
import { ApiError } from "../api/client";
import { useApp } from "../context/AppContext";
import { Avatar, EmptyState, Modal, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";
import { IconPlus, IconUsers } from "../components/icons";
import { initials, titleCase } from "../lib/format";

const ROLE_BADGE: Record<Role, string> = {
  admin: "badge-blue",
  owner: "badge-blue",
  manager: "badge-green",
  staff: "badge-gray",
  doctor: "badge-orange",
};

export default function Staff() {
  const { role } = useApp();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await usersApi.listStaff());
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
        title="Staff"
        subtitle="People who can access this hospital."
        action={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <IconPlus width={17} height={17} /> Add person
          </button>
        }
      />

      {loading ? (
        <Spinner label="Loading staff" />
      ) : users.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconUsers width={24} height={24} />}
            title="No staff yet"
            hint="Add managers, reception staff or doctors to this hospital."
            action={
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                <IconPlus width={17} height={17} /> Add person
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
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <Avatar initials={initials(u.full_name)} />
                        <span style={{ fontWeight: 500 }}>{u.full_name}</span>
                      </div>
                    </td>
                    <td className="mono muted">{u.phone}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{titleCase(u.role)}</span></td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-green"><span className="badge-dot" />Active</span>
                      ) : (
                        <span className="badge badge-gray">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddPersonModal
        open={createOpen}
        canAddManager={role === "owner" || role === "admin"}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </div>
  );
}

function AddPersonModal({
  open,
  canAddManager,
  onClose,
  onDone,
}: {
  open: boolean;
  canAddManager: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [v, setV] = useState({ full_name: "", phone: "", password: "", role: "staff" as Role });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setV({ full_name: "", phone: "", password: "", role: "staff" });
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await usersApi.createStaff({
        full_name: v.full_name,
        phone: v.phone,
        password: v.password,
        role: v.role,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add person">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Full name</label>
          <input className="input" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} required autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="label">Phone (login)</label>
            <input className="input" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} required />
          </div>
          <div className="field">
            <label className="label">Role</label>
            <select className="select" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })}>
              <option value="staff">Staff</option>
              <option value="doctor">Doctor</option>
              {canAddManager && <option value="manager">Manager</option>}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label">Temporary password</label>
          <input className="input" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} required minLength={6} />
        </div>
        {error && <div className="tiny" style={{ color: "var(--red)", background: "var(--red-soft)", padding: "9px 12px", borderRadius: "var(--r-sm)" }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Adding…" : "Add person"}</button>
      </form>
    </Modal>
  );
}
