-- Initial schema snapshot. Applied to WarPlanner on 2026-11-13.
create table public.account_armies (
 user_id uuid primary key references auth.users(id) on delete cascade,
 army jsonb not null check (jsonb_typeof(army) = 'object')
);
alter table public.account_armies enable row level security;
revoke all on public.account_armies from anon, authenticated;
grant select on public.account_armies to authenticated;
create policy "Read own army" on public.account_armies for select to authenticated
 using ((select auth.uid()) = user_id);
-- Personal seed records are inserted administratively and are not committed.

-- Account list storage follows in account-list-storage.sql. Run both scripts for a new database.
-- Then apply immutable-upload.sql to protect uploaded sources and legacy snapshots.
