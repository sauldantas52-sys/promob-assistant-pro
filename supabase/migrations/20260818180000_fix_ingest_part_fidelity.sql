-- Corrige ingest_and_distribute_project para persistir a FIDELIDADE COMPLETA
-- das peças do XML do Promob: fitas de borda, nomes de fita, fornecedor,
-- cores, sequências de módulo/peça e metadados (usado pelo plano de corte
-- e pelas etiquetas). Sem isso o plano de corte e as etiquetas perdem
-- fitas, material da fita e sequência das peças.

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
                width_mm, height_mm, depth_mm, quantity, id_xml, metadata
            )
            VALUES (
                _project_id, _company_id, _mod->>'name', _mod->>'environment',
                COALESCE((_mod->>'width_mm')::NUMERIC, 0),
                COALESCE((_mod->>'height_mm')::NUMERIC, 0),
                COALESCE((_mod->>'depth_mm')::NUMERIC, 0),
                COALESCE((_mod->>'quantity')::INTEGER, 1),
                _mod->>'id_xml',
                COALESCE(_mod->'metadata', '{}'::jsonb)
            )
            RETURNING id INTO _module_id;

            IF _mod->'parts' IS NOT NULL THEN
                FOR j IN 0 .. jsonb_array_length(_mod->'parts') - 1
                LOOP
                    _part := (_mod->'parts')->j;
                    INSERT INTO public.parts (
                        project_id, module_id, company_id, name, kind,
                        material, thickness_mm, width_mm, length_mm,
                        quantity, repetition, unit, id_xml, parent_id_xml,
                        color, supplier,
                        edge_banding, edge_top, edge_bottom, edge_left, edge_right,
                        edge_name_general, edge_name_front,
                        module_sequence, piece_sequence, quantity_raw,
                        metadata, machining_blocked
                    )
                    VALUES (
                        _project_id, _module_id, _company_id, _part->>'name', _part->>'kind',
                        _part->>'material',
                        COALESCE((_part->>'thickness_mm')::NUMERIC, 0),
                        COALESCE((_part->>'width_mm')::NUMERIC, 0),
                        COALESCE((_part->>'length_mm')::NUMERIC, 0),
                        COALESCE((_part->>'quantity')::INTEGER, 1),
                        COALESCE((_part->>'repetition')::INTEGER, 1),
                        COALESCE(_part->>'unit', 'un'),
                        _part->>'id_xml', _part->>'parent_id_xml',
                        _part->>'color', _part->>'supplier',
                        _part->>'edge_banding',
                        COALESCE((_part->>'edge_top')::NUMERIC, 0),
                        COALESCE((_part->>'edge_bottom')::NUMERIC, 0),
                        COALESCE((_part->>'edge_left')::NUMERIC, 0),
                        COALESCE((_part->>'edge_right')::NUMERIC, 0),
                        _part->>'edge_name_general', _part->>'edge_name_front',
                        COALESCE((_part->>'module_sequence')::INTEGER, NULL),
                        COALESCE((_part->>'piece_sequence')::INTEGER, NULL),
                        COALESCE((_part->>'quantity_raw')::NUMERIC, NULL),
                        COALESCE(_part->'metadata', '{}'::jsonb),
                        FALSE
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
                quantity, repetition, unit, id_xml, parent_id_xml,
                color, supplier,
                edge_banding, edge_top, edge_bottom, edge_left, edge_right,
                edge_name_general, edge_name_front,
                module_sequence, piece_sequence, quantity_raw,
                metadata, machining_blocked
            )
            VALUES (
                _project_id, _company_id, _part->>'name', _part->>'kind',
                _part->>'material',
                COALESCE((_part->>'thickness_mm')::NUMERIC, 0),
                COALESCE((_part->>'width_mm')::NUMERIC, 0),
                COALESCE((_part->>'length_mm')::NUMERIC, 0),
                COALESCE((_part->>'quantity')::INTEGER, 1),
                COALESCE((_part->>'repetition')::INTEGER, 1),
                COALESCE(_part->>'unit', 'un'),
                _part->>'id_xml', _part->>'parent_id_xml',
                _part->>'color', _part->>'supplier',
                _part->>'edge_banding',
                COALESCE((_part->>'edge_top')::NUMERIC, 0),
                COALESCE((_part->>'edge_bottom')::NUMERIC, 0),
                COALESCE((_part->>'edge_left')::NUMERIC, 0),
                COALESCE((_part->>'edge_right')::NUMERIC, 0),
                _part->>'edge_name_general', _part->>'edge_name_front',
                COALESCE((_part->>'module_sequence')::INTEGER, NULL),
                COALESCE((_part->>'piece_sequence')::INTEGER, NULL),
                COALESCE((_part->>'quantity_raw')::NUMERIC, NULL),
                COALESCE(_part->'metadata', '{}'::jsonb),
                FALSE
            );
        END LOOP;
    END IF;

    UPDATE public.projects
    SET ingestion_completed_at = now(), updated_at = now()
    WHERE id = _project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_and_distribute_project(UUID, JSONB[], JSONB[]) TO authenticated;