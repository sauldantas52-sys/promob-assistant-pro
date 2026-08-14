# encoding: UTF-8
module MontaAI
  module Bridge
    class ManifestBuilder
      def self.build
        model = Sketchup.active_model
        manifest = {
          project: {
            name: model.title || "Projeto Sem Nome",
            source: "SketchUp Bridge",
            version: "1.0",
            is_machining_assembly_blocked: true,
            environments: ModuleDetector.detect_environments
          },
          items: []
        }

        model.entities.each do |entity|
          next unless entity.is_a?(Sketchup::ComponentInstance) || entity.is_a?(Sketchup::Group)
          manifest[:items] << build_item(entity)
        end
        manifest
      end

      def self.build_item(entity, depth = 0)
        bounds = entity.bounds
        definition = entity.is_a?(Sketchup::ComponentInstance) ? entity.definition : entity
        
        data = {
          guid: entity.guid,
          name: entity.name.empty? ? "Item Sem Nome" : entity.name,
          layer: entity.layer.name,
          dimensions: { w: bounds.width.to_mm, h: bounds.height.to_mm, d: bounds.depth.to_mm },
          position: { x: entity.transformation.origin.x.to_mm, y: entity.transformation.origin.y.to_mm, z: entity.transformation.origin.z.to_mm },
          material: entity.material ? entity.material.name : "Padrão"
        }
        
        # Identificação recursiva simplificada
        if entity.respond_to?(:entities)
          data[:children] = entity.entities.map { |e| build_item(e, depth + 1) if e.is_a?(Sketchup::ComponentInstance) || e.is_a?(Sketchup::Group) }.compact
        end
        
        data
      end
    end
  end
end
