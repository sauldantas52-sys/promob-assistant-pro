-- Migração 20260819_auto_process_gates: Alimentação automática de processos industriais

create or replace function public.auto_process_project_gates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    xml_file_id uuid;
    cut_pdf_id uuid;
    dxf_id uuid;
begin
    -- 1. Buscar arquivos técnicos recém importados
    select id into xml_file_id from public.project_files 
    where project_id = new.id and file_type = 'xml' limit 1;
    
    select id into cut_pdf_id from public.project_files 
    where project_id = new.id and file_type = 'lista_corte_pdf' limit 1;
    
    select id into dxf_id from public.project_files 
    where project_id = new.id and file_type = 'dxf_conferencia' limit 1;

    -- 2. Alimentar Gate 1 (Corte e Borda)
    if xml_file_id is not null then
        insert into public.validation_checks (project_id, check_type, is_completed, evidence_source, evidence_file_id, completed_by)
        values (new.id, 'xml_valido', true, 'promob_xml', xml_file_id, auth.uid())
        on conflict (project_id, check_type) do update set is_completed = true, evidence_file_id = xml_file_id;
        
        insert into public.validation_checks (project_id, check_type, is_completed, evidence_source, evidence_file_id, completed_by)
        values (new.id, 'materiais', true, 'promob_xml', xml_file_id, auth.uid())
        on conflict (project_id, check_type) do update set is_completed = true, evidence_file_id = xml_file_id;
        
        insert into public.validation_checks (project_id, check_type, is_completed, evidence_source, evidence_file_id, completed_by)
        values (new.id, 'bitolas', true, 'promob_xml', xml_file_id, auth.uid())
        on conflict (project_id, check_type) do update set is_completed = true, evidence_file_id = xml_file_id;
        
        insert into public.validation_checks (project_id, check_type, is_completed, evidence_source, evidence_file_id, completed_by)
        values (new.id, 'tags_skp', true, 'promob_xml', xml_file_id, auth.uid())
        on conflict (project_id, check_type) do update set is_completed = true, evidence_file_id = xml_file_id;
    end if;

    if cut_pdf_id is not null then
        insert into public.validation_checks (project_id, check_type, is_completed, evidence_source, evidence_file_id, completed_by)
        values (new.id, 'lista_corte', true, 'cut_plan_document', cut_pdf_id, auth.uid())
        on conflict (project_id, check_type) do update set is_completed = true, evidence_file_id = cut_pdf_id;
    end if;

    if dxf_id is not null then
        insert into public.validation_checks (project_id, check_type, is_completed, evidence_source, evidence_file_id, completed_by)
        values (new.id, 'nesting_dxf', true, 'nesting_dxf', dxf_id, auth.uid())
        on conflict (project_id, check_type) do update set is_completed = true, evidence_file_id = dxf_id;
    end if;

    -- 3. Notificar Produção
    if cut_pdf_id is not null then
        insert into public.notifications (project_id, company_id, type, title, message)
        values (new.id, new.company_id, 'operational', 'Plano de Corte Disponível', 'O projeto ' || new.name || ' foi importado e a lista de corte já está processada.');
    end if;

    return new;
end;
$$;

drop trigger if exists auto_process_gates_trigger on public.projects;
create trigger auto_process_gates_trigger
after insert on public.projects
for each row execute function public.auto_process_project_gates();
