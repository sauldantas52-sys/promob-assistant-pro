
-- 1. Tabela de Notificações em Tempo Real
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id), -- Destinatário (null para broadcast na empresa)
    type text NOT NULL, -- 'gate_completed', 'exception', 'status_change'
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage notifications of their company" ON public.notifications 
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 2. Tabela de Evidências Físicas do Piloto
CREATE TABLE IF NOT EXISTS public.physical_pilot_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    gate_id text NOT NULL, -- 'gate1', 'gate2', 'gate3'
    module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE, -- Validação por armário
    operator_name text NOT NULL,
    evidence_url text, -- Foto da etiqueta/peça
    notes text,
    status text DEFAULT 'pendente', -- 'pendente', 'em_validacao', 'concluido'
    created_at timestamptz DEFAULT now(),
    validated_by uuid REFERENCES auth.users(id),
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.physical_pilot_checks TO authenticated;
GRANT ALL ON public.physical_pilot_checks TO service_role;
ALTER TABLE public.physical_pilot_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage pilot checks of their company" ON public.physical_pilot_checks 
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Trigger para Notificações Automáticas de Gate
CREATE OR REPLACE FUNCTION public.notify_gate_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_project_name text;
    v_company_id uuid;
BEGIN
    SELECT name, company_id INTO v_project_name, v_company_id FROM public.projects WHERE id = NEW.project_id;

    IF NEW.is_completed = true THEN
        INSERT INTO public.notifications (project_id, type, title, message, company_id)
        VALUES (
            NEW.project_id, 
            'gate_completed', 
            'Gate Validado', 
            'O item ' || NEW.check_type || ' do projeto ' || v_project_name || ' foi concluído.',
            v_company_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_gate_completion ON public.validation_checks;
CREATE TRIGGER tr_notify_gate_completion
AFTER INSERT OR UPDATE OF is_completed ON public.validation_checks
FOR EACH ROW WHEN (NEW.is_completed = true)
EXECUTE FUNCTION public.notify_gate_completion();
