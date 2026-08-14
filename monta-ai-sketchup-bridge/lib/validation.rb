# encoding: UTF-8
module MontaAI
  module Bridge
    class Validation
      def self.audit_model
        model = Sketchup.active_model
        errors = []
        
        # 1. Verificar Origem do Projeto
        # Idealmente 0,0,0
        
        # 2. Auditoria recursiva de todas as entidades
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
        layer_name = entity.layer.name
        
        # 1. Validação de Tag Industrial conforme novo contrato
        allowed_tags = [
          "00_REFERENCIAS", "01_AMBIENTES", "02_PAREDES", "03_PORTAS_JANELAS",
          "04_MODULOS", "05_COTAS", "06_MATERIAIS", "07_PORTAS_FRENTES",
          "08_REVISAO", "09_NAO_FABRICAVEL"
        ]
        
        unless allowed_tags.include?(layer_name)
          errors << { 
            guid: entity.guid, 
            type: "INVALID_TAG", 
            message: "Item '#{entity.name}' em tag não reconhecida: #{layer_name}." 
          }
        end

        # 2. Validação de Medidas e Identificação
        if entity.name.empty? && layer_name == "04_MODULOS"
          errors << { 
            guid: entity.guid, 
            type: "MISSING_NAME", 
            message: "Módulo sem nome detectado." 
          }
        end

        bounds = entity.bounds
        if (bounds.width.to_mm < 1 || bounds.height.to_mm < 1 || bounds.depth.to_mm < 1) && layer_name != "05_COTAS"
          errors << {
            guid: entity.guid,
            type: "UNCONFIRMED_MEASURE",
            message: "Medida não confirmada ou inválida no item '#{entity.name}'."
          }
        end

        # 3. Materiais
        if layer_name == "04_MODULOS" && !entity.material
          errors << {
            guid: entity.guid,
            type: "MISSING_MATERIAL",
            message: "Material 'Não confirmado' no módulo '#{entity.name}'."
          }
        end

        # Recursividade controlada
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
