# encoding: UTF-8
module MontaAI
  module Bridge
    class ModuleDetector
      def self.detect_environments
        model = Sketchup.active_model
        environments = []
        
        # Procura por grupos/componentes que estejam na tag 01_AMBIENTES
        model.entities.each do |entity|
          next unless entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
          
          if entity.layer.name == "01_AMBIENTES"
            environments << {
              name: entity.name.empty? ? "Ambiente Sem Nome" : entity.name,
              guid: entity.guid,
              modules: detect_modules(entity)
            }
          end
        end
        
        environments
      end

      def self.detect_modules(env_entity)
        modules = []
        return modules unless env_entity.respond_to?(:entities)
        
        env_entity.entities.each do |entity|
          next unless entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
          if entity.layer.name == "02_MODULOS"
            modules << {
              name: entity.name.empty? ? "Módulo" : entity.name,
              guid: entity.guid
            }
          end
        end
        modules
      end
    end
  end
end
