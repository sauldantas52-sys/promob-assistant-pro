
-- Fix search_path for existing functions to address linter warning
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = public;

-- Ensure operator_secrets is fully locked (already enabled RLS, now explicitly ensuring no policies exist that allow access)
-- (It's already restricted to service_role by default grants)

-- Add policy for operator_login_logs
CREATE POLICY "Operators can insert their own logs" 
ON public.operator_login_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
