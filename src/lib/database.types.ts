export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamp = string;
type DateString = string;
type Numeric = number;
type Uuid = string;

type RemoteRowBase = {
  id: string;
  user_id: Uuid;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
};

type RemoteInsertBase = {
  id: string;
  user_id: Uuid;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  deleted_at?: Timestamp | null;
};

type RemoteUpdateBase = {
  id?: string;
  user_id?: Uuid;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  deleted_at?: Timestamp | null;
};

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: RemoteRowBase & {
          book_id: string;
          initial_balance: Numeric;
          is_archived: boolean;
          name: string;
          type: "cash" | "bank" | "card";
        };
        Insert: RemoteInsertBase & {
          book_id: string;
          initial_balance?: Numeric;
          is_archived?: boolean;
          name: string;
          type: "cash" | "bank" | "card";
        };
        Update: RemoteUpdateBase & {
          book_id?: string;
          initial_balance?: Numeric;
          is_archived?: boolean;
          name?: string;
          type?: "cash" | "bank" | "card";
        };
        Relationships: [];
      };
      books: {
        Row: RemoteRowBase & {
          name: string;
          slug: "business" | "personal";
        };
        Insert: RemoteInsertBase & {
          name: string;
          slug: "business" | "personal";
        };
        Update: RemoteUpdateBase & {
          name?: string;
          slug?: "business" | "personal";
        };
        Relationships: [];
      };
      categories: {
        Row: RemoteRowBase & {
          book_id: string;
          is_archived: boolean;
          name: string;
          parent_id: string | null;
          sort_order: number;
          type: "income" | "expense" | "reserve" | "transfer";
        };
        Insert: RemoteInsertBase & {
          book_id: string;
          is_archived?: boolean;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          type: "income" | "expense" | "reserve" | "transfer";
        };
        Update: RemoteUpdateBase & {
          book_id?: string;
          is_archived?: boolean;
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
          type?: "income" | "expense" | "reserve" | "transfer";
        };
        Relationships: [];
      };
      coverage_expense: {
        Row: RemoteRowBase & {
          amount: Numeric;
          book_id: string;
          due_date: number;
          linked_recurring_id: string | null;
          linked_transaction_id: string | null;
          month: number;
          name: string;
          notes: string | null;
          paid: boolean;
          type: "recurring" | "one_off" | "variable";
          year: number;
        };
        Insert: RemoteInsertBase & {
          amount: Numeric;
          book_id: string;
          due_date: number;
          linked_recurring_id?: string | null;
          linked_transaction_id?: string | null;
          month: number;
          name: string;
          notes?: string | null;
          paid?: boolean;
          type?: "recurring" | "one_off" | "variable";
          year: number;
        };
        Update: RemoteUpdateBase & {
          amount?: Numeric;
          book_id?: string;
          due_date?: number;
          linked_recurring_id?: string | null;
          linked_transaction_id?: string | null;
          month?: number;
          name?: string;
          notes?: string | null;
          paid?: boolean;
          type?: "recurring" | "one_off" | "variable";
          year?: number;
        };
        Relationships: [];
      };
      coverage_income: {
        Row: RemoteRowBase & {
          amount: Numeric;
          book_id: string;
          confidence: "high" | "medium" | "low";
          expected_date: number;
          linked_recurring_id: string | null;
          linked_transaction_id: string | null;
          month: number;
          name: string;
          notes: string | null;
          received: boolean;
          year: number;
        };
        Insert: RemoteInsertBase & {
          amount: Numeric;
          book_id: string;
          confidence?: "high" | "medium" | "low";
          expected_date: number;
          linked_recurring_id?: string | null;
          linked_transaction_id?: string | null;
          month: number;
          name: string;
          notes?: string | null;
          received?: boolean;
          year: number;
        };
        Update: RemoteUpdateBase & {
          amount?: Numeric;
          book_id?: string;
          confidence?: "high" | "medium" | "low";
          expected_date?: number;
          linked_recurring_id?: string | null;
          linked_transaction_id?: string | null;
          month?: number;
          name?: string;
          notes?: string | null;
          received?: boolean;
          year?: number;
        };
        Relationships: [];
      };
      plan: {
        Row: RemoteRowBase & {
          book_id: string;
          include_in_forecast: boolean;
          name: string;
          notes: string | null;
          status: "draft" | "active" | "completed" | "paused";
          target_date: DateString | null;
          type: "purchase" | "project" | "travel" | "emergency" | "debt" | "custom";
        };
        Insert: RemoteInsertBase & {
          book_id: string;
          include_in_forecast?: boolean;
          name: string;
          notes?: string | null;
          status?: "draft" | "active" | "completed" | "paused";
          target_date?: DateString | null;
          type?: "purchase" | "project" | "travel" | "emergency" | "debt" | "custom";
        };
        Update: RemoteUpdateBase & {
          book_id?: string;
          include_in_forecast?: boolean;
          name?: string;
          notes?: string | null;
          status?: "draft" | "active" | "completed" | "paused";
          target_date?: DateString | null;
          type?: "purchase" | "project" | "travel" | "emergency" | "debt" | "custom";
        };
        Relationships: [];
      };
      plan_expense_item: {
        Row: RemoteRowBase & {
          account_id: string | null;
          amount: Numeric;
          category: string;
          duration_months: number;
          included: boolean;
          name: string;
          notes: string | null;
          plan_id: string;
          priority: "essential" | "optional" | "nice_to_have";
          target_month: number;
          type: "one_off" | "recurring";
        };
        Insert: RemoteInsertBase & {
          account_id?: string | null;
          amount: Numeric;
          category?: string;
          duration_months?: number;
          included?: boolean;
          name: string;
          notes?: string | null;
          plan_id: string;
          priority?: "essential" | "optional" | "nice_to_have";
          target_month?: number;
          type?: "one_off" | "recurring";
        };
        Update: RemoteUpdateBase & {
          account_id?: string | null;
          amount?: Numeric;
          category?: string;
          duration_months?: number;
          included?: boolean;
          name?: string;
          notes?: string | null;
          plan_id?: string;
          priority?: "essential" | "optional" | "nice_to_have";
          target_month?: number;
          type?: "one_off" | "recurring";
        };
        Relationships: [];
      };
      plan_income_item: {
        Row: RemoteRowBase & {
          amount: Numeric;
          category: string;
          confidence: "high" | "medium" | "low";
          duration_months: number;
          included: boolean;
          name: string;
          notes: string | null;
          plan_id: string;
          target_month: number;
          type: "one_off" | "recurring";
        };
        Insert: RemoteInsertBase & {
          amount: Numeric;
          category?: string;
          confidence?: "high" | "medium" | "low";
          duration_months?: number;
          included?: boolean;
          name: string;
          notes?: string | null;
          plan_id: string;
          target_month?: number;
          type?: "one_off" | "recurring";
        };
        Update: RemoteUpdateBase & {
          amount?: Numeric;
          category?: string;
          confidence?: "high" | "medium" | "low";
          duration_months?: number;
          included?: boolean;
          name?: string;
          notes?: string | null;
          plan_id?: string;
          target_month?: number;
          type?: "one_off" | "recurring";
        };
        Relationships: [];
      };
      recurring_templates: {
        Row: RemoteRowBase & {
          account_id: string;
          active: boolean;
          amount_gross: Numeric;
          book_id: string;
          category_id: string;
          day_of_period: number;
          description: string;
          end_date: DateString | null;
          frequency: "monthly" | "weekly" | "quarterly" | "yearly";
          last_generated: DateString | null;
          start_date: DateString;
          tag_id: string | null;
          vat_rate: Numeric;
        };
        Insert: RemoteInsertBase & {
          account_id: string;
          active?: boolean;
          amount_gross: Numeric;
          book_id: string;
          category_id: string;
          day_of_period?: number;
          description: string;
          end_date?: DateString | null;
          frequency: "monthly" | "weekly" | "quarterly" | "yearly";
          last_generated?: DateString | null;
          start_date: DateString;
          tag_id?: string | null;
          vat_rate?: Numeric;
        };
        Update: RemoteUpdateBase & {
          account_id?: string;
          active?: boolean;
          amount_gross?: Numeric;
          book_id?: string;
          category_id?: string;
          day_of_period?: number;
          description?: string;
          end_date?: DateString | null;
          frequency?: "monthly" | "weekly" | "quarterly" | "yearly";
          last_generated?: DateString | null;
          start_date?: DateString;
          tag_id?: string | null;
          vat_rate?: Numeric;
        };
        Relationships: [];
      };
      tags: {
        Row: RemoteRowBase & {
          description: string | null;
          is_archived: boolean;
          name: string;
        };
        Insert: RemoteInsertBase & {
          description?: string | null;
          is_archived?: boolean;
          name: string;
        };
        Update: RemoteUpdateBase & {
          description?: string | null;
          is_archived?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: RemoteRowBase & {
          account_id: string;
          amount_gross: Numeric;
          amount_net: Numeric;
          amount_vat: Numeric;
          book_id: string;
          category_id: string;
          date: DateString;
          description: string;
          notes: string | null;
          payment_method: "Μετρητά" | "Κάρτα" | "Τραπεζική μεταφορά" | "IRIS" | "Άλλο";
          receipt_photo_path: string | null;
          recurring_template_id: string | null;
          tag_id: string | null;
          vat_rate: Numeric;
        };
        Insert: RemoteInsertBase & {
          account_id: string;
          amount_gross: Numeric;
          amount_net?: never;
          amount_vat?: never;
          book_id: string;
          category_id: string;
          date: DateString;
          description: string;
          notes?: string | null;
          payment_method: "Μετρητά" | "Κάρτα" | "Τραπεζική μεταφορά" | "IRIS" | "Άλλο";
          receipt_photo_path?: string | null;
          recurring_template_id?: string | null;
          tag_id?: string | null;
          vat_rate?: Numeric;
        };
        Update: RemoteUpdateBase & {
          account_id?: string;
          amount_gross?: Numeric;
          amount_net?: never;
          amount_vat?: never;
          book_id?: string;
          category_id?: string;
          date?: DateString;
          description?: string;
          notes?: string | null;
          payment_method?: "Μετρητά" | "Κάρτα" | "Τραπεζική μεταφορά" | "IRIS" | "Άλλο";
          receipt_photo_path?: string | null;
          recurring_template_id?: string | null;
          tag_id?: string | null;
          vat_rate?: Numeric;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_current_user: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type PublicSchema = Database["public"];
export type PublicTables = PublicSchema["Tables"];
export type TableName = keyof PublicTables;
export type Row<T extends TableName> = PublicTables[T]["Row"];
export type Insert<T extends TableName> = PublicTables[T]["Insert"];
export type Update<T extends TableName> = PublicTables[T]["Update"];
