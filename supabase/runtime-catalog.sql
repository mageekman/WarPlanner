-- Read-only gameplay projection. Full editing records remain behind the existing catalog policies.
-- Apply with the database owner; no table data, RLS policies or write functions are changed.
create or replace function public.runtime_catalog_data(entry_data jsonb, entry_kind text)
returns jsonb language sql immutable security invoker set search_path='' as $function$
 select (entry_data - 'importSource' - 'mechanicsDetails' - 'summaryAudit' - 'classificationAudit' - 'sequenceAudit') ||
 case when entry_data ? 'importSource' then jsonb_build_object('importSource',
  case when entry_kind='rule' and not(entry_data ? 'summaryAudit') then entry_data->'importSource'
  else jsonb_strip_nulls(jsonb_build_object(
   'sourceId',entry_data->'importSource'->'sourceId',
   'record',jsonb_strip_nulls(jsonb_build_object(
    'id',entry_data->'importSource'->'record'->'id',
    'detachment_id',entry_data->'importSource'->'record'->'detachment_id',
    'game_modes',entry_data->'importSource'->'record'->'game_modes',
    'profiles',case when not(entry_data ? 'profiles') then entry_data->'importSource'->'record'->'profiles' end)),
   'stratagem',case when coalesce(entry_data->>'timingOverride','false')<>'true' then entry_data->'importSource'->'stratagem' end)) end)
 else '{}'::jsonb end;
$function$;

create or replace function public.runtime_catalog_manifest()
returns jsonb language plpgsql stable security invoker set search_path='' as $function$
declare manifest jsonb;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Sign in to load rules.'; end if;
 select jsonb_build_object('format',1,'version',md5(coalesce(string_agg(c.key||':'||c.revision::text,',' order by c.key),'')),
  'count',count(*) filter(where c.enabled and not(c.data ? 'sharedRuleId') and not(c.data ? 'sharedUnitId') and coalesce(c.data->>'siteExcluded','')<>'combat-patrol'),
  'excludedKeys',coalesce(jsonb_agg(c.key order by c.key) filter(where not c.enabled or c.data ? 'sharedRuleId' or c.data ? 'sharedUnitId' or c.data->>'siteExcluded'='combat-patrol'),'[]'::jsonb))
 into manifest from public.rules_catalog c;
 return manifest;
end $function$;

create or replace function public.runtime_catalog_page(expected_version text, page_start integer, page_size integer default 500)
returns jsonb language plpgsql stable security invoker set search_path='' as $function$
declare manifest jsonb; entries jsonb;
begin
 if page_start<0 or page_start is null or page_size not between 1 and 1000 or page_size is null then raise exception 'Invalid catalog page.'; end if;
 manifest=public.runtime_catalog_manifest();
 if expected_version is distinct from manifest->>'version' then raise exception using errcode='40001',message='The rules catalog changed while loading. Please retry.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('key',c.key,'kind',c.kind,'faction',c.faction,'name',c.name,'enabled',c.enabled,'revision',c.revision,'data',public.runtime_catalog_data(c.data,c.kind)) order by c.key),'[]'::jsonb)
 into entries from (select * from public.rules_catalog r where r.enabled and not(r.data ? 'sharedRuleId') and not(r.data ? 'sharedUnitId') and coalesce(r.data->>'siteExcluded','')<>'combat-patrol' order by r.key offset page_start limit page_size) c;
 return jsonb_build_object('version',manifest->>'version','rows',entries);
end $function$;

revoke all on function public.runtime_catalog_data(jsonb,text) from public,anon;
revoke all on function public.runtime_catalog_manifest() from public,anon;
revoke all on function public.runtime_catalog_page(text,integer,integer) from public,anon;
grant execute on function public.runtime_catalog_data(jsonb,text),public.runtime_catalog_manifest(),public.runtime_catalog_page(text,integer,integer) to authenticated;
