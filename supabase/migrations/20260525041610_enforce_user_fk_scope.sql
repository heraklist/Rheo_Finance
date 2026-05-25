-- Rheo Finance: enforce tenant-consistent foreign keys.
-- RLS controls visibility; these constraints also prevent authenticated users
-- from creating rows with their own user_id that point at another user's parent
-- row if an ID is guessed or leaked.

ALTER TABLE public.books
  ADD CONSTRAINT books_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.categories
  ADD CONSTRAINT categories_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.tags
  ADD CONSTRAINT tags_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.recurring_templates
  ADD CONSTRAINT recurring_templates_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.plan
  ADD CONSTRAINT plan_user_id_id_unique UNIQUE (user_id, id);

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_user_book_fk
  FOREIGN KEY (user_id, book_id) REFERENCES public.books(user_id, id) ON DELETE CASCADE;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_user_book_fk
  FOREIGN KEY (user_id, book_id) REFERENCES public.books(user_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT categories_user_parent_fk
  FOREIGN KEY (user_id, parent_id) REFERENCES public.categories(user_id, id) ON DELETE SET NULL (parent_id);

ALTER TABLE public.recurring_templates
  ADD CONSTRAINT recurring_user_book_fk
  FOREIGN KEY (user_id, book_id) REFERENCES public.books(user_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT recurring_user_account_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id),
  ADD CONSTRAINT recurring_user_category_fk
  FOREIGN KEY (user_id, category_id) REFERENCES public.categories(user_id, id),
  ADD CONSTRAINT recurring_user_tag_fk
  FOREIGN KEY (user_id, tag_id) REFERENCES public.tags(user_id, id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_book_fk
  FOREIGN KEY (user_id, book_id) REFERENCES public.books(user_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT transactions_user_account_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id),
  ADD CONSTRAINT transactions_user_category_fk
  FOREIGN KEY (user_id, category_id) REFERENCES public.categories(user_id, id),
  ADD CONSTRAINT transactions_user_tag_fk
  FOREIGN KEY (user_id, tag_id) REFERENCES public.tags(user_id, id),
  ADD CONSTRAINT transactions_user_recurring_fk
  FOREIGN KEY (user_id, recurring_template_id) REFERENCES public.recurring_templates(user_id, id);

ALTER TABLE public.plan
  ADD CONSTRAINT plan_user_book_fk
  FOREIGN KEY (user_id, book_id) REFERENCES public.books(user_id, id) ON DELETE CASCADE;

ALTER TABLE public.plan_expense_item
  ADD CONSTRAINT plan_expense_user_plan_fk
  FOREIGN KEY (user_id, plan_id) REFERENCES public.plan(user_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT plan_expense_user_account_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE SET NULL (account_id);

ALTER TABLE public.plan_income_item
  ADD CONSTRAINT plan_income_user_plan_fk
  FOREIGN KEY (user_id, plan_id) REFERENCES public.plan(user_id, id) ON DELETE CASCADE;

ALTER TABLE public.coverage_expense
  ADD CONSTRAINT coverage_expense_user_book_fk
  FOREIGN KEY (user_id, book_id) REFERENCES public.books(user_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT coverage_expense_user_recurring_fk
  FOREIGN KEY (user_id, linked_recurring_id)
  REFERENCES public.recurring_templates(user_id, id) ON DELETE SET NULL (linked_recurring_id),
  ADD CONSTRAINT coverage_expense_user_transaction_fk
  FOREIGN KEY (user_id, linked_transaction_id)
  REFERENCES public.transactions(user_id, id) ON DELETE SET NULL (linked_transaction_id);

ALTER TABLE public.coverage_income
  ADD CONSTRAINT coverage_income_user_book_fk
  FOREIGN KEY (user_id, book_id) REFERENCES public.books(user_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT coverage_income_user_recurring_fk
  FOREIGN KEY (user_id, linked_recurring_id)
  REFERENCES public.recurring_templates(user_id, id) ON DELETE SET NULL (linked_recurring_id),
  ADD CONSTRAINT coverage_income_user_transaction_fk
  FOREIGN KEY (user_id, linked_transaction_id)
  REFERENCES public.transactions(user_id, id) ON DELETE SET NULL (linked_transaction_id);
