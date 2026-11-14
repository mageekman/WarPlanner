-- Copy the existing Deathwatch/Kill Team units and Deathwatch Support detachment.
-- Deathwatch-specific rules already exist in Deathwatch and are reused by ID.
-- Originals and existing destination entries are never overwritten. Safe to rerun.
begin;
select set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);
set local role authenticated;
do $$
declare
 source_entry public.rules_catalog;
 destination public.rules_catalog;
 selected_ids text[];
 new_id text;
 bodyguards jsonb;
 payload jsonb;
 copied integer=0;
begin
 if not exists(select 1 from public.rules_catalog where kind='faction' and name='Deathwatch') then
  raise exception 'Deathwatch faction is required.';
 end if;
 select array_agg(data->>'id' order by key) into selected_ids from public.rules_catalog
 where faction='Space Marines' and kind='unit'
 and (name ~* 'deathwatch|kill[ -]?team' or (data->'keywords')::text ~* 'deathwatch');
 if coalesce(array_length(selected_ids,1),0)<>10 then
  raise exception 'Source unit selection changed. Review the copy plan before continuing.';
 end if;
 if exists(select 1 from public.rules_catalog where faction='Space Marines' and kind='rule' and data::text ~* 'deathwatch|kill[ _-]?team') then
  raise exception 'Additional source rules require a reviewed copy plan.';
 end if;
 for source_entry in select * from public.rules_catalog where faction='Space Marines'
 and ((kind='unit' and data->>'id'=any(selected_ids)) or key='detachment:deathwatch-support') order by kind,key
 loop
  new_id=(source_entry.data->>'id')||'-deathwatch';
  select * into destination from public.rules_catalog where key=source_entry.kind||':'||new_id;
  if found then
   if destination.faction<>'Deathwatch' or destination.kind<>source_entry.kind then raise exception 'Destination ID collision: %',new_id;end if;
   continue;
  end if;
  if exists(select 1 from public.rules_catalog where faction='Deathwatch' and kind=source_entry.kind and name=source_entry.name) then
   raise exception 'An existing destination entry needs a manual match: %',source_entry.name;
  end if;
  payload=source_entry.data||jsonb_build_object('id',new_id,'faction','Deathwatch','duplicatedFrom',jsonb_build_object('key',source_entry.key,'faction',source_entry.faction,'revision',source_entry.revision));
  if source_entry.kind='unit' then
   if exists(select 1 from jsonb_array_elements_text(source_entry.data->'bodyguardIds') b(id) where not(b.id=any(selected_ids))) then raise exception 'Bodyguard outside copied units: %',source_entry.name;end if;
   select coalesce(jsonb_agg(to_jsonb(b.id||'-deathwatch') order by b.ordinality),'[]'::jsonb) into bodyguards
   from jsonb_array_elements_text(source_entry.data->'bodyguardIds') with ordinality b(id,ordinality);
   payload=jsonb_set(payload,'{bodyguardIds}',bodyguards);
  end if;
  insert into public.rules_catalog(key,kind,faction,name,data,enabled)
  values(source_entry.kind||':'||new_id,source_entry.kind,'Deathwatch',source_entry.name,payload,source_entry.enabled);
  copied=copied+1;
 end loop;
 if (select count(*) from public.rules_catalog where faction='Deathwatch' and kind='unit' and data->>'id'=any(select unnest(selected_ids)||'-deathwatch'))<>10 then raise exception 'Incomplete unit copy.';end if;
 if not exists(select 1 from public.rules_catalog where key='detachment:deathwatch-support-deathwatch' and faction='Deathwatch') then raise exception 'Missing support detachment.';end if;
 if exists(select 1 from public.rules_catalog u cross join lateral jsonb_array_elements_text(u.data->'bodyguardIds') b(id)
  where u.faction='Deathwatch' and u.kind='unit' and u.data ? 'duplicatedFrom'
  and not exists(select 1 from public.rules_catalog target where target.kind='unit' and target.faction='Deathwatch' and target.data->>'id'=b.id)) then raise exception 'Unresolved copied leader attachment.';end if;
 if exists(select 1 from public.rules_catalog u cross join lateral jsonb_array_elements(u.data->'abilities') a
  where u.faction='Deathwatch' and u.kind='unit' and u.data ? 'duplicatedFrom' and a->>'id' like '%deathwatch%'
  and not exists(select 1 from public.rules_catalog r where r.kind='rule' and r.faction='Deathwatch' and (r.data->>'id'=a->>'id' or r.data->>'sourceRuleId'=a->>'id'))) then raise exception 'Unresolved Deathwatch-specific ability.';end if;
end; $$;
commit;
select kind,count(*) as entries from public.rules_catalog where faction='Deathwatch' group by kind order by kind;
