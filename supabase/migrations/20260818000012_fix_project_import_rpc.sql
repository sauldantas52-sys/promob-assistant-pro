CREATE OR REPLACE FUNCTION public.import_client_project(
    _project_id UUID,
    _project JSONB,
    _files JSONB[],
    _modules JSONB[],
    _loose_parts JSONB[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _company_id UUID;
BEGIN
    SELECT company_id INTO _company_id FROM public.profiles WHERE id = auth.uid();
    
    INSERT INTO public.projects (
        id,
        company_id,
        name,
        client_name,
        environment,
        notes,
        status,
        is_test,
        machining_blocked,
        operational_status
    )
    VALUES (
        _project_id,
        _company_id,
        (_project->>'name'),
        (_project->>'client_name'),
        (_project->>'environment'),
        (_project->>'notes'),
        'novo',
        COALESCE((_project->>'is_test')::BOOLEAN, FALSE),
        FALSE,
        'recebido'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        client_name = EXCLUDED.client_name,
        updated_at = now();

    IF array_upper(_files, 1) IS NOT NULL THEN
        FOR i IN 1 .. array_upper(_files, 1)
        LOOP
            INSERT INTO public.project_files (
                project_id,
                company_id,
                file_name,
                file_type,
                size_bytes,
                storage_path,
                metadata
            )
            VALUES (
                _project_id,
                _company_id,
                (_files[i]->>'file_name'),
                (_files[i]->>'file_type'),
                (_files[i]->>'size_bytes')::BIGINT,
                (_files[i]->>'storage_path'),
                (_files[i]->'summary')
            );
        END LOOP;
    END IF;

    RETURN _project_id;
END;
$$;
