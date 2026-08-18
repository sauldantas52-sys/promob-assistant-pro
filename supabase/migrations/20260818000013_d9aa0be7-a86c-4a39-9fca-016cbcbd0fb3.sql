-- Ajuste Final da Função de Ingestão para tratar valores nulos
CREATE OR REPLACE FUNCTION public.ingest_and_distribute_project(
    _project_id UUID,
    _modules JSONB[],
    _loose_parts JSONB[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _company_id UUID;
    _module_id UUID;
    _mod JSONB;
    _part JSONB;
BEGIN
    SELECT company_id INTO _company_id FROM public.projects WHERE id = _project_id;
    
    DELETE FROM public.parts WHERE project_id = _project_id;
    DELETE FROM public.modules WHERE project_id = _project_id;

    IF _modules IS NOT NULL THEN
        FOR i IN 1 .. array_upper(_modules, 1)
        LOOP
            _mod := _modules[i];
            INSERT INTO public.modules (
                project_id, company_id, name, environment, 
                width_mm, height_mm, depth_mm, quantity, id_xml
            )
            VALUES (
                _project_id, _company_id, _mod->>'name', _mod->>'environment',
                COALESCE((_mod->>'width_mm')::NUMERIC, 0), 
                COALESCE((_mod->>'height_mm')::NUMERIC, 0), 
                COALESCE((_mod->>'depth_mm')::NUMERIC, 0), 
                COALESCE((_mod->>'quantity')::INTEGER, 1), 
                _mod->>'id_xml'
            )
            RETURNING id INTO _module_id;

            IF _mod->'parts' IS NOT NULL THEN
                FOR j IN 0 .. jsonb_array_length(_mod->'parts') - 1
                LOOP
                    _part := (_mod->'parts')->j;
                    INSERT INTO public.parts (
                        project_id, module_id, company_id, name, kind, 
                        material, thickness_mm, width_mm, length_mm, 
                        quantity, repetition, id_xml, color
                    )
                    VALUES (
                        _project_id, _module_id, _company_id, _part->>'name', _part->>'kind',
                        _part->>'material', 
                        COALESCE((_part->>'thickness_mm')::NUMERIC, 0), 
                        COALESCE((_part->>'width_mm')::NUMERIC, 0), 
                        COALESCE((_part->>'length_mm')::NUMERIC, 0),
                        COALESCE((_part->>'quantity')::INTEGER, 1), 
                        COALESCE((_part->>'repetition')::INTEGER, 1), 
                        _part->>'id_xml', _part->>'color'
                    );
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    IF _loose_parts IS NOT NULL THEN
        FOR k IN 1 .. array_upper(_loose_parts, 1)
        LOOP
            _part := _loose_parts[k];
            INSERT INTO public.parts (
                project_id, company_id, name, kind, 
                material, thickness_mm, width_mm, length_mm, 
                quantity, repetition, id_xml, color
            )
            VALUES (
                _project_id, _company_id, _part->>'name', _part->>'kind',
                _part->>'material', 
                COALESCE((_part->>'thickness_mm')::NUMERIC, 0), 
                COALESCE((_part->>'width_mm')::NUMERIC, 0), 
                COALESCE((_part->>'length_mm')::NUMERIC, 0),
                COALESCE((_part->>'quantity')::INTEGER, 1), 
                COALESCE((_part->>'repetition')::INTEGER, 1), 
                _part->>'id_xml', _part->>'color'
            );
        END LOOP;
    END IF;

    UPDATE public.projects 
    SET ingestion_completed_at = now(), updated_at = now() 
    WHERE id = _project_id;
END;
$$;
