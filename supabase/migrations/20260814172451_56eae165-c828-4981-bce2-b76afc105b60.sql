-- EXPEDIÇÃO E CARGA (Shipping & Loading)

-- 1. Create enum for shipping status
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipping_status') THEN
        CREATE TYPE public.shipping_status AS ENUM ('aguardando', 'conferido', 'bloqueado', 'carregado', 'entregue');
    END IF;
END $$;

-- 2. Create shipping_volumes table
CREATE TABLE IF NOT EXISTS public.shipping_volumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.assembly_groups(id) ON DELETE SET NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status public.shipping_status DEFAULT 'aguardando' NOT NULL,
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

-- 3. Add loading_status to assembly_groups if not present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assembly_groups' AND column_name='loading_status') THEN
        ALTER TABLE public.assembly_groups ADD COLUMN loading_status public.shipping_status DEFAULT 'aguardando';
    END IF;
END $$;

-- 4. Enable RLS and Grants
ALTER TABLE public.shipping_volumes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_volumes TO authenticated;
GRANT ALL ON public.shipping_volumes TO service_role;

-- 5. Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Shipping volumes company access') THEN
        CREATE POLICY "Shipping volumes company access" ON public.shipping_volumes
            FOR ALL TO authenticated
            USING (EXISTS (
                SELECT 1 FROM public.projects p
                WHERE p.id = shipping_volumes.project_id
                AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
            ));
    END IF;
END $$;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_volumes') THEN
        CREATE TRIGGER set_updated_at_volumes
        BEFORE UPDATE ON public.shipping_volumes
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
