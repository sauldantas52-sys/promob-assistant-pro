alter table public.validation_checks
  add column if not exists evidence_source text,
  add column if not exists evidence_file_id uuid references public.project_files(id) on delete restrict;

create or replace function public.validate_industrial_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  evidence_file_type text;
begin
  if new.is_completed then
    if new.evidence_source is null then
      raise exception 'validation_evidence_required';
    end if;
    if new.evidence_source in ('pdf_beta', 'ocr', 'ai_vision', 'visual_analysis', 'skp_visual') then
      raise exception 'commercial_evidence_cannot_release_industry';
    end if;
    if new.check_type in (
      'xml_valido', 'lista_corte', 'nesting_dxf', 'materiais',
      'documentacao_tecnica', 'cotas_furacao', 'bitolas', 'tags_skp'
    ) and new.evidence_file_id is null then
      raise exception 'validation_evidence_file_required';
    end if;
    if new.evidence_file_id is not null and not exists (
      select 1 from public.project_files file
      where file.id = new.evidence_file_id and file.project_id = new.project_id
    ) then
      raise exception 'validation_evidence_project_mismatch';
    end if;
    select file.file_type into evidence_file_type
    from public.project_files file
    where file.id = new.evidence_file_id and file.project_id = new.project_id;
    if (new.check_type in ('xml_valido', 'materiais', 'bitolas', 'tags_skp')
        and (new.evidence_source <> 'promob_xml' or evidence_file_type <> 'xml'))
      or (new.check_type = 'lista_corte'
        and (new.evidence_source <> 'cut_plan_document'
          or evidence_file_type <> 'lista_corte_pdf'))
      or (new.check_type = 'nesting_dxf'
        and (new.evidence_source <> 'nesting_dxf'
          or evidence_file_type <> 'dxf_conferencia'))
      or (new.check_type in ('documentacao_tecnica', 'cotas_furacao')
        and (new.evidence_source <> 'technical_document'
          or evidence_file_type not in ('cotas_pdf', 'dxf_conferencia')))
      or (new.check_type in (
          'usinagem_liberada', 'pecas_conferidas',
          'ferragens_conferidas', 'grupos_completos'
        ) and (new.evidence_source <> 'operational_confirmation'
          or new.evidence_file_id is not null))
      or new.check_type not in (
        'xml_valido', 'lista_corte', 'nesting_dxf', 'materiais',
        'documentacao_tecnica', 'cotas_furacao', 'bitolas', 'tags_skp',
        'usinagem_liberada', 'pecas_conferidas',
        'ferragens_conferidas', 'grupos_completos'
      ) then
      raise exception 'validation_evidence_type_mismatch';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_industrial_evidence_trigger on public.validation_checks;
create trigger validate_industrial_evidence_trigger
before insert or update on public.validation_checks
for each row execute function public.validate_industrial_evidence();

create or replace function public.relock_project_after_check_reopened()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_completed and not new.is_completed then
    if old.check_type in ('documentacao_tecnica', 'cotas_furacao', 'bitolas', 'tags_skp') then
      update public.parts set machining_blocked = true where project_id = old.project_id;
      update public.projects set machining_blocked = true, updated_at = now()
      where id = old.project_id;
    end if;
    if old.check_type in ('xml_valido', 'lista_corte', 'nesting_dxf', 'materiais') then
      update public.projects set is_validated = false, updated_at = now()
      where id = old.project_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists relock_project_after_check_reopened_trigger on public.validation_checks;
create trigger relock_project_after_check_reopened_trigger
after update on public.validation_checks
for each row execute function public.relock_project_after_check_reopened();

drop policy if exists "Technical roles can create validation checks" on public.validation_checks;
create policy "Technical roles can create validation checks"
on public.validation_checks for insert to authenticated
with check (
  public.can_manage_projects()
  and exists (
    select 1 from public.projects project
    where project.id = validation_checks.project_id
      and project.company_id = public.current_company_id()
  )
);

