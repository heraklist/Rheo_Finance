-- Cover composite user-scoped foreign keys reported by the Supabase advisor.

create index if not exists idx_categories_user_parent
  on public.categories(user_id, parent_id)
  where parent_id is not null;

create index if not exists idx_coverage_expense_user_recurring
  on public.coverage_expense(user_id, linked_recurring_id)
  where linked_recurring_id is not null;

create index if not exists idx_coverage_expense_user_transaction
  on public.coverage_expense(user_id, linked_transaction_id)
  where linked_transaction_id is not null;

create index if not exists idx_coverage_income_user_recurring
  on public.coverage_income(user_id, linked_recurring_id)
  where linked_recurring_id is not null;

create index if not exists idx_coverage_income_user_transaction
  on public.coverage_income(user_id, linked_transaction_id)
  where linked_transaction_id is not null;

create index if not exists idx_plan_expense_user_account
  on public.plan_expense_item(user_id, account_id)
  where account_id is not null;

create index if not exists idx_recurring_user_account
  on public.recurring_templates(user_id, account_id)
  where account_id is not null;

create index if not exists idx_recurring_user_book
  on public.recurring_templates(user_id, book_id);

create index if not exists idx_recurring_user_category
  on public.recurring_templates(user_id, category_id)
  where category_id is not null;

create index if not exists idx_recurring_user_tag
  on public.recurring_templates(user_id, tag_id)
  where tag_id is not null;

create index if not exists idx_tx_user_account
  on public.transactions(user_id, account_id)
  where account_id is not null;

create index if not exists idx_tx_user_recurring
  on public.transactions(user_id, recurring_template_id)
  where recurring_template_id is not null;

create index if not exists idx_tx_user_tag
  on public.transactions(user_id, tag_id)
  where tag_id is not null;
