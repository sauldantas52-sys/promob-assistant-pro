-- Recuperação Industrial do Projeto Amanda 111
-- Alimenta a matriz de distribuição baseada nos dados persistidos

DO $$
DECLARE
    v_project_id UUID := '7e5a8bad-7c6c-47a0-b292-63dd367ace7f';
    v_company_id UUID;
    v_module_count INTEGER;
    v_part_count INTEGER;
    v_borda_count INTEGER;
BEGIN
    SELECT company_id INTO v_company_id FROM public.projects WHERE id = v_project_id;
    
    SELECT count(*) INTO v_module_count FROM public.modules WHERE project_id = v_project_id;
    SELECT count(*) INTO v_part_count FROM public.parts WHERE project_id = v_project_id;
    SELECT count(*) INTO v_borda_count FROM public.parts WHERE project_id = v_project_id AND edge_banding IS NOT NULL;

    -- Limpeza de lixo prévio
    DELETE FROM public.project_distribution WHERE project_id = v_project_id;

    -- Distribuição Industrial
    INSERT INTO public.project_distribution (project_id, area, status, item_count, metadata)
    VALUES 
        (v_project_id, 'engenharia', 'alimentado', v_module_count, '{"recovered": true}'::jsonb),
        (v_project_id, 'corte', 'conferencia_pendente', v_part_count, '{"recovered": true}'::jsonb),
        (v_project_id, 'borda', 'conferencia_pendente', v_borda_count, '{"recovered": true}'::jsonb),
        (v_project_id, 'usinagem', 'bloqueado', v_part_count, '{"recovered": true}'::jsonb),
        (v_project_id, 'comercial', 'alimentado', 1, '{"recovered": true}'::jsonb);

    -- Atualiza status operacional
    UPDATE public.projects 
    SET operational_status = 'alimentado',
        is_test = true,
        updated_at = now()
    WHERE id = v_project_id;
END $$;
