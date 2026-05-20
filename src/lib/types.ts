// Rheo Finance — entity type definitions

export type SyncStatus = "pending" | "synced" | "error";

export interface SyncableEntity {
  id: string;
  user_id?: string;
  sync_status: SyncStatus;
  local_updated_at: string;
  server_updated_at?: string | null;
}

export type BookSlug = "business" | "personal";

export interface Book extends SyncableEntity {
  slug: BookSlug;
  name: string;
  created_at: string;
}

export type AccountType = "cash" | "bank" | "card";

export interface Account extends SyncableEntity {
  book_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  is_archived: boolean;
  created_at: string;
}

export type CategoryType = "income" | "expense" | "reserve" | "transfer";

export interface Category extends SyncableEntity {
  book_id: string;
  parent_id: string | null;
  name: string;
  type: CategoryType;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
}

export interface Tag extends SyncableEntity {
  name: string;
  description: string | null;
  is_archived: boolean;
  created_at: string;
}

export type Frequency = "monthly" | "weekly" | "quarterly" | "yearly";

export interface RecurringTemplate extends SyncableEntity {
  active: boolean;
  description: string;
  book_id: string;
  account_id: string;
  category_id: string;
  tag_id: string | null;
  amount_gross: number;
  vat_rate: number;
  frequency: Frequency;
  day_of_period: number;
  start_date: string;
  end_date: string | null;
  last_generated: string | null;
  created_at: string;
}

export interface RecurringTemplateWithRelations extends RecurringTemplate {
  book_name?: string;
  account_name?: string;
  category_name?: string;
  category_type?: CategoryType;
  tag_name?: string | null;
  next_due: string | null;
}

export type PaymentMethod = "Μετρητά" | "Κάρτα" | "Τραπεζική μεταφορά" | "IRIS" | "Άλλο";

export interface Transaction extends SyncableEntity {
  date: string;
  description: string;
  book_id: string;
  account_id: string;
  category_id: string;
  tag_id: string | null;
  payment_method: PaymentMethod;
  amount_gross: number;
  vat_rate: number;
  amount_vat: number;
  amount_net: number;
  receipt_photo_path: string | null;
  recurring_template_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// === Display-augmented types (with joined data for UI) ===
export interface TransactionWithRelations extends Transaction {
  book_name?: string;
  account_name?: string;
  category_name?: string;
  category_type?: CategoryType;
  tag_name?: string | null;
}

export type PlanType = "purchase" | "project" | "travel" | "emergency" | "debt" | "custom";
export type PlanStatus = "draft" | "active" | "completed" | "paused";
export type PlanItemType = "one_off" | "recurring";
export type Priority = "essential" | "optional" | "nice_to_have";
export type Confidence = "high" | "medium" | "low";

export interface Plan extends SyncableEntity {
  book_id: string;
  name: string;
  type: PlanType;
  target_date: string | null;
  status: PlanStatus;
  include_in_forecast: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanExpenseItem extends SyncableEntity {
  plan_id: string;
  name: string;
  amount: number;
  type: PlanItemType;
  category: string;
  priority: Priority;
  account_id: string | null;
  duration_months: number;
  target_month: number;
  included: boolean;
  notes: string | null;
  created_at: string;
}

export interface PlanIncomeItem extends SyncableEntity {
  plan_id: string;
  name: string;
  amount: number;
  type: PlanItemType;
  category: string;
  confidence: Confidence;
  duration_months: number;
  target_month: number;
  included: boolean;
  notes: string | null;
  created_at: string;
}

export interface PlanWithTotals extends Plan {
  total_expenses: number;
  total_income: number;
  funding_gap: number;
  expense_count: number;
  income_count: number;
}

export type CoverageExpenseType = "recurring" | "one_off" | "variable";

export interface CoverageExpense extends SyncableEntity {
  book_id: string;
  name: string;
  amount: number;
  type: CoverageExpenseType;
  due_date: number;
  month: number;
  year: number;
  paid: boolean;
  linked_recurring_id: string | null;
  linked_transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CoverageIncome extends SyncableEntity {
  book_id: string;
  name: string;
  amount: number;
  confidence: Confidence;
  expected_date: number;
  month: number;
  year: number;
  received: boolean;
  linked_transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CoverageSummary {
  total_expenses: number;
  total_income: number;
  paid_expenses: number;
  received_income: number;
  balance: number;
  coverage_pct: number;
  payment_progress_pct: number;
}
