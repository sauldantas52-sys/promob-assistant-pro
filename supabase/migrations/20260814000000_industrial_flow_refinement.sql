-- Esta migration foi publicada com timestamp anterior às tabelas-base.
-- Em replay limpo, as alterações são reaplicadas pela migration de hardening.
DO $$
BEGIN
  IF to_regclass('public.parts') IS NOT NULL THEN
    ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS storage_location TEXT;
    GRANT ALL ON public.parts TO authenticated;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assembly_photos JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assembly_notes TEXT;
    GRANT ALL ON public.projects TO authenticated;
  END IF;

  IF to_regclass('public.shipping_volumes') IS NOT NULL THEN
    GRANT ALL ON public.shipping_volumes TO authenticated;
  END IF;
END
$$;

-- Garantir que shipping_volumes tenha driver_name e vehicle_plate (já existem, mas vamos garantir metadados)
-- A tabela shipping_volumes já possui: driver_name, vehicle_plate, photo_url, delivered_at
