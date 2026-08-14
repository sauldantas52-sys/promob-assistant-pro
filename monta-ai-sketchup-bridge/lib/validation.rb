# encoding: UTF-8
module MontaAI
  module Bridge
    class Validation
      def self.audit_model
        model = Sketchup.active_model
        errors = []
        
        model.entities.each do |entity|
          next unless entity.is_a?(Sketchup::ComponentInstance) || entity.is_a?(Sketchup::Group)
          
          # Validação de Tag Industrial
          unless entity.layer.name =~ /^\d{2}_/
            errors << { guid: entity.guid, type: "TAG_NON_INDUSTRIAL", message: "Item sem tag industrial configurada: #{entity.layer.name}" }
          end

          # Validação de Nome
          if entity.name.empty?
            errors << { guid: entity.guid, type: "MISSING_NAME", message: "Item sem nome definido." }
          end
        end

        errors
      end
    end
  end
end
