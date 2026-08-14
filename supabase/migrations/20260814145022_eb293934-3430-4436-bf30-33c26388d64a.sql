CREATE TABLE public.part_drillings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id uuid REFERENCES public.parts(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    x_mm decimal NOT NULL,
    y_mm decimal NOT NULL,
    z_mm decimal,
    diameter_mm decimal NOT NULL,
    face varchar(20) NOT NULL,
    is_confirmed boolean DEFAULT false,
    origin varchar(50) DEFAULT 'XML',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.engineering_validations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    part_id uuid REFERENCES public.parts(id) ON DELETE CASCADE,
    file_type varchar(20) NOT NULL,
    file_id uuid REFERENCES public.project_files(id) ON DELETE CASCADE,
    validation_status varchar(30) DEFAULT 'pending',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_drillings TO authenticated;
GRANT ALL ON public.part_drillings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineering_validations TO authenticated;
GRANT ALL ON public.engineering_validations TO service_role;

ALTER TABLE public.part_drillings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage drillings of their company"
ON public.part_drillings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = part_drillings.project_id
        AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Users can manage validations of their company"
ON public.engineering_validations
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = engineering_validations.project_id
        AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);
