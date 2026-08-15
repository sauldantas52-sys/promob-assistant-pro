-- Sincronizando commit 1fbc4d4: Refinamento de Tabelas de Separação e Notificações Industriais

-- 1. Criar tabela de notificações se não existir
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see notifications from their company') THEN
        CREATE POLICY "Users can see notifications from their company"
        ON public.notifications
        FOR SELECT
        TO authenticated
        USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- 2. Criar tabela de checklist físico do piloto
CREATE TABLE IF NOT EXISTS public.physical_pilot_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    operator_id UUID REFERENCES auth.users(id),
    step_key TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    notes TEXT,
    evidence_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.physical_pilot_checks TO authenticated;
GRANT ALL ON public.physical_pilot_checks TO service_role;

ALTER TABLE public.physical_pilot_checks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage physical checks from their company') THEN
        CREATE POLICY "Users can manage physical checks from their company"
        ON public.physical_pilot_checks
        FOR ALL
        TO authenticated
        USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- 3. Adicionar coluna de localização nas peças
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'parts' AND COLUMN_NAME = 'storage_location') THEN
        ALTER TABLE public.parts ADD COLUMN storage_location TEXT;
    END IF;
END $$;

-- 4. Registrar log (usando o perfil atual se disponível para obter o company_id)
INSERT INTO public.operator_login_logs (
    company_id,
    status,
    operator_code
)
SELECT 
    id,
    'SYSTEM_SYNC_1FBC4D4',
    'COMMIT_SYNC'
FROM public.companies
LIMIT 1;
