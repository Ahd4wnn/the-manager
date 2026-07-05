import { useState } from "react";
import { useApp } from "../context/AppContext";
import { ApiError } from "../api/client";
import { IconHeart } from "../components/icons";

export default function Login() {
  const { login } = useApp();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(0,113,227,0.08), transparent 60%), var(--canvas)",
      }}
    >
      <div className="rise" style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 15,
              background: "linear-gradient(160deg, #0a84ff, #0060c0)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              margin: "0 auto 16px",
              boxShadow: "var(--shadow)",
            }}
          >
            <IconHeart width={26} height={26} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>
            The Manager
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Sign in to your console
          </p>
        </div>

        <form onSubmit={submit} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label className="label">Phone number</label>
            <input
              className="input"
              inputMode="numeric"
              autoFocus
              placeholder="9999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              className="tiny"
              style={{
                color: "var(--red)",
                background: "var(--red-soft)",
                padding: "9px 12px",
                borderRadius: "var(--r-sm)",
              }}
            >
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.35)" }} /> : "Sign in"}
          </button>
        </form>

        <p className="tiny muted" style={{ textAlign: "center", marginTop: 18 }}>
          Hospital management, made calm.
        </p>
      </div>
    </div>
  );
}
