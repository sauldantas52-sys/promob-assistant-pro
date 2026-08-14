module MontaAI
  module Bridge
    class Validation
      def self.audit_model
        model = Sketchup.active_model
        errors = []
        guids = []

        model.entities.each do |entity|
          next unless entity.is_a?(Sketchup::ComponentInstance) || entity.is_a?(Sketchup::Group)
          
          # GUID Duplicado
          if guids.include?(entity.guid)
            errors << { guid: entity.guid, type: "DUPLICATE_GUID", message: "GUID duplicado encontrado." }
          else
            guids << entity.guid
          end

          # Sem Nome
          if entity.name.empty?
            errors << { guid: entity.guid, type: "MISSING_NAME", message: "Item sem nome definido." }
          end

          # Sem Layer Industrial
          unless entity.layer.name.include?("MONTA_AI")
            errors << { guid: entity.guid, type: "INVALID_LAYER", message: "Item fora das tags industriais." }
          end
        end

        errors
      end
    end
  end
end
