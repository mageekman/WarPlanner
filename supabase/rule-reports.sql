-- Signed-in players submit reports; only the existing sole admin reviews them.
-- Approval and the catalog history trigger run in one transaction under caller RLS.
create table public.rule_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 entity_key text references public.rules_catalog(key),
 entity_name text not null check(char_length(entity_name) between 1 and 180),
 faction text not null check(char_length(faction) between 1 and 100),
 issue_type text not null check(issue_type in ('summary','timing','targets','other','missing')),
 change_text text not null check(char_length(btrim(change_text)) between 1 and 5000),
 missing_name text check(missing_name is null or char_length(btrim(missing_name)) between 1 and 180),
 timing jsonb not null default '{}' check(jsonb_typeof(timing)='object' and octet_length(timing::text)<2000),
 context jsonb not null default '{}' check(jsonb_typeof(context)='object' and octet_length(context::text)<12000),
 observed jsonb not null default '{}' check(jsonb_typeof(observed)='object' and octet_length(observed::text)<20000),
 base_revision bigint,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 applied_entry jsonb,
 check((issue_type='missing' and entity_key is null and base_revision is null and missing_name is not null) or (issue_type<>'missing' and entity_key is not null and base_revision>0 and missing_name is null)),
 check((status='pending' and reviewed_at is null and reviewed_by is null and applied_entry is null) or (status<>'pending' and reviewed_at is not null and reviewed_by is not null and (status<>'approved' or applied_entry is not null)))
);
alter table public.rule_reports enable row level security;
revoke all on public.rule_reports from public, anon, authenticated;
grant select on public.rule_reports to authenticated;
grant insert(id,reporter_id,entity_key,entity_name,faction,issue_type,change_text,missing_name,timing,context,observed,base_revision) on public.rule_reports to authenticated;
grant update(status,reviewed_at,reviewed_by,applied_entry) on public.rule_reports to authenticated;
create policy "Players read own reports; admin reads queue" on public.rule_reports for select to authenticated using (reporter_id=(select auth.uid()) or exists(select 1 from public.site_admins where user_id=(select auth.uid())));
create policy "Players submit pending reports" on public.rule_reports for insert to authenticated with check (reporter_id=(select auth.uid()) and status='pending' and reviewed_at is null and reviewed_by is null and applied_entry is null);
create policy "Only admin reviews reports" on public.rule_reports for update to authenticated using (exists(select 1 from public.site_admins where user_id=(select auth.uid()))) with check (reviewed_by=(select auth.uid()) and exists(select 1 from public.site_admins where user_id=(select auth.uid())));
create index rule_reports_pending_idx on public.rule_reports(created_at desc,id) where status='pending';
create index rule_reports_reporter_idx on public.rule_reports(reporter_id);
create index rule_reports_entity_idx on public.rule_reports(entity_key);
create index rule_reports_reviewer_idx on public.rule_reports(reviewed_by);

create function public.submit_rule_report(payload jsonb) returns public.rule_reports
language plpgsql security invoker set search_path='' as $$
declare saved public.rule_reports; current_entry public.rules_catalog; request_id uuid; issue text; text_value text; faction_value text; timings jsonb;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Sign in to report a rule.'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>35000 then raise exception 'Invalid report.'; end if;
 request_id=(payload->>'id')::uuid; issue=payload->>'issue_type'; text_value=btrim(payload->>'change_text'); timings=coalesce(payload->'timing','{}');
 if request_id is null or issue is null or issue not in ('summary','timing','targets','other','missing') or text_value is null or char_length(text_value) not between 1 and 5000 then raise exception 'Choose a report type and describe the change (up to 5000 characters).'; end if;
 select * into saved from public.rule_reports where id=request_id;
 if found then
  if saved.reporter_id<>auth.uid() or saved.issue_type<>issue or saved.change_text<>text_value or saved.entity_key is distinct from nullif(payload->>'entity_key','') or saved.missing_name is distinct from nullif(btrim(payload->>'missing_name'),'') or saved.timing<>timings or saved.context<>coalesce(payload->'context','{}') or saved.observed<>coalesce(payload->'observed','{}') then raise exception 'This report ID has already been used.'; end if;
  return saved;
 end if;
 if issue='timing' then
  if jsonb_typeof(timings)<>'object' or not(timings ?& array['window','phase','turn']) or exists(select 1 from jsonb_object_keys(timings) k where k not in ('window','phase','turn')) or coalesce(timings->>'window','') not in ('round','turn-start','start','core-cp','shock','act','select','before','after','react','arrivals','end','turn-end','round-end','prebattle') or coalesce(timings->>'turn','') not in ('you','opponent','either') then raise exception 'Choose valid timing options.'; end if;
  if jsonb_typeof(timings->'phase')<>'array' or jsonb_array_length(timings->'phase')>5 then raise exception 'Choose valid phases.'; end if;
  if exists(select 1 from jsonb_array_elements(timings->'phase') p where jsonb_typeof(p)<>'number' or p::text !~ '^[0-4]$') then raise exception 'Choose valid phases.'; end if;
 elsif timings<>'{}'::jsonb then raise exception 'Timing options belong only to timing reports.'; end if;
 if issue='missing' then
  if nullif(payload->>'entity_key','') is not null or char_length(btrim(coalesce(payload->>'missing_name',''))) not between 1 and 180 then raise exception 'Enter the missing rule name.'; end if;
  faction_value=payload->'context'->>'faction';
  if not exists(select 1 from public.rules_catalog where kind='faction' and name=faction_value) then raise exception 'Choose an existing faction.'; end if;
  insert into public.rule_reports(id,reporter_id,entity_name,faction,issue_type,change_text,missing_name,timing,context,observed) values(request_id,auth.uid(),btrim(payload->>'missing_name'),faction_value,issue,text_value,btrim(payload->>'missing_name'),timings,coalesce(payload->'context','{}'),coalesce(payload->'observed','{}')) returning * into saved;
 else
  select * into current_entry from public.rules_catalog where key=payload->>'entity_key';
  if not found or current_entry.kind not in ('unit','rule','step') then raise exception 'This rule or unit is no longer available.'; end if;
  if current_entry.revision is distinct from (payload->>'base_revision')::bigint then raise exception 'This entry changed. Refresh the guide before reporting it.'; end if;
  faction_value=case when current_entry.faction='*' then payload->'context'->>'faction' else current_entry.faction end;
  insert into public.rule_reports(id,reporter_id,entity_key,entity_name,faction,issue_type,change_text,timing,context,observed,base_revision) values(request_id,auth.uid(),current_entry.key,current_entry.name,faction_value,issue,text_value,timings,coalesce(payload->'context','{}'),coalesce(payload->'observed','{}'),current_entry.revision) returning * into saved;
 end if;
 return saved;
