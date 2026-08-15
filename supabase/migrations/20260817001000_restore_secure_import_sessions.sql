-- Preserve legacy sessions while restoring the contract enforced by the secure import workflow.
alter table public.project_import_sessions
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists planned_paths text[];

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_import_sessions'
      and column_name = 'step'
  ) then
    alter table public.project_import_sessions
      alter column step drop not null,
      alter column step set default 'uploading';
  end if;
end
$$;

alter table public.project_files
  alter column storage_status set default 'legacy_metadata';

drop policy if exists "Acesso por empresa" on public.project_import_sessions;
