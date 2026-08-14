
-- Add operator fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS operator_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Table for secret passwords (internal use only)
CREATE TABLE IF NOT EXISTS public.operator_secrets (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    secret_password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access control for operator_secrets
GRANT ALL ON public.operator_secrets TO service_role;
ALTER TABLE public.operator_secrets ENABLE ROW LEVEL SECURITY;
-- No public/authenticated policies - service_role only.

-- Table for operator login logs
CREATE TABLE IF NOT EXISTS public.operator_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id),
    operator_code TEXT,
    company_id UUID REFERENCES public.companies(id),
    status TEXT NOT NULL, -- 'success', 'failed', 'locked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access control for operator_login_logs
GRANT SELECT, INSERT ON public.operator_login_logs TO authenticated;
GRANT ALL ON public.operator_login_logs TO service_role;

ALTER TABLE public.operator_login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view logs" ON public.operator_login_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert logs" ON public.operator_login_logs FOR ALL TO service_role USING (true);
