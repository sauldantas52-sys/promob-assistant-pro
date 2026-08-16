-- Fix project_import_sessions schema and planned_paths
alter table public.project_import_sessions add column if not exists created_by uuid references auth.users(id) on delete cascade;
alter table public.project_import_sessions add column if not exists planned_paths text[];

-- Migration 4: Safety triggers and locks
create or replace function public.prevent_operational_mutation_after_corte()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_status text;
begin
  select status into project_status
  from public.projects
  where id = new.project_id;

  if project_status not in ('novo', 'orcamento') then
    if new.kind <> old.kind 
      or new.material <> old.material
      or new.thickness_mm <> old.thickness_mm
      or new.width_mm <> old.width_mm
      or new.length_mm <> old.length_mm then
      raise exception 'part_mutation_forbidden_after_corte';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_part_mutation_trigger on public.parts;
create trigger prevent_part_mutation_trigger
before update on public.parts
for each row execute function public.prevent_operational_mutation_after_corte();

-- Canonical project creation, legacy import and tenant guards are created by 20260818000003-00006.
