export type Role = "admin" | "manager" | "employee";

export interface AzureServiceIntegration {
  configured: boolean;
  has_key: boolean;
  endpoint?: string | null;
  deployment?: string | null;
  api_version?: string | null;
  index?: string | null;
  account?: string | null;
  container?: string | null;
}

export interface CompanyIntegrations {
  azure_openai: AzureServiceIntegration;
  azure_search: AzureServiceIntegration;
  azure_storage: AzureServiceIntegration;
}

export interface Company {
  id: number;
  name: string;
  logo: string | null;
  industry: string | null;
  settings: Record<string, unknown> | null;
  integrations?: CompanyIntegrations;
  created_at?: string;
}

export interface User {
  id: number;
  company_id: number;
  name: string;
  email: string;
  role: Role;
  email_verified_at: string | null;
  company?: Company;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Customer {
  id: number;
  company_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  invoices_count?: number;
  created_at: string;
}

export type InvoiceStatus = "pending" | "paid" | "overdue";

export interface Invoice {
  id: number;
  company_id: number;
  customer_id: number;
  customer?: Customer;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  issued_date: string;
  due_date: string;
  status: InvoiceStatus;
  description: string | null;
  payments?: Payment[];
  created_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  invoice?: Invoice;
  amount: number;
  payment_date: string;
  method: string;
  created_at: string;
}

export interface AppDocument {
  id: number;
  company_id: number;
  title: string;
  original_name: string;
  type: string;
  category: string;
  size: number;
  expires_at: string | null;
  url: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Report {
  id: number;
  company_id: number;
  type: "daily" | "weekly" | "monthly" | "quarterly";
  period_start: string | null;
  period_end: string | null;
  data: Record<string, unknown> | null;
  ai_summary: string | null;
  format: string;
  generated_by: string | null;
  created_at: string;
}

export interface AiMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AiConversation {
  id: number;
  title: string;
  messages?: AiMessage[];
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  related_type: string | null;
  related_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardWidgets {
  revenue: {
    this_month: number;
    last_month: number;
    change_pct: number;
    year_to_date: number;
  };
  outstanding_invoices: {
    total: number;
    count: number;
    overdue_total: number;
    overdue_count: number;
  };
  customers: {
    total: number;
    new_this_month: number;
  };
  profit: {
    this_month: number;
    last_month: number;
    change_pct: number;
  };
}

export interface RevenueTrendPoint {
  month: string;
  amount: number;
}

export interface InvoiceStatusBreakdown {
  status: string;
  count: number;
  total: number;
}

export interface CashFlowPoint {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface RecentActivityItem {
  type: "invoice" | "payment";
  description: string;
  amount: number;
  date: string | null;
}

export interface DashboardResponse {
  widgets: DashboardWidgets;
  charts: {
    revenue_trend: RevenueTrendPoint[];
    invoice_status: InvoiceStatusBreakdown[];
    cash_flow: CashFlowPoint[];
  };
  alerts: Alert[];
  recent_activity: RecentActivityItem[];
}

export interface ForecastHistoryPoint {
  month: string;
  amount: number;
}

export interface ForecastProjectionPoint {
  month: string;
  projected_amount: number;
  expected_from_due_invoices: number;
}

export interface ForecastRisk {
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface ForecastResponse {
  history: ForecastHistoryPoint[];
  projection: ForecastProjectionPoint[];
  risks: ForecastRisk[];
  narrative: string;
}

export interface SearchResult {
  id: number;
  type: "document" | "customer" | "invoice";
  title: string;
  subtitle: string | null;
  snippet: string | null;
  score: number | null;
}

export interface SearchResponse {
  query: string;
  source: "azure_ai_search" | "local";
  results: SearchResult[];
}
