-- Preserve shared catalog revisions and reviewed reports when their author deletes an account.
-- Private saved lists, reports submitted by the user, and admin membership already cascade.
alter table public.rules_catalog_history alter column changed_by drop not null;
alter table public.rules_catalog_history drop constraint rules_catalog_history_changed_by_fkey;
alter table public.rules_catalog_history add constraint rules_catalog_history_changed_by_fkey
 foreign key (changed_by) references auth.users(id) on delete set null;
alter table public.rule_reports drop constraint rule_reports_reviewed_by_fkey;
alter table public.rule_reports add constraint rule_reports_reviewed_by_fkey
 foreign key (reviewed_by) references auth.users(id) on delete set null;
