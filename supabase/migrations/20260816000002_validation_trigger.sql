-- Função para atualizar o status is_validated do projeto
CREATE OR REPLACE FUNCTION public.check_project_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_items integer := 5; -- bitola, medidas, furacao, tags, hierarquia
    completed_items integer;
BEGIN
    -- Conta quantos itens únicos estão marcados como concluídos para este projeto
    SELECT count(*)
    INTO completed_items
    FROM public.validation_checks
    WHERE project_id = NEW.project_id
      AND is_completed = true;

    -- Atualiza a tabela projects
    IF completed_items >= total_items THEN
        UPDATE public.projects
        SET 
            is_validated = true,
            validated_at = now(),
            validated_by = NEW.completed_by
        WHERE id = NEW.project_id;
    ELSE
        UPDATE public.projects
        SET 
            is_validated = false,
            validated_at = NULL,
            validated_by = NULL
        WHERE id = NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger para monitorar o checklist
DROP TRIGGER IF EXISTS tr_update_project_validation ON public.validation_checks;
CREATE TRIGGER tr_update_project_validation
AFTER INSERT OR UPDATE ON public.validation_checks
FOR EACH ROW
EXECUTE FUNCTION public.check_project_validation();
