-- Schema integrity: verify all required tables, columns, constraints, and indexes exist
BEGIN;
SELECT plan(52);

-- ============================================================
-- 1. Required tables exist
-- ============================================================
SELECT has_table('public', 'books',               'table books exists');
SELECT has_table('public', 'accounts',             'table accounts exists');
SELECT has_table('public', 'categories',           'table categories exists');
SELECT has_table('public', 'tags',                 'table tags exists');
SELECT has_table('public', 'recurring_templates',  'table recurring_templates exists');
SELECT has_table('public', 'transactions',         'table transactions exists');
SELECT has_table('public', 'plan',                 'table plan exists');
SELECT has_table('public', 'plan_expense_item',    'table plan_expense_item exists');
SELECT has_table('public', 'plan_income_item',     'table plan_income_item exists');
SELECT has_table('public', 'coverage_expense',     'table coverage_expense exists');
SELECT has_table('public', 'coverage_income',      'table coverage_income exists');
SELECT has_table('public', 'subscriptions',        'table subscriptions exists');
SELECT has_table('public', 'admin_announcements',  'table admin_announcements exists');
SELECT has_table('public', 'admin_feature_flags',  'table admin_feature_flags exists');
SELECT has_table('public', 'admin_support_tickets','table admin_support_tickets exists');

-- ============================================================
-- 2. Core columns exist on user-owned tables
-- ============================================================
SELECT has_column('public', 'books',        'user_id',    'books.user_id exists');
SELECT has_column('public', 'books',        'slug',       'books.slug exists');
SELECT has_column('public', 'accounts',     'user_id',    'accounts.user_id exists');
SELECT has_column('public', 'accounts',     'book_id',    'accounts.book_id exists');
SELECT has_column('public', 'categories',   'user_id',    'categories.user_id exists');
SELECT has_column('public', 'categories',   'book_id',    'categories.book_id exists');
SELECT has_column('public', 'tags',         'user_id',    'tags.user_id exists');
SELECT has_column('public', 'transactions', 'user_id',    'transactions.user_id exists');
SELECT has_column('public', 'transactions', 'amount_gross','transactions.amount_gross exists');
SELECT has_column('public', 'transactions', 'amount_vat', 'transactions.amount_vat (generated) exists');
SELECT has_column('public', 'transactions', 'amount_net', 'transactions.amount_net (generated) exists');
SELECT has_column('public', 'transactions', 'receipt_photo_path', 'transactions.receipt_photo_path exists');

-- ============================================================
-- 3. Subscription columns
-- ============================================================
SELECT has_column('public', 'subscriptions', 'user_id',               'subscriptions.user_id exists');
SELECT has_column('public', 'subscriptions', 'tier',                  'subscriptions.tier exists');
SELECT has_column('public', 'subscriptions', 'status',                'subscriptions.status exists');
SELECT has_column('public', 'subscriptions', 'source',                'subscriptions.source exists');
SELECT has_column('public', 'subscriptions', 'stripe_customer_id',    'subscriptions.stripe_customer_id exists');
SELECT has_column('public', 'subscriptions', 'stripe_subscription_id','subscriptions.stripe_subscription_id exists');
SELECT has_column('public', 'subscriptions', 'cancel_at_period_end',  'subscriptions.cancel_at_period_end exists');
SELECT has_column('public', 'subscriptions', 'expires_at',            'subscriptions.expires_at exists');

-- ============================================================
-- 4. Key constraints
-- ============================================================

-- books(user_id, slug) unique constraint
SELECT col_is_unique('public', 'books', ARRAY['user_id', 'slug'], 'books(user_id, slug) is unique');

-- subscriptions(user_id) unique
SELECT col_is_unique('public', 'subscriptions', 'user_id', 'subscriptions.user_id is unique');

-- ============================================================
-- 5. Foreign key references
-- ============================================================
SELECT has_column('public', 'accounts',     'book_id', 'accounts references books');
SELECT has_column('public', 'categories',   'book_id', 'categories references books');
SELECT has_column('public', 'transactions', 'book_id', 'transactions references books');
SELECT has_column('public', 'transactions', 'account_id', 'transactions references accounts');
SELECT has_column('public', 'transactions', 'category_id', 'transactions references categories');

-- ============================================================
-- 6. Key indexes exist
-- ============================================================
SELECT has_index('public', 'books',        'idx_books_user',          'books user index exists');
SELECT has_index('public', 'accounts',     'idx_accounts_user_book',  'accounts user_book index exists');
SELECT has_index('public', 'transactions', 'idx_tx_user_date',        'transactions user_date index exists');
SELECT has_index('public', 'transactions', 'idx_tx_user_book_date',   'transactions user_book_date index exists');
SELECT has_index('public', 'transactions', 'idx_tx_user_category',    'transactions user_category index exists');
SELECT has_index('public', 'transactions', 'idx_tx_user_updated',     'transactions user_updated index exists');

-- ============================================================
-- 7. set_updated_at trigger function exists
-- ============================================================
SELECT has_function('public', 'set_updated_at', 'set_updated_at() trigger function exists');

-- ============================================================
-- 8. Updated_at triggers on core tables
-- ============================================================
SELECT has_trigger('public', 'books',               'set_books_updated_at',               'books updated_at trigger');
SELECT has_trigger('public', 'accounts',            'set_accounts_updated_at',            'accounts updated_at trigger');
SELECT has_trigger('public', 'categories',          'set_categories_updated_at',          'categories updated_at trigger');
SELECT has_trigger('public', 'transactions',        'set_transactions_updated_at',        'transactions updated_at trigger');

SELECT * FROM finish();
ROLLBACK;
