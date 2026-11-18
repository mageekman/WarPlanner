-- One administrator, provisioned by the database owner. No client can grant roles.
create table public.site_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 singleton boolean not null default true unique check (singleton),
 created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;
grant select on public.site_admins to authenticated;
create policy "Read own admin membership" on public.site_admins for select to authenticated using (user_id=(select auth.uid()));
insert into public.site_admins(user_id) select id from auth.users where email='iampelham@gmail.com';

create table public.rules_catalog (
 key text primary key check (key ~ '^[a-z_]+:[a-zA-Z0-9_-]+$' and char_length(key)<200),
 kind text not null check (kind in ('faction','detachment','unit','rule','step')),
 faction text not null default '' check (char_length(faction)<=100),
 name text not null check (char_length(name) between 1 and 180),
 data jsonb not null check (jsonb_typeof(data)='object' and jsonb_typeof(data->'id')='string' and char_length(data->>'id') between 1 and 180 and octet_length(data::text)<150000),
 enabled boolean not null default true,
 revision bigint not null default 1 check (revision>0),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null,
 check (kind <> 'step' or enabled),
 check (key=kind||':'||(data->>'id'))
);
alter table public.rules_catalog enable row level security;
revoke all on public.rules_catalog from anon, authenticated;
grant select, insert, update on public.rules_catalog to authenticated;
create policy "Signed in readers use the catalog" on public.rules_catalog for select to authenticated using (true);
create policy "Only the admin adds content" on public.rules_catalog for insert to authenticated with check (exists(select 1 from public.site_admins where user_id=(select auth.uid())));
create policy "Only the admin edits content" on public.rules_catalog for update to authenticated using (exists(select 1 from public.site_admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.site_admins where user_id=(select auth.uid())));

create table public.rules_catalog_history (
 key text not null references public.rules_catalog(key),
 revision bigint not null,
 entry jsonb not null,
 changed_at timestamptz not null default now(),
 changed_by uuid default auth.uid() references auth.users(id) on delete set null,
 primary key(key,revision)
);
alter table public.rules_catalog_history enable row level security;
revoke all on public.rules_catalog_history from anon, authenticated;
grant select, insert on public.rules_catalog_history to authenticated;
create policy "Admin reads content history" on public.rules_catalog_history for select to authenticated using (exists(select 1 from public.site_admins where user_id=(select auth.uid())));
create policy "Only the catalog trigger records history" on public.rules_catalog_history for insert to authenticated with check (pg_trigger_depth()>0 and changed_by=(select auth.uid()) and exists(select 1 from public.site_admins where user_id=(select auth.uid())));

create function public.stamp_rules_catalog() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.key<>old.key or new.kind<>old.kind or new.data->>'id'<>old.data->>'id' then raise exception 'Content identity cannot be changed'; end if;
  insert into public.rules_catalog_history(key,revision,entry,changed_by) values(old.key,old.revision,to_jsonb(old),auth.uid());
  new.revision=old.revision+1;
 else new.revision=1;
 end if;
 new.updated_at=now(); new.updated_by=auth.uid();
 return new;
end $$;
revoke all on function public.stamp_rules_catalog() from public, anon, authenticated;
create trigger stamp_rules_catalog before insert or update on public.rules_catalog for each row execute function public.stamp_rules_catalog();

create index rules_catalog_updated_by_idx on public.rules_catalog(updated_by);
create index rules_catalog_history_changed_by_idx on public.rules_catalog_history(changed_by);
