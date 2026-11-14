-- Remove the roster payload; retain only an account-owned ID to block stale-cache resurrection.
create table public.deleted_army_lists (
 user_id uuid not null references auth.users(id) on delete cascade,
 list_id text not null check (char_length(list_id) between 1 and 160),
 deleted_at timestamptz not null default now(),
 primary key(user_id,list_id)
);
alter table public.deleted_army_lists enable row level security;
revoke all on public.deleted_army_lists from anon, authenticated;
grant select, insert on public.deleted_army_lists to authenticated;
create policy "Read own deleted list IDs" on public.deleted_army_lists for select to authenticated using ((select auth.uid())=user_id);
create policy "Only deletion triggers record own IDs" on public.deleted_army_lists for insert to authenticated with check (pg_trigger_depth()>0 and (select auth.uid())=user_id);

grant delete on public.saved_army_lists to authenticated;
create policy "Delete own saved lists" on public.saved_army_lists for delete to authenticated using ((select auth.uid())=user_id);

create function public.record_deleted_army_list() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.deleted_army_lists(user_id,list_id) values(old.user_id,old.list_id) on conflict(user_id,list_id) do nothing;
 return old;
end $$;
revoke all on function public.record_deleted_army_list() from public, anon, authenticated;
create trigger record_deleted_army_list after delete on public.saved_army_lists for each row execute function public.record_deleted_army_list();

create function public.lock_deleted_army_list() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(old.user_id::text||':'||old.list_id,0));
 return old;
end $$;
revoke all on function public.lock_deleted_army_list() from public, anon, authenticated;
create trigger lock_deleted_army_list before delete on public.saved_army_lists for each row execute function public.lock_deleted_army_list();

create function public.reject_deleted_army_list() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' or new.user_id is distinct from old.user_id or new.list_id is distinct from old.list_id then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text||':'||new.list_id,0));
 end if;
 if exists(select 1 from public.deleted_army_lists where user_id=new.user_id and (list_id=new.list_id or (TG_OP='INSERT' and pg_catalog.strpos(new.list_id,pg_catalog.left(list_id,100)||'-recovered-')=1))) then
  raise exception using errcode='P0001',message='saved_list_deleted';
 end if;
 return new;
end $$;
revoke all on function public.reject_deleted_army_list() from public, anon, authenticated;
create trigger reject_deleted_army_list before insert or update on public.saved_army_lists for each row execute function public.reject_deleted_army_list();
