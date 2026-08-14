CREATE TABLE public.validation_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    check_type text NOT NULL, -- 'bitola', 'medidas', 'furacao', 'tags', 'hierarquia'
    is_completed boolean DEFAULT false NOT NULL,
    completed_by uuid REFERENCES auth.users(id),
    completed_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(project_id, check_type)
);

ALTER TABLE public.projects 
ADD COLUMN is_validated boolean DEFAULT false NOT NULL,
ADD COLUMN validated_at timestamptz,
ADD COLUMN validated_by uuid REFERENCES auth.users(id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.validation_checks TO authenticated;
GRANT ALL ON public.validation_checks TO service_role;

ALTER TABLE public.validation_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Escritorio can manage validation checks"
ON public.validation_checks
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'escritorio') OR 
    public.has_role(auth.uid(), 'auditor')
);
