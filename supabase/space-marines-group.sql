-- Data-only update: deploy the frontend's fourth-group support first.
-- Uses the existing sole administrator and preserves the prior catalog revision.
begin;
select set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);
set local role authenticated;
update public.rules_catalog
set data=jsonb_set(data,'{group}','"Space Marines"'::jsonb)
where key='faction:space-marines' and kind='faction' and name='Space Marines'
 and data->>'group' is distinct from 'Space Marines';
do $$ begin
 if not exists(select 1 from public.rules_catalog where key='faction:space-marines' and name='Space Marines' and data->>'group'='Space Marines') then
  raise exception 'Space Marines faction was not found; no changes committed.';
 end if;
end; $$;
commit;
select name,data->>'group' as faction_group,revision from public.rules_catalog where kind='faction' order by name;
