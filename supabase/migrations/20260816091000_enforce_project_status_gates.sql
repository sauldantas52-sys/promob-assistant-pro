-- RLS policies may check only the caller's own role; service jobs remain trusted.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    _user_id = auth.uid()
    or auth.role() = 'service_role'
  ) and exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create or replace function public.enforce_project_status_gates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_flow constant text[] := array[
    'novo', 'orcamento', 'corte', 'borda', 'usinagem', 'separacao',
    'conferencia', 'expedicao', 'montagem', 'concluido', 'assistencia'
  ];
  old_position integer;
  new_position integer;
  required_checks text[];
  missing_checks integer;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
  ) then
    raise exception 'project_transition_forbidden';
  end if;

  old_position := array_position(status_flow, coalesce(old.status, 'novo'));
  new_position := array_position(status_flow, new.status);
  if old_position is null or new_position is null or new_position <> old_position + 1 then
    raise exception 'project_transition_must_be_sequential';
  end if;

  if new_position >= array_position(status_flow, 'usinagem')
    and new.status <> 'assistencia'
    and coalesce(new.machining_blocked, true) then
    raise exception 'project_machining_blocked';
  end if;

  required_checks := array[]::text[];
  if new_position >= array_position(status_flow, 'corte') and new.status <> 'assistencia' then
    required_checks := required_checks || array['xml_valido', 'lista_corte', 'nesting_dxf', 'materiais'];
  end if;
  if new_position >= array_position(status_flow, 'usinagem') and new.status <> 'assistencia' then
    required_checks := required_checks || array['documentacao_tecnica', 'cotas_furacao', 'bitolas', 'tags_skp'];
  end if;
  if new_position >= array_position(status_flow, 'montagem') and new.status <> 'assistencia' then
    required_checks := required_checks || array['usinagem_liberada', 'pecas_conferidas', 'ferragens_conferidas', 'grupos_completos'];
  end if;

  if cardinality(required_checks) > 0 then
    select count(*) into missing_checks
    from unnest(required_checks) required(check_type)
    where not exists (
      select 1 from public.validation_checks checks
      where checks.project_id = new.id
        and checks.check_type = required.check_type
        and checks.is_completed = true
    );
    if missing_checks > 0 then
      raise exception 'project_gate_incomplete';
    end if;
  end if;

  if new_position >= array_position(status_flow, 'usinagem')
    and new.status <> 'assistencia'
    and exists (
      select 1 from public.parts part
      where part.project_id = new.id
        and part.kind in ('peca', 'chapa')
        and coalesce(part.machining_blocked, true)
    ) then
    raise exception 'project_part_machining_blocked';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_project_status_gates_trigger on public.projects;

create trigger enforce_project_status_gates_trigger
before update of status on public.projects
for each row execute function public.enforce_project_status_gates();

drop policy if exists "Admins and Escritorio can manage validation checks"
on public.validation_checks;

create policy "Company users can view validation checks"
on public.validation_checks
for select
to authenticated
using (
  exists (
    select 1 from public.projects project
    where project.id = validation_checks.project_id
      and project.company_id = public.current_company_id()
  )
);

create policy "Technical roles can create validation checks"
on public.validation_checks
for insert
to authenticated
with check (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role))
  and exists (
    select 1 from public.projects project
    where project.id = validation_checks.project_id
      and project.company_id = public.current_company_id()
  )
);

create policy "Technical roles can update validation checks"
on public.validation_checks
for update
to authenticated
using (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role))
  and exists (
    select 1 from public.projects project
    where project.id = validation_checks.project_id
      and project.company_id = public.current_company_id()
  )
)
with check (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role))
  and exists (
    select 1 from public.projects project
    where project.id = validation_checks.project_id
      and project.company_id = public.current_company_id()
  )
);

create or replace function public.normalize_validation_check_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    new.project_id is distinct from old.project_id
    or new.check_type is distinct from old.check_type
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'validation_check_identity_immutable';
  end if;

  if new.is_completed then
    new.completed_by := auth.uid();
    if tg_op = 'INSERT' or old.is_completed is distinct from true then
      new.completed_at := now();
    end if;
  else
    new.completed_by := null;
    new.completed_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists normalize_validation_check_audit_trigger on public.validation_checks;
create trigger normalize_validation_check_audit_trigger
before insert or update on public.validation_checks
for each row execute function public.normalize_validation_check_audit();

create or replace function public.enforce_project_lock_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.machining_blocked is not distinct from old.machining_blocked
    and new.is_validated is not distinct from old.is_validated then
    return new;
  end if;

  if auth.uid() is null or not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  ) then
    raise exception 'project_lock_change_forbidden';
  end if;

  if new.machining_blocked = false and old.machining_blocked is distinct from false
    and exists (
      select 1
      from unnest(array['documentacao_tecnica', 'cotas_furacao', 'bitolas', 'tags_skp']) required(check_type)
      where not exists (
        select 1 from public.validation_checks checks
        where checks.project_id = new.id
          and checks.check_type = required.check_type
          and checks.is_completed = true
      )
    ) then
    raise exception 'machining_gate_incomplete';
  end if;

  if new.is_validated = true and old.is_validated is distinct from true
    and exists (
      select 1
      from unnest(array['xml_valido', 'lista_corte', 'nesting_dxf', 'materiais']) required(check_type)
      where not exists (
        select 1 from public.validation_checks checks
        where checks.project_id = new.id
          and checks.check_type = required.check_type
          and checks.is_completed = true
      )
    ) then
    raise exception 'project_validation_gate_incomplete';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_project_lock_changes_trigger on public.projects;
