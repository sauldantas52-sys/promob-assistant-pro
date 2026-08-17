
-- 1. Nova tabela para Identificações Visuais (Persistência do Projetista)
create table if not exists public.visual_identifications (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    module_id uuid references public.modules(id) on delete cascade,
    part_id uuid references public.parts(id) on delete cascade,
    source_file text,
    visual_reference text,
    observation text,
    confidence_level text check (confidence_level in ('identificado', 'confirmado', 'pendente', 'divergencia', 'nao_localizado')),
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

grant select, insert, update, delete on public.visual_identifications to authenticated;
grant all on public.visual_identifications to service_role;

alter table public.visual_identifications enable row level security;

create policy "Users can manage visual identifications for their company"
on public.visual_identifications
for all
to authenticated
using (
    project_id in (
        select id from public.projects 
        where company_id = public.current_company_id()
    )
);

-- 2. Atualização da RPC import_client_project (Imagem Opcional e Fidelidade)
create or replace function public.import_client_project(
  _project_id uuid,
  _project jsonb,
  _files jsonb,
  _modules jsonb,
  _loose_parts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  project_company_id uuid := public.current_company_id();
  module_item record;
  part_item jsonb;
  file_item jsonb;
  inserted_module_id uuid;
  inserted_group_id uuid;
begin
  if auth.uid() is null or project_company_id is null then
    raise exception 'authentication_required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    or public.has_role(auth.uid(), 'projetista'::public.app_role)
  ) then
    raise exception 'project_import_forbidden';
  end if;

  if jsonb_typeof(coalesce(_files, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(_modules, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(_loose_parts, '[]'::jsonb)) <> 'array' then
    raise exception 'project_import_payload_invalid';
  end if;

  -- Validamos a existência da sessão
  if not exists (
    select 1 from public.project_import_sessions session
    where session.id = _project_id
      and session.company_id = project_company_id
  ) then
    raise exception 'project_import_session_not_found';
  end if;

  -- REGRA INDUSTRIAL: Somente estes 6 arquivos são obrigatórios para a Fábrica
  if exists (
    select 1
    from unnest(array[
      'xml', 'cotas_pdf', 'lista_compra_pdf', 'lista_corte_pdf',
      'preview_corte_pdf', 'dxf_conferencia'
    ]) required(file_type)
    where not exists (
      select 1 from jsonb_array_elements(_files) submitted(file)
      where submitted.file->>'file_type' = required.file_type
    )
  ) then
    raise exception 'project_required_file_missing';
  end if;

  -- Inserção ou Atualização do Projeto
  insert into public.projects (
    id, company_id, name, client_name, environment, notes,
    status, machining_blocked, is_validated
  ) values (
    _project_id, project_company_id,
    trim(coalesce(_project->>'name', '')),
    nullif(trim(coalesce(_project->>'client_name', '')), ''),
    nullif(trim(coalesce(_project->>'environment', '')), ''),
    nullif(trim(coalesce(_project->>'notes', '')), ''),
    'novo', true, false
  )
  on conflict (id) do update set
    name = excluded.name,
    client_name = excluded.client_name,
    environment = excluded.environment,
    notes = excluded.notes;

  -- Limpeza de dados antigos para re-importação
  delete from public.project_files where project_id = _project_id;
  delete from public.parts where project_id = _project_id;
  delete from public.assembly_groups where project_id = _project_id;
  delete from public.modules where project_id = _project_id;

  for file_item in select value from jsonb_array_elements(coalesce(_files, '[]'::jsonb)) loop
    insert into public.project_files (
      project_id, file_name, file_type, size_bytes, summary,
      storage_path, storage_status
    ) values (
      _project_id,
      file_item->>'file_name',
      file_item->>'file_type',
      nullif(file_item->>'size_bytes', '')::bigint,
      file_item->'summary',
      file_item->>'storage_path',
      'stored'
    );
  end loop;

  for module_item in
    select value, ordinality
    from jsonb_array_elements(coalesce(_modules, '[]'::jsonb)) with ordinality
  loop
    insert into public.modules (
      project_id, name, environment, width_mm, height_mm, depth_mm,
      quantity, data_source
    ) values (
      _project_id,
      module_item.value->>'name',
      coalesce(nullif(module_item.value->>'environment', ''), nullif(_project->>'environment', '')),
      nullif(module_item.value->>'width_mm', '')::numeric,
      nullif(module_item.value->>'height_mm', '')::numeric,
      nullif(module_item.value->>'depth_mm', '')::numeric,
      coalesce(nullif(module_item.value->>'quantity', '')::integer, 1),
      'XML'
    ) returning id into inserted_module_id;

    insert into public.assembly_groups (
      project_id, module_id, code, name, color,
      separation_status, conference_status, is_locked
    ) values (
      _project_id, inserted_module_id,
      'M' || lpad(module_item.ordinality::text, 2, '0'),
      module_item.value->>'name',
      (array['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])[((module_item.ordinality - 1) % 5) + 1],
      'pendente', 'pendente', true
    ) returning id into inserted_group_id;

    for part_item in
      select value from jsonb_array_elements(coalesce(module_item.value->'parts', '[]'::jsonb))
    loop
      insert into public.parts (
        project_id, module_id, assembly_group_id, kind, name, material,
        thickness_mm, width_mm, length_mm, quantity, unit, edge_banding,
        data_source, machining_blocked, is_completed, metadata
      ) values (
        _project_id, inserted_module_id, inserted_group_id,
        coalesce(nullif(part_item->>'kind', ''), 'peca'),
        part_item->>'name', nullif(part_item->>'material', ''),
        nullif(part_item->>'thickness_mm', '')::numeric,
        nullif(part_item->>'width_mm', '')::numeric,
        nullif(part_item->>'length_mm', '')::numeric,
        coalesce(nullif(part_item->>'quantity', '')::numeric, 1),
        coalesce(nullif(part_item->>'unit', ''), 'un'),
        nullif(part_item->>'edge_banding', ''),
        'XML', true, false,
        coalesce(part_item->'metadata', '{}'::jsonb)
      );
    end loop;
  end loop;

  for part_item in select value from jsonb_array_elements(coalesce(_loose_parts, '[]'::jsonb)) loop
    insert into public.parts (
      project_id, kind, name, material, thickness_mm, width_mm, length_mm,
      quantity, unit, edge_banding, data_source, machining_blocked, is_completed, metadata
    ) values (
      _project_id,
      coalesce(nullif(part_item->>'kind', ''), 'peca'),
      part_item->>'name', nullif(part_item->>'material', ''),
      nullif(part_item->>'thickness_mm', '')::numeric,
      nullif(part_item->>'width_mm', '')::numeric,
      nullif(part_item->>'length_mm', '')::numeric,
      coalesce(nullif(part_item->>'quantity', '')::numeric, 1),
      coalesce(nullif(part_item->>'unit', ''), 'un'),
      nullif(part_item->>'edge_banding', ''),
      'XML', true, false,
      coalesce(part_item->'metadata', '{}'::jsonb)
    );
  end loop;

  update public.project_import_sessions
  set status = 'completed', updated_at = now()
  where id = _project_id;

  return _project_id;
end;
$$;

-- 3. Correção de RLS para Admin e Projetista verem tudo da empresa
create or replace function public.is_admin()
returns boolean as $$
  select public.has_role(auth.uid(), 'admin');
$$ language sql stable security definer;

create or replace function public.can_manage_projects()
returns boolean as $$
  select public.has_role(auth.uid(), 'admin') 
    or public.has_role(auth.uid(), 'escritorio')
    or public.has_role(auth.uid(), 'projetista');
$$ language sql stable security definer;

-- Re-aplicar políticas globais de company_id para garantir visibilidade
drop policy if exists "Users view their company projects" on public.projects;
create policy "Users view their company projects" on public.projects
for select to authenticated
using (company_id = public.current_company_id());

drop policy if exists "Admins manage all company projects" on public.projects;
create policy "Admins manage all company projects" on public.projects
for all to authenticated
using (company_id = public.current_company_id() and public.is_admin());

-- 4. Gatilhos de Auditoria para Persistência
create or replace function public.log_industrial_import()
returns trigger as $$
begin
  insert into public.production_logs (
    project_id, event_type, description, metadata, created_by
  ) values (
    new.id, 'importacao', 'Projeto importado via Pasta do Cliente Industrial 4.0',
    jsonb_build_object('status', new.status, 'machining_blocked', new.machining_blocked),
    auth.uid()
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists log_industrial_import_trigger on public.projects;
create trigger log_industrial_import_trigger
after insert on public.projects
for each row execute function public.log_industrial_import();
