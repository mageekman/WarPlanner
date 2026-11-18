create table public.user_feedback (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 kind text not null check(kind in ('bug','suggestion','question')),
 area text not null check(area in ('signin','import','builder','practice','guide','rules','account','printing','other')),
 title text not null check(char_length(btrim(title)) between 1 and 160),
 description text not null check(char_length(btrim(description)) between 1 and 5000),
 steps text not null default '' check(char_length(steps)<=5000),
 expected text not null default '' check(char_length(expected)<=3000),
 frequency text not null default 'unsure' check(frequency in ('always','sometimes','once','unsure')),
 impact text not null default 'minor' check(impact in ('blocked','difficult','minor')),
 contact_email text not null default '' check(char_length(contact_email)<=254 and (contact_email='' or contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 attachment_url text not null default '' check(char_length(attachment_url)<=2000 and (attachment_url='' or attachment_url ~ '^https?://[^[:space:]]+$')),
 context jsonb not null default '{}'::jsonb check(jsonb_typeof(context)='object' and octet_length(context::text)<=4000 and context-array['page','version','browser','language','timezone','viewport','guideMode','phase','turn','faction']='{}'::jsonb),
 status text not null default 'new' check(status in ('new','in-progress','resolved'))
);
alter table public.user_feedback enable row level security;
revoke all on public.user_feedback from anon,authenticated;
grant select on public.user_feedback to authenticated;
grant insert(id,kind,area,title,description,steps,expected,frequency,impact,contact_email,attachment_url,context) on public.user_feedback to authenticated;
grant update(status) on public.user_feedback to authenticated;
create policy "Users read own feedback; admins read inbox" on public.user_feedback for select to authenticated
 using(reporter_id=(select auth.uid()) or exists(select 1 from public.site_admins where user_id=(select auth.uid())));
create policy "Users submit their own new feedback" on public.user_feedback for insert to authenticated
 with check(reporter_id=(select auth.uid()) and status='new');
create policy "Only admins triage feedback" on public.user_feedback for update to authenticated
 using(exists(select 1 from public.site_admins where user_id=(select auth.uid())))
 with check(exists(select 1 from public.site_admins where user_id=(select auth.uid())));
create index user_feedback_reporter_created_idx on public.user_feedback(reporter_id,created_at desc);
create index user_feedback_status_created_idx on public.user_feedback(status,created_at desc);
create function public.limit_user_feedback() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.user_feedback where id=new.id and reporter_id=auth.uid()) then return new; end if;
 if (select count(*) from public.user_feedback where reporter_id=auth.uid() and created_at>now()-interval '10 minutes')>=10 then
  raise exception using errcode='P0001',message='You have sent several reports recently. Please wait a few minutes before sending another.';
 end if;
 return new;
end;
$$;
revoke all on function public.limit_user_feedback() from public,anon,authenticated;
create trigger limit_user_feedback before insert on public.user_feedback for each row execute function public.limit_user_feedback();
