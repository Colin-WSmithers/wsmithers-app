/**
 * Hand-written types matching supabase/migrations/0001_init.sql.
 *
 * Once the Supabase project is created and the migrations applied, replace
 * this file with the generated version for full accuracy:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 *
 * (Keeping the shape identical means no application code needs to change.)
 */

export type UserRole = "admin" | "office" | "tradesperson" | "subcontractor";
export type EnquiryStatus =
  | "new" | "contacted" | "site_visit_required" | "quote_required" | "quote_sent" | "won" | "lost";
export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
export type JobStatus =
  | "draft" | "scheduled" | "in_progress" | "on_hold" | "awaiting_materials"
  | "awaiting_customer" | "completed" | "invoiced" | "cancelled";
export type JobTaskStatus = "to_do" | "in_progress" | "blocked" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type PoStatus =
  | "draft" | "awaiting_approval" | "approved" | "sent" | "partially_received" | "received" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "viewed" | "part_paid" | "paid" | "overdue" | "void";
export type InvoiceKind = "deposit" | "progress" | "final" | "standard";
export type PaymentMethod = "bank_transfer" | "card" | "cash" | "cheque" | "other";
export type PhotoCategory = "before" | "during" | "after" | "issue" | "evidence" | "other";
export type DocumentCategory =
  | "plans" | "drawings" | "contracts" | "certificates" | "supplier_quotes"
  | "customer_documents" | "risk_assessments" | "method_statements" | "receipts" | "other";
export type JobCostCategory = "material" | "labour" | "subcontractor" | "other";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  job_title: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanySettings = {
  id: string;
  company_name: string;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  company_number: string | null;
  vat_number: string | null;
  default_vat_rate: number;
  quote_terms: string | null;
  invoice_terms: string | null;
  payment_details: string | null;
  job_number_prefix: string;
  quote_number_prefix: string;
  invoice_number_prefix: string;
  po_number_prefix: string;
};

export type Customer = {
  id: string;
  display_name: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address_line1: string | null;
  billing_city: string | null;
  billing_postcode: string | null;
  notes: string | null;
  created_at: string;
};

export type Site = {
  id: string;
  customer_id: string;
  label: string;
  address_line1: string;
  city: string | null;
  postcode: string;
  access_notes: string | null;
};

export type Enquiry = {
  id: string;
  customer_id: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  site_address: string | null;
  source: string | null;
  description: string | null;
  estimated_value: number | null;
  date_received: string;
  assigned_to: string | null;
  next_action_date: string | null;
  notes: string | null;
  status: EnquiryStatus;
  created_at: string;
};

export type Quote = {
  id: string;
  quote_number: string;
  customer_id: string;
  site_id: string | null;
  issue_date: string;
  expiry_date: string | null;
  description: string | null;
  subtotal: number;
  vat_total: number;
  grand_total: number;
  status: QuoteStatus;
  created_at: string;
};

export type Job = {
  id: string;
  job_number: string;
  job_name: string;
  customer_id: string;
  site_id: string | null;
  quote_id: string | null;
  description: string | null;
  status: JobStatus;
  start_date: string | null;
  expected_completion_date: string | null;
  actual_completion_date: string | null;
  estimated_value: number | null;
  estimated_cost: number | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string | null;
  kind: InvoiceKind;
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  status: InvoiceStatus;
  created_at: string;
};

export type Notification = {
  id: string;
  profile_id: string;
  title: string;
  body: string | null;
  link_path: string | null;
  is_read: boolean;
  created_at: string;
};

export type Appointment = {
  id: string;
  job_id: string;
  site_id: string | null;
  title: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
};

// Minimal Supabase Database shape covering the tables the app code queries
// directly. Extend as more phases are implemented. Views/Functions are
// declared empty (rather than omitted) because postgrest-js's GenericSchema
// constraint requires all three keys to be present to type-check selects.
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      company_settings: {
        Row: CompanySettings;
        Insert: Partial<CompanySettings>;
        Update: Partial<CompanySettings>;
        Relationships: [];
      };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer>; Relationships: [] };
      sites: { Row: Site; Insert: Partial<Site>; Update: Partial<Site>; Relationships: [] };
      enquiries: { Row: Enquiry; Insert: Partial<Enquiry>; Update: Partial<Enquiry>; Relationships: [] };
      quotes: { Row: Quote; Insert: Partial<Quote>; Update: Partial<Quote>; Relationships: [] };
      jobs: { Row: Job; Insert: Partial<Job>; Update: Partial<Job>; Relationships: [] };
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice>; Relationships: [] };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
        Relationships: [];
      };
      appointments: { Row: Appointment; Insert: Partial<Appointment>; Update: Partial<Appointment>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
