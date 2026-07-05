const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

const TOKEN_KEY = "bmw.token";
const HOSPITAL_KEY = "bmw.hospital";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const hospitalStore = {
  get: (): number | null => {
    const v = localStorage.getItem(HOSPITAL_KEY);
    return v ? Number(v) : null;
  },
  set: (id: number) => localStorage.setItem(HOSPITAL_KEY, String(id)),
  clear: () => localStorage.removeItem(HOSPITAL_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Options {
  method?: string;
  body?: unknown;
  hospitalId?: number | null;
  form?: Record<string, string>;
}

/** Callback invoked on any 401 so the app can log the user out. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const hospitalId = opts.hospitalId ?? hospitalStore.get();
  if (hospitalId) headers["X-Hospital-Id"] = String(hospitalId);

  let body: BodyInit | undefined;
  if (opts.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.form).toString();
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(API_BASE + path, {
    method: opts.method ?? "GET",
    headers,
    body,
  });

  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
      else if (Array.isArray(data?.detail))
        detail = data.detail.map((d: { msg: string }) => d.msg).join(", ");
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Fetch a file with auth headers and trigger a browser download. */
export async function download(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const hospitalId = hospitalStore.get();
  if (hospitalId) headers["X-Hospital-Id"] = String(hospitalId);

  const res = await fetch(API_BASE + path, { headers });
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