create trigger enforce_project_lock_changes_trigger
before update of machining_blocked, is_validated on public.projects
for each row execute function public.enforce_project_lock_changes();

create or replace function public.enforce_part_machining_lock_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.machining_blocked is distinct from old.machining_blocked then
    if auth.uid() is null or not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    ) then
      raise exception 'part_machining_lock_change_forbidden';
    end if;
  end if;

  if new.is_completed is distinct from old.is_completed then
    if auth.uid() is null or not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'fabrica'::public.app_role)
      or public.has_role(auth.uid(), 'montador'::public.app_role)
    ) then
      raise exception 'part_completion_change_forbidden';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_part_machining_lock_changes_trigger on public.parts;
create trigger enforce_part_machining_lock_changes_trigger
before update of machining_blocked, is_completed on public.parts
for each row execute function public.enforce_part_machining_lock_changes();

create or replace function public.enforce_module_completion_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  module_project_status text;
  module_has_group boolean;
  module_group_locked boolean;
begin
  if new.is_completed is distinct from old.is_completed then
    if auth.uid() is null or not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'montador'::public.app_role)
    ) then
      raise exception 'module_completion_change_forbidden';
    end if;

    select project.status,
      exists (
        select 1 from public.assembly_groups assembly_group
        where assembly_group.module_id = new.id
      ),
      exists (
        select 1 from public.assembly_groups assembly_group
        where assembly_group.module_id = new.id
          and coalesce(assembly_group.is_locked, true)
      )
    into module_project_status, module_has_group, module_group_locked
    from public.projects project
    where project.id = new.project_id
      and project.company_id = public.current_company_id();

    if module_project_status is distinct from 'montagem'
      or not module_has_group
      or module_group_locked then
      raise exception 'module_completion_gate_closed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_module_completion_changes_trigger on public.modules;
create trigger enforce_module_completion_changes_trigger
before update of is_completed on public.modules
for each row execute function public.enforce_module_completion_changes();

create or replace function public.enforce_shipping_volume_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_status text;
begin
  if auth.uid() is null or not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
  ) then
    raise exception 'shipping_change_forbidden';
  end if;

  select project.status into project_status
  from public.projects project
  where project.id = new.project_id
    and project.company_id = public.current_company_id();

  if project_status is distinct from 'expedicao' then
    raise exception 'shipping_project_stage_invalid';
  end if;

  if tg_op = 'INSERT' and new.status::text <> 'aguardando' then
    raise exception 'shipping_initial_status_invalid';
  end if;

  if tg_op = 'UPDATE'
    and new.status is distinct from old.status
    and new.status::text <> 'bloqueado'
    and new.status::text is distinct from (case old.status::text
      when 'aguardando' then 'conferido'
      when 'conferido' then 'carregado'
      when 'carregado' then 'entregue'
      else null
    end) then
    raise exception 'shipping_transition_must_be_sequential';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_shipping_volume_workflow_trigger on public.shipping_volumes;
create trigger enforce_shipping_volume_workflow_trigger
before insert or update on public.shipping_volumes
for each row execute function public.enforce_shipping_volume_workflow();

create or replace function public.release_project_machining(_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  missing_checks integer;
begin
  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  ) then
    raise exception 'machining_release_forbidden';
  end if;

  if not exists (
    select 1 from public.projects project
    where project.id = _project_id
      and project.company_id = public.current_company_id()
  ) then
    raise exception 'project_not_found';
  end if;

  select count(*) into missing_checks
  from unnest(array['documentacao_tecnica', 'cotas_furacao', 'bitolas', 'tags_skp']) required(check_type)
  where not exists (
    select 1 from public.validation_checks checks
    where checks.project_id = _project_id
      and checks.check_type = required.check_type
      and checks.is_completed = true
  );

  if missing_checks > 0 then
    raise exception 'machining_gate_incomplete';
  end if;

  update public.parts
  set machining_blocked = false
  where project_id = _project_id
    and kind in ('peca', 'chapa');

  update public.projects
  set machining_blocked = false,
      updated_at = now()
  where id = _project_id;

  insert into public.production_logs (
    project_id,
    user_id,
    action,
    notes
  ) values (
    _project_id,
    auth.uid(),
    'liberacao_usinagem',
    'Gate 2 concluido; bloqueios de usinagem do projeto e das pecas liberados.'
  );
end;
$$;

revoke all on function public.release_project_machining(uuid) from public, anon;
grant execute on function public.release_project_machining(uuid) to authenticated;
