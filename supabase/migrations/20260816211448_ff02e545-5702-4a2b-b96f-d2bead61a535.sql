CREATE OR REPLACE FUNCTION public.auto_process_project_gates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_id UUID;
    v_file_type TEXT;
    v_company_id UUID;
BEGIN
    v_project_id := NEW.project_id;
    v_file_type := NEW.file_type;
    
    -- Obter ID da empresa
    SELECT company_id INTO v_company_id FROM public.projects WHERE id = v_project_id;

    -- Gate 1: XML Válido e Metadados
    IF v_file_type = 'xml' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_at)
        VALUES (v_project_id, 'xml_valido', true, now())
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, completed_at = now();
        
        -- Marcar materiais como detectados (serão auditados no corte)
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_at)
        VALUES (v_project_id, 'materiais', true, now())
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, completed_at = now();
    END IF;

    -- Gate 2: Lista de Corte (PDF)
    IF v_file_type = 'lista_corte_pdf' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_at)
        VALUES (v_project_id, 'lista_corte', true, now())
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, completed_at = now();
        
        -- Notificar produção que o plano de corte está pronto
        INSERT INTO public.notifications (company_id, user_id, title, message, type)
        SELECT v_company_id, user_id, 'Plano de Corte Disponível', 'A lista de corte para o projeto ' || (SELECT name FROM projects WHERE id = v_project_id) || ' foi importada.', 'production'
        FROM public.user_roles WHERE company_id = v_company_id AND role IN ('admin', 'fabrica');
    END IF;

    -- Gate 3: DXF (Usinagem/Nesting)
    IF v_file_type = 'dxf_conferencia' THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_at)
        VALUES (v_project_id, 'nesting_dxf', true, now())
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, completed_at = now();
    END IF;

    -- Gate 4: Documentação Técnica (Cotas/Manuais)
    IF v_file_type IN ('cotas_pdf', 'imagem_referencia') THEN
        INSERT INTO public.validation_checks (project_id, check_type, is_completed, completed_at)
        VALUES (v_project_id, 'documentacao_tecnica', true, now())
        ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true, completed_at = now();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_process_project_gates ON public.project_files;
CREATE TRIGGER tr_auto_process_project_gates
AFTER INSERT ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.auto_process_project_gates();

GRANT EXECUTE ON FUNCTION public.auto_process_project_gates() TO service_role;