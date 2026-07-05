import { api } from "./client";
import type {
  Appointment,
  Hospital,
  Invoice,
  Me,
  Patient,
  PaymentMethod,
  Role,
  Treatment,
  UpiQr,
  UserWithRole,
} from "./types";

export const authApi = {
  login: (phone: string, password: string) =>
    api<{ access_token: string }>("/auth/login", {
      method: "POST",
      form: { username: phone, password },
    }),
  me: () => api<Me>("/auth/me"),
};

export const hospitalsApi = {
  list: () => api<Hospital[]>("/hospitals"),
  create: (data: Partial<Hospital>) =>
    api<Hospital>("/hospitals", { method: "POST", body: data }),
  update: (id: number, data: Partial<Hospital>) =>
    api<Hospital>(`/hospitals/${id}`, { method: "PATCH", body: data }),
};

export const usersApi = {
  listStaff: () => api<UserWithRole[]>("/users"),
  createOwner: (data: {
    phone: string;
    full_name: string;
    password: string;
    email?: string | null;
    hospital_id?: number | null;
  }) => api<unknown>("/users/owners", { method: "POST", body: data }),
  createStaff: (data: {
    phone: string;
    full_name: string;
    password: string;
    email?: string | null;
    role: Role;
  }) => api<UserWithRole>("/users", { method: "POST", body: data }),
};

export const patientsApi = {
  list: (q?: string) =>
    api<Patient[]>(`/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (id: number) => api<Patient>(`/patients/${id}`),
  create: (data: Partial<Patient>) =>
    api<Patient>("/patients", { method: "POST", body: data }),
  update: (id: number, data: Partial<Patient>) =>
    api<Patient>(`/patients/${id}`, { method: "PATCH", body: data }),
};

export const appointmentsApi = {
  list: (params?: { patient_id?: number }) => {
    const q = params?.patient_id ? `?patient_id=${params.patient_id}` : "";
    return api<Appointment[]>(`/appointments${q}`);
  },
  create: (data: Partial<Appointment>) =>
    api<Appointment>("/appointments", { method: "POST", body: data }),
  update: (id: number, data: Partial<Appointment>) =>
    api<Appointment>(`/appointments/${id}`, { method: "PATCH", body: data }),
};

export const treatmentsApi = {
  listCatalog: () => api<Treatment[]>("/treatments/catalog?active_only=false"),
  createCatalog: (data: Partial<Treatment>) =>
    api<Treatment>("/treatments/catalog", { method: "POST", body: data }),
  updateCatalog: (id: number, data: Partial<Treatment>) =>
    api<Treatment>(`/treatments/catalog/${id}`, { method: "PATCH", body: data }),
  recordEncounter: (data: {
    patient_id: number;
    treatment_id?: number;
    name?: string;
    quantity?: number;
    unit_price?: string;
    gst_rate?: string;
  }) => api<unknown>("/treatments/encounters", { method: "POST", body: data }),
};

export const billingApi = {
  list: (params?: { patient_id?: number }) => {
    const q = params?.patient_id ? `?patient_id=${params.patient_id}` : "";
    return api<Invoice[]>(`/billing${q}`);
  },
  get: (id: number) => api<Invoice>(`/billing/${id}`),
  create: (data: {
    patient_id: number;
    pull_encounter_treatments?: boolean;
    discount_amount?: string;
    notes?: string;
    items?: {
      description: string;
      quantity: number;
      unit_price: string;
      gst_rate: string;
    }[];
  }) => api<Invoice>("/billing", { method: "POST", body: data }),
  issue: (id: number) => api<Invoice>(`/billing/${id}/issue`, { method: "POST" }),
  addPayment: (
    id: number,
    data: { amount: string; method: PaymentMethod; reference?: string },
  ) =>
    api<unknown>(`/billing/${id}/payments`, { method: "POST", body: data }),
  upiQr: (id: number) => api<UpiQr>(`/billing/${id}/upi-qr`),
};
