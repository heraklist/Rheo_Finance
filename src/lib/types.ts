// Evochia Finance — entity type definitions

export type SyncStatus = "pending" | "synced" | "error";

export interface SyncableEntity {
  id: string;
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