drop policy if exists "Technical roles can update validation checks" on public.validation_checks;
create policy "Technical roles can update validation checks"
on public.validation_checks for update to authenticated
using (
  public.can_manage_projects()
  and exists (
    select 1 from public.projects project
    where project.id = validation_checks.project_id
      and project.company_id = public.current_company_id()
  )
)
with check (
  public.can_manage_projects()
  and exists (
    select 1 from public.projects project
    where project.id = validation_checks.project_id
      and project.company_id = public.current_company_id()
  )
);

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
  if auth.uid() is null or not public.can_manage_projects() then
    raise exception 'project_lock_change_forbidden';
  end if;

  if new.machining_blocked = false and old.machining_blocked is distinct from false
    and exists (
      select 1
      from (
        values
          ('documentacao_tecnica', 'technical_document'),
          ('cotas_furacao', 'technical_document'),
          ('bitolas', 'promob_xml'),
          ('tags_skp', 'promob_xml')
      ) required(check_type, evidence_source)
      where not exists (
        select 1 from public.validation_checks checks
        join public.project_files file on file.id = checks.evidence_file_id
        where checks.project_id = new.id
          and checks.check_type = required.check_type
          and checks.is_completed = true
          and checks.evidence_source = required.evidence_source
          and file.project_id = new.id
          and (
            (required.evidence_source = 'promob_xml' and file.file_type = 'xml')
            or (
              required.evidence_source = 'technical_document'
              and file.file_type in ('cotas_pdf', 'dxf_conferencia')
            )
          )
      )
    ) then
    raise exception 'machining_evidence_incomplete';
  end if;

  if new.is_validated = true and old.is_validated is distinct from true
    and exists (
      select 1
      from (
        values
          ('xml_valido', 'promob_xml', 'xml'),
          ('lista_corte', 'cut_plan_document', 'lista_corte_pdf'),
          ('nesting_dxf', 'nesting_dxf', 'dxf_conferencia'),
          ('materiais', 'promob_xml', 'xml')
      ) required(check_type, evidence_source, file_type)
      where not exists (
        select 1 from public.validation_checks checks
        join public.project_files file on file.id = checks.evidence_file_id
        where checks.project_id = new.id
          and checks.check_type = required.check_type
          and checks.is_completed = true
          and checks.evidence_source = required.evidence_source
          and file.project_id = new.id
          and file.file_type = required.file_type
      )
    ) then
    raise exception 'project_validation_evidence_incomplete';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_part_machining_lock_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.machining_blocked is distinct from old.machining_blocked
    and (auth.uid() is null or not public.can_manage_projects()) then
    raise exception 'part_machining_lock_change_forbidden';
  end if;
  if new.is_completed is distinct from old.is_completed
    and (auth.uid() is null or not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'fabrica'::public.app_role)
      or public.has_role(auth.uid(), 'montador'::public.app_role)
    )) then
    raise exception 'part_completion_change_forbidden';
  end if;
  return new;
end;
$$;

create or replace function public.release_project_machining(_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  missing_checks integer;
begin
  if auth.uid() is null or not public.can_manage_projects() then
    raise exception 'machining_release_forbidden';
  end if;
  if not exists (
    select 1 from public.projects project
    where project.id = _project_id and project.company_id = public.current_company_id()
  ) then
    raise exception 'project_not_found';
  end if;

  select count(*) into missing_checks
  from (
    values
      ('documentacao_tecnica', 'technical_document'),
      ('cotas_furacao', 'technical_document'),
      ('bitolas', 'promob_xml'),
      ('tags_skp', 'promob_xml')
  ) required(check_type, evidence_source)
  where not exists (
    select 1
    from public.validation_checks checks
    where checks.project_id = _project_id
      and checks.check_type = required.check_type
      and checks.is_completed = true
      and checks.evidence_source = required.evidence_source
      and checks.evidence_file_id is not null
      and exists (
        select 1 from public.project_files file
        where file.id = checks.evidence_file_id
          and file.project_id = _project_id
          and (
            (required.evidence_source = 'promob_xml' and file.file_type = 'xml')
            or (
              required.evidence_source = 'technical_document'
              and file.file_type in ('cotas_pdf', 'dxf_conferencia')
            )
          )
      )
  );
  if missing_checks > 0 then raise exception 'machining_evidence_incomplete'; end if;

  update public.parts
  set machining_blocked = false
  where project_id = _project_id and kind in ('peca', 'chapa');
  update public.projects
  set machining_blocked = false, updated_at = now()
  where id = _project_id;
  insert into public.production_logs (project_id, user_id, action, notes)
  values (
    _project_id,
    auth.uid(),
    'liberacao_usinagem',
    'Gate 2 concluido com evidencias XML e documento tecnico vinculados.'
  );
end;
$$;

revoke all on function public.release_project_machining(uuid) from public, anon;
grant execute on function public.release_project_machining(uuid) to authenticated;
