CREATE OR REPLACE FUNCTION public.initialize_production_tracking(p_project_id uuid, p_company_id uuid, p_steps jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_step RECORD;
    v_type text;
BEGIN
    FOR v_step IN
        SELECT * FROM jsonb_to_recordset(p_steps)
        AS x("physicalId" text, "partId" uuid, "moduleId" uuid)
    LOOP
        FOREACH v_type IN ARRAY ARRAY['corte','borda','usinagem','separacao','montagem']
        LOOP
            INSERT INTO production_steps (project_id, company_id, part_id, module_id, physical_id, step_type, status)
            VALUES (p_project_id, p_company_id, v_step."partId", v_step."moduleId", v_step."physicalId", v_type, 'pendente')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$function$;