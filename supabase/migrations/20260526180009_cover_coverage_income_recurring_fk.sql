-- The existing coverage-income recurring index is optimized for month views.
-- This one specifically covers the composite FK used during parent deletes.

create index if not exists idx_coverage_income_user_recurring_fk
  on public.coverage_income(user_id, linked_recurring_id)
  where linked_recurring_id is not null;
