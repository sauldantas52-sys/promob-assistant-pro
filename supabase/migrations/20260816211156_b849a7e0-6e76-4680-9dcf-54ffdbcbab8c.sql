-- Hardening da Função de Automação de Gates
-- Adicionando search_path e revogando acesso público direto

CREATE OR REPLACE FUNCTION public.auto_process_project_gates()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id UUID;
    v_company_id UUID;
    v_file_type TEXT;
    v_user_id UUID;
BEGIN
    v_project_id := NEW.project_id;
    v_file_type := NEW.file_type;
    
    SELECT company_id INTO v_company_id FROM public.projects WHERE id = v_project_id;
    
    -- Busca o criador da sessão de importação para auditoria
    SELECT created_by INTO v_user_id 
    FROM public.project_import_sessions 
    WHERE id = v_project_id 
    LIMIT 1;

    -- Gate 1: Corte e Borda (Itens técnicos do XML)
    IF v_file_type = 'xml' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'xml_valido', true, v_user_id, 'promob_xml', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;
        
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'materiais', true, v_user_id, 'promob_xml', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;

        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'bitolas', true, v_user_id, 'promob_xml', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;

        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'tags_skp', true, v_user_id, 'promob_xml', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;
    END IF;

    -- Lista de Corte PDF
    IF v_file_type = 'lista_corte_pdf' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'lista_corte', true, v_user_id, 'cut_plan_document', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;
    END IF;

    -- Nesting / DXF
    IF v_file_type = 'dxf_conferencia' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'nesting_dxf', true, v_user_id, 'nesting_dxf', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;
    END IF;

    -- Gate 2: Usinagem (Documentação Técnica)
    IF v_file_type IN ('cotas_pdf', 'dxf_conferencia') THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'documentacao_tecnica', true, v_user_id, 'technical_document', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;

        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'cotas_furacao', true, v_user_id, 'technical_document', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoga execução pública da função de trigger (deve ser chamada apenas pelo sistema)
REVOKE EXECUTE ON FUNCTION public.auto_process_project_gates() FROM public;
GRANT EXECUTE ON FUNCTION public.auto_process_project_gates() TO service_role;
