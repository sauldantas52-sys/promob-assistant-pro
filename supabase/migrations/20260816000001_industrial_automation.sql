-- Gatilho para automação de gates industriais baseado em arquivos
CREATE OR REPLACE FUNCTION public.auto_process_project_gates()
RETURNS TRIGGER AS $$
DECLARE
    v_check_type TEXT;
    v_evidence_source TEXT;
BEGIN
    -- Determinar o gate baseado no tipo de arquivo
    CASE NEW.file_type
        WHEN 'xml' THEN 
            v_check_type := 'xml_valido';
            v_evidence_source := 'promob_xml';
        WHEN 'lista_corte_pdf' THEN 
            v_check_type := 'lista_corte';
            v_evidence_source := 'cut_plan_document';
        WHEN 'dxf_conferencia' THEN 
            v_check_type := 'nesting_dxf';
            v_evidence_source := 'nesting_dxf';
        WHEN 'cotas_pdf' THEN 
            v_check_type := 'documentation_tecnica';
            v_evidence_source := 'technical_document';
        ELSE
            -- Classificação por nome se file_type for genérico
            IF NEW.file_name ILIKE '%.xml' THEN
                v_check_type := 'xml_valido';
                v_evidence_source := 'promob_xml';
            ELSIF NEW.file_name ILIKE '%plano%' OR NEW.file_name ILIKE '%corte%' THEN
                v_check_type := 'lista_corte';
                v_evidence_source := 'cut_plan_document';
            ELSIF NEW.file_name ILIKE '%nesting%' OR NEW.file_name ILIKE '%dxf%' THEN
                v_check_type := 'nesting_dxf';
                v_evidence_source := 'nesting_dxf';
            END IF;
    END CASE;

    -- Se identificamos um gate, atualizamos o checklist
    IF v_check_type IS NOT NULL THEN
        INSERT INTO public.validation_checks (
            project_id, 
            check_type, 
            is_completed, 
            evidence_source, 
            evidence_file_id, 
            completed_at,
            notes
        )
        VALUES (
            NEW.project_id, 
            v_check_type, 
            true, 
            v_evidence_source, 
            NEW.id, 
            now(),
            'Validado automaticamente por detecção de arquivo industrial.'
        )
        ON CONFLICT (project_id, check_type) DO UPDATE
        SET 
            is_completed = true,
            evidence_source = EXCLUDED.evidence_source,
            evidence_file_id = EXCLUDED.evidence_file_id,
            completed_at = now(),
            notes = 'Atualizado automaticamente por novo arquivo industrial.';

        -- Notificar a fábrica
        INSERT INTO public.notifications (project_id, company_id, type, title, message)
        SELECT 
            NEW.project_id, 
            p.company_id, 
            'gate_completed', 
            'GATE AUTOMÁTICO: ' || UPPER(v_check_type),
            'Arquivo industrial detectado e processado: ' || NEW.file_name
        FROM public.projects pr
        JOIN public.profiles p ON p.id = pr.created_by
        WHERE pr.id = NEW.project_id
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar o trigger na tabela project_files
DROP TRIGGER IF EXISTS tr_auto_process_gates ON public.project_files;
CREATE TRIGGER tr_auto_process_gates
AFTER INSERT ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.auto_process_project_gates();

-- Grants
GRANT ALL ON public.validation_checks TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
