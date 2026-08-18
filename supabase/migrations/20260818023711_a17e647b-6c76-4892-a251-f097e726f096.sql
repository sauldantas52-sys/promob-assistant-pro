CREATE TABLE public.executive_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(project_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_books TO authenticated;
GRANT ALL ON public.executive_books TO service_role;

ALTER TABLE public.executive_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage executive books for their company"
    ON public.executive_books
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id = executive_books.company_id
        )
    );
