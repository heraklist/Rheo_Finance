-- Harden admin-only tables so signed-in app users cannot access them via PostgREST.
-- RLS remains enabled and explicit deny policies remove ambiguous "RLS enabled with no policy" posture.

revoke select, insert, update, delete on table public.admin_announcements from anon;
revoke select, insert, update, delete on table public.admin_announcements from authenticated;
grant select, insert, update, delete on table public.admin_announcements to service_role;
drop policy if exists admin_announcements_deny_authenticated on public.admin_announcements;
create policy admin_announcements_deny_authenticated on public.admin_announcements for all to authenticated using (false) with check (false);

revoke select, insert, update, delete on table public.admin_feature_flags from anon;
revoke select, insert, update, delete on table public.admin_feature_flags from authenticated;
grant select, insert, update, delete on table public.admin_feature_flags to service_role;
drop policy if exists admin_feature_flags_deny_authenticated on public.admin_feature_flags;
create policy admin_feature_flags_deny_authenticated on public.admin_feature_flags for all to authenticated using (false) with check (false);

revoke select, insert, update, delete on table public.admin_support_tickets from anon;
revoke select, insert, update, delete on table public.admin_support_tickets from authenticated;
grant select, insert, update, delete on table public.admin_support_tickets to service_role;
drop policy if exists admin_support_tickets_deny_authenticated on public.admin_support_tickets;
create policy admin_support_tickets_deny_authenticated on public.admin_support_tickets for all to authenticated using (false) with check (false);

revoke select, insert, update, delete on table public.admin_user_notes from anon;
revoke select, insert, update, delete on table public.admin_user_notes from authenticated;
grant select, insert, update, delete on table public.admin_user_notes to service_role;
drop policy if exists admin_user_notes_deny_authenticated on public.admin_user_notes;
create policy admin_user_notes_deny_authenticated on public.admin_user_notes for all to authenticated using (false) with check (false);

revoke select, insert, update, delete on table public.admin_audit_log from anon;
revoke select, insert, update, delete on table public.admin_audit_log from authenticated;
grant select, insert, update, delete on table public.admin_audit_log to service_role;
drop policy if exists admin_audit_log_deny_authenticated on public.admin_audit_log;
create policy admin_audit_log_deny_authenticated on public.admin_audit_log for all to authenticated using (false) with check (false);

revoke execute on function public.delete_current_user() from public;
revoke execute on function public.delete_current_user() from anon;
grant execute on function public.delete_current_user() to authenticated;
alter function public.delete_current_user() set search_path = '';

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;
