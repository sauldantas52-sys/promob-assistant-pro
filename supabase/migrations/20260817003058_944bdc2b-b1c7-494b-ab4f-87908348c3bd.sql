-- 1. Desativar triggers de bloqueio para permitir fluxo livre no piloto
DROP TRIGGER IF EXISTS enforce_project_status_gates_trigger ON public.projects;
DROP TRIGGER IF EXISTS enforce_project_lock_changes_trigger ON public.projects;
DROP TRIGGER IF EXISTS enforce_part_machining_lock_changes_trigger ON public.parts;

-- 2. Alterar valores padrão para não bloqueado
ALTER TABLE public.projects ALTER COLUMN machining_blocked SET DEFAULT false;
ALTER TABLE public.parts ALTER COLUMN machining_blocked SET DEFAULT false;

-- 3. Liberar todos os projetos e peças atuais
UPDATE public.projects SET machining_blocked = false, is_validated = true;
UPDATE public.parts SET machining_blocked = false;

-- 4. Simplificar a função de liberação de usinagem (caso ainda seja chamada via UI)
CREATE OR REPLACE FUNCTION public.release_project_machining(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects 
  SET machining_blocked = false, 
      status = 'usinagem',
      updated_at = now()
  WHERE id = _project_id;
  
  UPDATE public.parts 
  SET machining_blocked = false
  WHERE project_id = _project_id;
END;
$$;

-- 5. Função para importar projeto agora já nasce liberado
CREATE OR REPLACE FUNCTION public.create_complete_client_project(
  _client jsonb,
  _project jsonb,
  _site jsonb,
  _environments jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_company_id uuid := public.current_company_id();
  selected_client_id uuid;
  created_project_id uuid;
  environment_item record;
BEGIN
  IF auth.uid() IS NULL OR tenant_company_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  selected_client_id := nullif(_client->>'id', '')::uuid;
  IF selected_client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = selected_client_id AND clients.company_id = tenant_company_id
    ) THEN
      RAISE EXCEPTION 'client_not_found';
    END IF;
  ELSE
    INSERT INTO public.clients (company_id, name, created_by)
    VALUES (tenant_company_id, trim(_client->>'name'), auth.uid())
    RETURNING id INTO selected_client_id;
  END IF;

  INSERT INTO public.projects (
    company_id, client_id, client_name, name, environment,
    status, machining_blocked, is_validated
  )
  SELECT
    tenant_company_id,
    selected_client_id,
    client.name,
    trim(_project->>'name'),
    (
      SELECT string_agg(trim(value), ', ' ORDER BY ordinality)
      FROM jsonb_array_elements_text(_environments) WITH ORDINALITY
    ),
    'novo',
    false, -- Liberado por padrão no bypass
    true   -- Validado por padrão no bypass
  FROM public.clients client
  WHERE client.id = selected_client_id
  RETURNING id INTO created_project_id;

  RETURN created_project_id;
END;
$$;
