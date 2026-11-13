create table public.saved_army_lists (
 user_id uuid not null references auth.users(id) on delete cascade,
 list_id text not null check (char_length(list_id) between 1 and 160),
 army jsonb not null check (jsonb_typeof(army) = 'object' and army ? 'units' and jsonb_typeof(army->'units') = 'array'),
 warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
 renames jsonb not null default '{}'::jsonb check (jsonb_typeof(renames) = 'object'),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now(),
 primary key (user_id, list_id)
);
alter table public.saved_army_lists enable row level security;
revoke all on public.saved_army_lists from anon, authenticated;
grant select, insert, update on public.saved_army_lists to authenticated;
create policy "Read own saved lists" on public.saved_army_lists for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own saved lists" on public.saved_army_lists for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own saved lists" on public.saved_army_lists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
insert into public.saved_army_lists (user_id,list_id,army)
 select user_id,'list-1',case when army->>'name'='Aspect Host' and army->>'faction'='Aeldari' and army->'units'->0->>'id' like 'sample-%'
 then army || '{"disposition":"Priority Assets"}'::jsonb else army end from public.account_armies
 on conflict (user_id,list_id) do nothing;
