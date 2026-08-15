create or replace function public.validate_maintenance_request_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if new.company_id <> public.current_company_id() then
    raise exception 'maintenance_company_mismatch';
  end if;

  if not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.company_id = new.company_id
  ) then
    raise exception 'maintenance_project_mismatch';
  end if;

  if new.module_id is not null and not exists (
    select 1 from public.modules m
    where m.id = new.module_id and m.project_id = new.project_id
  ) then
    raise exception 'maintenance_module_mismatch';
  end if;

  if new.part_id is not null and not exists (
    select 1 from public.parts pt
    where pt.id = new.part_id
      and pt.project_id = new.project_id
      and (new.module_id is null or pt.module_id = new.module_id)
  ) then
    raise exception 'maintenance_part_mismatch';
  end if;

  if tg_op = 'INSERT' and not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    or public.has_role(auth.uid(), 'montador'::public.app_role)
  ) then
    raise exception 'maintenance_create_forbidden';
  end if;

  if tg_op = 'INSERT' and new.created_by <> auth.uid() then
    raise exception 'maintenance_creator_mismatch';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.company_id is distinct from old.company_id
    or new.project_id is distinct from old.project_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'maintenance_identity_immutable';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status and not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  ) then
    raise exception 'maintenance_transition_forbidden';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_maintenance_request_scope_trigger
on public.maintenance_requests;

create trigger validate_maintenance_request_scope_trigger
before insert or update on public.maintenance_requests
for each row execute function public.validate_maintenance_request_scope();

-- Status and audit history are writable only through the atomic RPC below.
revoke update on public.maintenance_requests from authenticated;
grant update (
  module_id,
  part_id,
  description,
  type,
  urgency,
  photos,
  deadline,
  audio_url
) on public.maintenance_requests to authenticated;
revoke insert on public.maintenance_history from authenticated;

create or replace function public.record_maintenance_transition(
  _request_id uuid,
  _new_status public.maintenance_status,
  _notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_request public.maintenance_requests%rowtype;
begin
  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  ) then
    raise exception 'maintenance_transition_forbidden';
  end if;

  if length(trim(coalesce(_notes, ''))) < 5 then
    raise exception 'maintenance_notes_required';
  end if;

  select * into current_request
  from public.maintenance_requests
  where id = _request_id
    and company_id = public.current_company_id()
  for update;

  if not found then
    raise exception 'maintenance_request_not_found';
  end if;

  if _new_status::text is distinct from (case current_request.status::text
    when 'aberto' then 'em_analise'
    when 'em_analise' then 'producao'
    when 'producao' then 'enviado'
    when 'enviado' then 'concluido'
    else null
  end) then
    raise exception 'maintenance_transition_must_be_sequential';
  end if;

  update public.maintenance_requests
  set status = _new_status
  where id = _request_id;

  insert into public.maintenance_history (
    request_id,
    created_by,
    old_status,
    new_status,
    notes
  ) values (
    _request_id,
    auth.uid(),
    current_request.status,
    _new_status,
    trim(_notes)
  );
end;
$$;

revoke all on function public.record_maintenance_transition(
  uuid,
  public.maintenance_status,
  text
) from public, anon;
grant execute on function public.record_maintenance_transition(
  uuid,
  public.maintenance_status,
  text
) to authenticated;
