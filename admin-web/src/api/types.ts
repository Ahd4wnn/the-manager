export type Role = "admin" | "owner" | "manager" | "staff" | "doctor";
export type PatientType = "internal" | "outside";
export type Gender = "male" | "female" | "other";
export type AppointmentStatus =
  | "booked"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";
export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "cancelled";
export type PaymentMethod =
  | "cash"
  | "card"
  | "upi"
  | "bank_transfer"
  | "insurance"
  | "other";

export interface MembershipInfo {
  hospital_id: number;
  hospital_name: string;
  role: Role;
}

export interface Me {
  id: number;
  phone: string;
  full_name: string;
  email: string | null;
  is_platform_admin: boolean;
  memberships: MembershipInfo[];
}

export interface Hospital {
  id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  upi_vpa: string | null;
  upi_payee_name: string | null;
  is_active: boolean;
}

export interface Patient {
  id: number;
  hospital_id: number;
  mrn: string;
  patient_type: PatientType;
  full_name: string;
  gender: Gender | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_group: string | null;
  allergies: string | null;
  medical_history: string | null;
  id_number: string | null;
  insurance_number: string | null;
}

export interface Appointment {
  id: number;
  hospital_id: number;
  patient_id: number;
  provider_id: number | null;
  scheduled_start: string;
  scheduled_end: string | null;
  status: AppointmentStatus;
  token_number: number | null;
  reason: string | null;
  notes: string | null;
}

export interface Treatment {
  id: number;
  hospital_id: number;
  name: string;
  category: string | null;
  description: string | null;
  default_price: string;
  gst_rate: string;
  hsn_sac: string | null;
  default_duration_min: number | null;
  is_active: boolean;
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: string;
  gst_rate: string;
  line_total: string;
  tax_amount: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  received_at: string;
  notes: string | null;
}

export interface Invoice {
  id: number;
  hospital_id: number;
  patient_id: number;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  issued_at: string | null;
  notes: string | null;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface UpiQr {
  invoice_number: string;
  amount: string;
  upi_uri: string;
  qr_png_base64: string;
}

export interface UserWithRole {
  id: number;
  phone: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  role: Role;
  designation: string | null;
  monthly_salary: string | null;
}

export interface Expense {
  id: number;
  hospital_id: number;
  category: string;
  amount: string;
  spent_on: string;
  note: string | null;
}

export type MedicineLogAction = "restock" | "open_packet" | "use" | "adjust";

export interface Medicine {
  id: number;
  hospital_id: number;
  name: string;
  unit: string;
  pack_size: number | null;
  current_stock: string;
  low_stock_threshold: string;
  is_active: boolean;
}

export interface MedicineLog {
  id: number;
  medicine_id: number;
  action: MedicineLogAction;
  quantity: string;
  patient_id: number | null;
  note: string | null;
  happened_at: string;
}

export interface Bucket {
  label: string;
  revenue: string;
  expenses: string;
  net: string;
}

export interface FinancialSummary {
  from_date: string;
  to_date: string;
  total_revenue: string;
  total_expenses: string;
  net: string;
  invoiced: string;
  outstanding: string;
  patients: number;
  invoices: number;
  buckets: Bucket[];
}

export interface StaffPerformance {
  user_id: number;
  full_name: string;
  role: Role;
  designation: string | null;
  patients_registered: number;
  treatments_performed: number;
  payments_collected: string;
}

export interface StaffPerformanceReport {
  from_date: string;
  to_date: string;
  staff: StaffPerformance[];
}
