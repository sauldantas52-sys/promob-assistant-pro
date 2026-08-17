ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;
UPDATE public.projects SET is_test = true WHERE name ILIKE '%amanda%';
