-- Admin audit log is server-side only. RLS has no authenticated policies, but
-- revoke table grants as defense in depth and to match the documented model.

revoke all on table public.admin_audit_log from anon;
revoke all on table public.admin_audit_log from authenticated;
grant select, insert, update, delete on table public.admin_audit_log to service_role;