end; $$;
revoke all on function public.submit_rule_report(jsonb) from public,anon;
grant execute on function public.submit_rule_report(jsonb) to authenticated;

create function public.review_rule_report(payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare report public.rule_reports; current_entry public.rules_catalog; saved public.rules_catalog; proposal jsonb; decision text; expected bigint; mode text;
begin
 if auth.uid() is null or not exists(select 1 from public.site_admins where user_id=auth.uid()) then raise exception using errcode='42501',message='Administrator access is required.'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>160000 then raise exception 'Invalid review.'; end if;
 decision=payload->>'decision';mode=coalesce(payload->>'mode','direct');
 if decision is null or decision not in ('approve','reject') or mode not in ('direct','edited') then raise exception 'Choose Approve or Reject.'; end if;
 select * into report from public.rule_reports where id=(payload->>'id')::uuid for update;
 if not found then raise exception 'Report not found.'; end if;
 if report.status<>'pending' then
  if report.reviewed_by=auth.uid() and report.status=(case decision when 'approve' then 'approved' else 'rejected' end) then return jsonb_build_object('report',to_jsonb(report),'entry',report.applied_entry); end if;
  raise exception 'This report has already been reviewed.';
 end if;
 if decision='approve' then
  proposal=payload->'proposal';expected=coalesce((payload->>'expected_revision')::bigint,0);
  if proposal is null or jsonb_typeof(proposal)<>'object' or jsonb_typeof(proposal->'data')<>'object' then raise exception 'Review a concrete proposed change first.'; end if;
  if report.entity_key is not null then
   select * into current_entry from public.rules_catalog where key=report.entity_key for update;
   if not found or proposal->>'key'<>report.entity_key or proposal->>'kind'<>current_entry.kind then raise exception 'The report must update its original entry.'; end if;
   if expected<>current_entry.revision then raise exception 'This entry changed. Use Edit to review the latest revision.'; end if;
   if mode='direct' and (expected<>report.base_revision or report.issue_type='other' or current_entry.kind='unit' or (current_entry.kind='step' and report.issue_type<>'summary')) then raise exception 'Use Edit to review this report before approving.'; end if;
   update public.rules_catalog set name=proposal->>'name',faction=proposal->>'faction',data=proposal->'data',enabled=(proposal->>'enabled')::boolean where key=current_entry.key and revision=expected returning * into saved;
   if not found then raise exception 'The entry changed while applying this report.'; end if;
  else
   if mode<>'edited' or report.issue_type<>'missing' or proposal->>'kind'<>'rule' or expected<>0 then raise exception 'Use Edit to set the missing rule’s scope and timing first.'; end if;
   insert into public.rules_catalog(key,kind,name,faction,data,enabled) values(proposal->>'key','rule',proposal->>'name',proposal->>'faction',proposal->'data',(proposal->>'enabled')::boolean) returning * into saved;
  end if;
 end if;
 update public.rule_reports set status=case decision when 'approve' then 'approved' else 'rejected' end,reviewed_at=now(),reviewed_by=auth.uid(),applied_entry=case when decision='approve' then to_jsonb(saved) else null end where id=report.id returning * into report;
 return jsonb_build_object('report',to_jsonb(report),'entry',case when decision='approve' then to_jsonb(saved) else null end);
end; $$;
revoke all on function public.review_rule_report(jsonb) from public,anon;
grant execute on function public.review_rule_report(jsonb) to authenticated;
