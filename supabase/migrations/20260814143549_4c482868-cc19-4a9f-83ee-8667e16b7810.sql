-- 1. Add data_source and visibility_type to modules and parts
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='modules' AND column_name='data_source') THEN
    ALTER TABLE public.modules ADD COLUMN data_source text DEFAULT 'XML';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='data_source') THEN
    ALTER TABLE public.parts ADD COLUMN data_source text DEFAULT 'XML';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='visibility_type') THEN
    ALTER TABLE public.parts ADD COLUMN visibility_type text DEFAULT 'visivel';
  END IF;
END $$;

-- 2. Update production_logs
CREATE TABLE IF NOT EXISTS public.production_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    action text NOT NULL,
    status_from text,
    status_to text,
    notes text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT ON public.production_logs TO authenticated;
GRANT ALL ON public.production_logs TO service_role;

ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert logs for their projects"
ON public.production_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view logs for their projects"
ON public.production_logs
FOR SELECT
TO authenticated
USING (true);

-- 3. Ensure assembly_groups exists
CREATE TABLE IF NOT EXISTS public.assembly_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_groups TO authenticated;
GRANT ALL ON public.assembly_groups TO service_role;

ALTER TABLE public.assembly_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage assembly groups"
ON public.assembly_groups
FOR ALL
TO authenticated
USING (true);

-- 4. Add assembly_group_id to parts if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='assembly_group_id') THEN
    ALTER TABLE public.parts ADD COLUMN assembly_group_id uuid REFERENCES public.assembly_groups(id) ON DELETE SET NULL;
  END IF;
END $$;
