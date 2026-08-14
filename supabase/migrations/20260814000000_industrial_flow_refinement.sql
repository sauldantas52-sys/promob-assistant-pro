-- Adicionar localização física às peças
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS storage_location TEXT;

-- Garantir que shipping_volumes tenha driver_name e vehicle_plate (já existem, mas vamos garantir metadados)
-- A tabela shipping_volumes já possui: driver_name, vehicle_plate, photo_url, delivered_at

-- Adicionar campo para fotos de montagem no banco se não existir
-- Vamos usar uma tabela de logs ou estender o projeto
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assembly_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assembly_notes TEXT;

-- Grant permissions (necessário para as novas colunas serem acessíveis via API)
GRANT ALL ON public.parts TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.shipping_volumes TO authenticated;

-- Notificamos o sistema sobre as alterações de esquema
