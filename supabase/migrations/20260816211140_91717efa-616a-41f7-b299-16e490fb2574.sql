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
    SELECT created_by INTO v_user_id FROM public.project_import_sessions WHERE id = v_project_id LIMIT 1;

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

    IF v_file_type = 'lista_corte_pdf' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'lista_corte', true, v_user_id, 'cut_plan_document', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;
    END IF;

    IF v_file_type = 'dxf_conferencia' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_by, evidence_source, evidence_file_id)
        VALUES (v_project_id, 'nesting_dxf', true, v_user_id, 'nesting_dxf', NEW.id)
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, evidence_file_id = NEW.id;
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_process_project_gates ON public.project_files;
CREATE TRIGGER tr_auto_process_project_gates
AFTER INSERT ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.auto_process_project_gates();