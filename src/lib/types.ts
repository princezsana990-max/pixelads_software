// ==============================================================================
// OrderFlow Pro: Core Types & Interfaces
// Normalized Supabase PostgreSQL Data Models & Analytics Types
// ==============================================================================

export type EmployeeRole = 'Order Taker' | 'Editor' | 'Manager';

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  role: EmployeeRole;
  contact_number?: string | null;
  email?: string | null;
  joining_date: string;
  monthly_salary?: number | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'Issue';

export interface MistakeCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrderMistake {
  id: string;
  order_id: string;
  category_id?: string | null;
  category_name: string;
  details: string;
  reported_by?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_taker_id: string;
  order_date: string;
  project_name: string;
  pc_number: string;
  delivery_date: string;
  status: OrderStatus;
  assigned_editor_id?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  order_taker?: Employee | null;
  assigned_editor?: Employee | null;
  mistakes?: OrderMistake[];
  assignments?: OrderAssignment[];
  status_history?: OrderStatusHistory[];
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  editor_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  unassigned_at?: string | null;
  is_current: boolean;
  notes?: string | null;
  editor?: Employee | null;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status?: string | null;
  new_status: string;
  changed_by?: string | null;
  reason?: string | null;
  created_at: string;
  changer?: Employee | null;
}

export type PaymentMode = 'Cash' | 'Bank Transfer' | 'Easypaisa' | 'JazzCash' | 'Other';

export interface Payment {
  id: string;
  employee_id: string;
  payment_date: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
}

export type InvoiceStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  customer_address?: string | null;
  customer_contact?: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  notes?: string | null;
  terms?: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string; // YYYY-MM-DD
  is_present: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url?: string | null;
  address?: string | null;
  contact_number?: string | null;
  email?: string | null;
  website?: string | null;
  timezone: string;
  currency: string;
  date_format: string;
  time_format: '12h' | '24h';
  theme: 'light' | 'dark';
  pdf_header_text?: string | null;
  pdf_footer_text?: string | null;
  pdf_logo_position: 'left' | 'center' | 'right';
  signature_url?: string | null;
  stamp_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupHistory {
  id: string;
  backup_name: string;
  backup_type: string;
  record_counts: Record<string, number>;
  file_size_bytes: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string | null;
  details?: any;
  created_at: string;
}

// ----------------------------------------------------------------------
// Analytical Calculations & Metrics
// ----------------------------------------------------------------------

export interface OrderTakerMetrics {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  issueOrders: number;
  calendarDays: number;
  activeWorkingDays: number;
  
  // Formulas specified in Section 11:
  // Total Orders / Calendar days in range
  avgOrdersPerCalendarDay: number;
  // Total Orders / Number of distinct dates on which employee created >= 1 order
  avgOrdersPerActiveWorkingDay: number;
  // Completed Orders / Calendar days in range
  avgCompletedOrdersPerDay: number;
  // Completed Orders / Total Orders * 100
  completionRate: number;
  // Issue Orders / Total Orders * 100
  issueRate: number;
  // Total mistake incidents
  totalMistakes: number;
  // Total recorded mistake incidents / Total Orders * 100
  mistakesPer100Orders: number;
  // Total recorded mistake incidents / Total Orders
  avgMistakesPerOrder: number;

  mistakeDetails: string[];
  editorAssignments: Record<string, number>; // EditorName -> Count
}

export interface EditorMetrics {
  editorId: string;
  editorName: string;
  editorCode: string;
  totalAssignedOrders: number;
  completedOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  issueOrders: number;
  calendarDays: number;
  activeWorkingDays: number;

  avgOrdersPerDay: number;
  avgOrdersPerActiveDay: number;
  completionRate: number;
  totalMistakes: number;
  mistakesPer100AssignedOrders: number;
  avgCompletionTimeHours: number | null; // Turnaround time from order assignment to completion

  mistakeDetails: string[];
  orderTakerAssignments: Record<string, number>; // OrderTakerName -> Count
}

export interface MistakeCategoryStat {
  category: string;
  occurrences: number;
  affectedOrdersCount: number;
  percentageOfTotal: number;
}

export interface DateRangeFilter {
  label: string;
  startDate: string; // ISO or YYYY-MM-DD
  endDate: string;   // ISO or YYYY-MM-DD
}
