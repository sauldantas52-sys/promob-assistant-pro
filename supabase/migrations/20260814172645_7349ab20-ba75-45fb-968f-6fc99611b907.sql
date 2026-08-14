-- 1. Sync enum if possible (but we can use text for now)
-- 2. Drop the redundant shipping_volumes table if it was created differently
DROP TABLE IF EXISTS public.shipping_volumes CASCADE;

-- 3. Re-create shipping_volumes with the correct robust schema for Traceability 4.0
CREATE TABLE public.shipping_volumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.assembly_groups(id) ON DELETE SET NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'aguardando' NOT NULL,
    weight_kg DECIMAL(10,2),
    photo_url TEXT,
    vehicle_plate TEXT,
    driver_name TEXT,
    responsible_id UUID REFERENCES auth.users(id),
    scanned_at TIMESTAMPTZ,
    loaded_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS and Grants
ALTER TABLE public.shipping_volumes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_volumes TO authenticated;
GRANT ALL ON public.shipping_volumes TO service_role;

-- 5. Policies
CREATE POLICY "Shipping volumes company access" ON public.shipping_volumes
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = shipping_volumes.project_id
        AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    ));

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_volumes ON public.shipping_volumes;
CREATE TRIGGER set_updated_at_volumes
BEFORE UPDATE ON public.shipping_volumes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
