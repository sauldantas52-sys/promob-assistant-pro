# encoding: UTF-8
module MontaAI
  module Bridge
    class Validation
      def self.audit_model
        model = Sketchup.active_model
        errors = []
        
        # Auditoria recursiva de todas as entidades
        model.entities.each do |entity|
          next unless valid_entity?(entity)
          audit_entity(entity, errors)
        end

        errors
      end

      def self.valid_entity?(entity)
        entity.is_a?(Sketchup::ComponentInstance) || entity.is_a?(Sketchup::Group)
      end

      def self.audit_entity(entity, errors)
        # 1. Validação de Tag Industrial
        unless entity.layer.name =~ /^\d{2}_/
          errors << { 
            guid: entity.guid, 
            type: "TAG_NON_INDUSTRIAL", 
            message: "Item '#{entity.name}' sem tag industrial (Tag atual: #{entity.layer.name}). Use 'Preparar Projeto'." 
          }
        end

        # 2. Validação de Nome
        if entity.name.empty?
          errors << { 
            guid: entity.guid, 
            type: "MISSING_NAME", 
            message: "Objeto detectado sem nome. Identidade industrial comprometida." 
          }
        end

        # 3. Validação de Medidas
        bounds = entity.bounds
        if bounds.width.to_mm < 1 || bounds.height.to_mm < 1 || bounds.depth.to_mm < 1
          errors << {
            guid: entity.guid,
            type: "INVALID_DIMENSIONS",
            message: "Medidas ausentes ou inválidas detectadas no item '#{entity.name}'."
          }
        end

        # Recursividade
        definition = entity.is_a?(Sketchup::ComponentInstance) ? entity.definition : entity
        if definition.respond_to?(:entities)
          definition.entities.each do |child|
            next unless valid_entity?(child)
            audit_entity(child, errors)
          end
        end
      end
    end
  end
end
