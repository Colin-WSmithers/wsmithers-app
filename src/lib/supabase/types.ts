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
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_postcode: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerContact = {
  id: string;
  customer_id: string;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
};

export type Site = {
  id: string;
  customer_id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  postcode: string;
  access_notes: string | null;
  created_at: string;
  updated_at: string;
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
  converted_customer_id: string | null;
  converted_quote_id: string | null;
  converted_job_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  quote_number: string;
  customer_id: string;
  site_id: string | null;
  enquiry_id: string | null;
  issue_date: string;
  expiry_date: string | null;
  description: string | null;
  notes: string | null;
  terms: string | null;
  discount_amount: number;
  vat_rate: number;
  subtotal: number;
  vat_total: number;
  grand_total: number;
  status: QuoteStatus;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  converted_job_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  sort_order: number;
  category: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  created_at: string;
};

export type QuoteItemTemplate = {
  id: string;
  category: string;
  description: string;
  default_unit: string;
  default_unit_price: number;
  default_vat_rate: number;
  created_at: string;
};

export type Job = {
  id: string;
  job_number: string;
  job_name: string;
  customer_id: string;
  site_id: string | null;
  quote_id: string | null;
  primary_contact_id: string | null;
  description: string | null;
  status: JobStatus;
  start_date: string | null;
  expected_completion_date: string | null;
  actual_completion_date: string | null;
  estimated_value: number | null;
  estimated_cost: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  site_id: string | null;
  job_id: string | null;
  kind: InvoiceKind;
  issue_date: string;
  due_date: string;
  notes: string | null;
  terms: string | null;
  vat_rate: number;
  subtotal: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  status: InvoiceStatus;
  sent_at: string | null;
  viewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  created_at: string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  paid_date: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  job_id: string | null;
  issue_date: string;
  expected_delivery_date: string | null;
  status: PoStatus;
  vat_rate: number;
  subtotal: number;
  vat_total: number;
  grand_total: number;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
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

export type DailySummary = {
  id: string;
  summary_date: string;
  content: string;
  stats: Record<string, unknown> | null;
  generated_at: string;
  created_at: string;
};

export type Appointment = {
  id: string;
  job_id: string;
  site_id: string | null;
  title: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentAssignment = {
  id: string;
  appointment_id: string;
  profile_id: string | null;
  subcontractor_id: string | null;
  created_at: string;
};

export type Timesheet = {
  id: string;
  job_id: string;
  profile_id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number;
  duration_minutes: number | null;
  is_manual_entry: boolean;
  notes: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  account_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type JobCost = {
  id: string;
  job_id: string;
  category: JobCostCategory;
  item: string;
  supplier_id: string | null;
  purchase_order_id: string | null;
  quantity: number;
  unit_cost: number;
  vat_rate: number;
  total: number;
  receipt_storage_path: string | null;
  added_by: string | null;
  incurred_date: string;
  created_at: string;
};

export type Subcontractor = {
  id: string;
  name: string;
  company_name: string | null;
  trade: string | null;
  phone: string | null;
  email: string | null;
  day_rate: number | null;
  hourly_rate: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type JobAssignment = {
  id: string;
  job_id: string;
  profile_id: string | null;
  subcontractor_id: string | null;
  role_on_job: string | null;
  created_at: string;
};

export type JobTask = {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: JobTaskStatus;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type JobNote = {
  id: string;
  job_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};

export type JobPhoto = {
  id: string;
  job_id: string;
  storage_path: string;
  category: PhotoCategory;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type AppDocument = {
  id: string;
  job_id: string | null;
  customer_id: string | null;
  filename: string;
  storage_path: string;
  category: DocumentCategory;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
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
      customer_contacts: {
        Row: CustomerContact;
        Insert: Partial<CustomerContact>;
        Update: Partial<CustomerContact>;
        Relationships: [];
      };
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
      daily_summaries: {
        Row: DailySummary;
        Insert: Partial<DailySummary>;
        Update: Partial<DailySummary>;
        Relationships: [];
      };
      appointments: { Row: Appointment; Insert: Partial<Appointment>; Update: Partial<Appointment>; Relationships: [] };
      subcontractors: {
        Row: Subcontractor;
        Insert: Partial<Subcontractor>;
        Update: Partial<Subcontractor>;
        Relationships: [];
      };
      job_assignments: {
        Row: JobAssignment;
        Insert: Partial<JobAssignment>;
        Update: Partial<JobAssignment>;
        Relationships: [];
      };
      job_tasks: { Row: JobTask; Insert: Partial<JobTask>; Update: Partial<JobTask>; Relationships: [] };
      job_notes: { Row: JobNote; Insert: Partial<JobNote>; Update: Partial<JobNote>; Relationships: [] };
      job_photos: { Row: JobPhoto; Insert: Partial<JobPhoto>; Update: Partial<JobPhoto>; Relationships: [] };
      documents: { Row: AppDocument; Insert: Partial<AppDocument>; Update: Partial<AppDocument>; Relationships: [] };
      appointment_assignments: {
        Row: AppointmentAssignment;
        Insert: Partial<AppointmentAssignment>;
        Update: Partial<AppointmentAssignment>;
        Relationships: [];
      };
      timesheets: { Row: Timesheet; Insert: Partial<Timesheet>; Update: Partial<Timesheet>; Relationships: [] };
      suppliers: { Row: Supplier; Insert: Partial<Supplier>; Update: Partial<Supplier>; Relationships: [] };
      job_costs: { Row: JobCost; Insert: Partial<JobCost>; Update: Partial<JobCost>; Relationships: [] };
      quote_items: { Row: QuoteItem; Insert: Partial<QuoteItem>; Update: Partial<QuoteItem>; Relationships: [] };
      quote_item_templates: {
        Row: QuoteItemTemplate;
        Insert: Partial<QuoteItemTemplate>;
        Update: Partial<QuoteItemTemplate>;
        Relationships: [];
      };
      invoice_items: { Row: InvoiceItem; Insert: Partial<InvoiceItem>; Update: Partial<InvoiceItem>; Relationships: [] };
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment>; Relationships: [] };
      purchase_orders: {
        Row: PurchaseOrder;
        Insert: Partial<PurchaseOrder>;
        Update: Partial<PurchaseOrder>;
        Relationships: [];
      };
      purchase_order_items: {
        Row: PurchaseOrderItem;
        Insert: Partial<PurchaseOrderItem>;
        Update: Partial<PurchaseOrderItem>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_document_number: {
        Args: { p_kind: string };
        Returns: string;
      };
    };
  };
};
