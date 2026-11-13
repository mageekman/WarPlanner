create function public.preserve_army_upload() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.army->'originalExport' is distinct from old.army->'originalExport' then
  raise exception using errcode='23514', message='The original uploaded list is read-only. Edit the working roster instead.';
 end if;
 if old.army ? 'originalRoster' then
  if new.army->'originalRoster' is distinct from old.army->'originalRoster' then
   raise exception using errcode='23514', message='The original saved roster is read-only.';
  end if;
 elsif new.army ? 'originalRoster' and new.army->'originalRoster' is distinct from (old.army-'originalExport'-'originalRoster') then
  raise exception using errcode='23514', message='The original roster snapshot must match the previously saved roster.';
 end if;
 return new;
end;
$$;
revoke all on function public.preserve_army_upload() from public, anon, authenticated;
create trigger preserve_original_army_upload before update of army on public.saved_army_lists for each row execute function public.preserve_army_upload();
