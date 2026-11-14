-- One transaction for a reviewed batch. Uses the caller's privileges and existing RLS.
create function public.import_rules_catalog(entries jsonb) returns setof public.rules_catalog
language plpgsql security invoker set search_path='' as $$
declare item jsonb; saved public.rules_catalog; expected bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.site_admins where user_id=auth.uid()) then
  raise exception using errcode='42501',message='Administrator access is required.';
 end if;
 if jsonb_typeof(entries)<>'array' or jsonb_array_length(entries) not between 1 and 1000 or octet_length(entries::text)>8000000 then
  raise exception 'Import between 1 and 1000 entries, totaling at most 8 MB.';
 end if;
 if (select count(*) from jsonb_array_elements(entries))<>(select count(distinct value->>'key') from jsonb_array_elements(entries)) then raise exception 'Duplicate import IDs are not allowed.'; end if;
 for item in select value from jsonb_array_elements(entries) order by value->>'key' loop
  expected=coalesce((item->>'expectedRevision')::bigint,0);
  if expected=0 then
   insert into public.rules_catalog(key,kind,faction,name,data,enabled) values(item->>'key',item->>'kind',item->>'faction',item->>'name',item->'data',(item->>'enabled')::boolean) returning * into saved;
  else
   update public.rules_catalog set faction=item->>'faction',name=item->>'name',data=item->'data',enabled=(item->>'enabled')::boolean where key=item->>'key' and kind=item->>'kind' and revision=expected returning * into saved;
   if not found then raise exception 'An entry changed after the import preview. Rebuild the preview before importing.'; end if;
  end if;
  return next saved;
 end loop;
end $$;
revoke all on function public.import_rules_catalog(jsonb) from public, anon;
grant execute on function public.import_rules_catalog(jsonb) to authenticated;
