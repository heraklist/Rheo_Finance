-- Keep admin audit logs private even if table grants are changed later.
-- Server-side APIs use service_role, which bypasses RLS.

create policy admin_audit_log_deny_authenticated
  on public.admin_audit_log
  for all
  to authenticated
  using (false)
  with check (false);
