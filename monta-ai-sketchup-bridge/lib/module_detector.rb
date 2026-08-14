module MontaAI
  module Bridge
    class ModuleDetector
      def self.detect_environments
        model = Sketchup.active_model
        # No SketchUp, ambientes costumam ser representados por Grupos de alto nível
        # ou por uma convenção de nomenclatura/layer.
        # Aqui buscaremos por Grupos que contenham "Ambiente" no nome ou na Layer.
        environments = []
        
        model.entities.each do |entity|
          next unless entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
          
          if entity.name.downcase.include?("ambiente") || entity.layer.name.downcase.include?("ambiente")
            environments << {
              name: entity.name.empty? ? "Ambiente Sem Nome" : entity.name,
              guid: entity.guid
            }
          end
        end
        
        environments
      end
    end
  end
end
