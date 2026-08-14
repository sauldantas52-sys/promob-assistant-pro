require_relative 'module_detector'

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

      def self.build_item(entity)
        definition = entity.is_a?(Sketchup::ComponentInstance) ? entity.definition : entity
        bounds = entity.bounds
        
        {
          guid: entity.guid,
          name: entity.name.empty? ? "Item Sem Nome" : entity.name,
          group_code: detect_group(entity),
          dimensions: {
            width: bounds.width.to_mm,
            height: bounds.height.to_mm,
            depth: bounds.depth.to_mm
          },
          position: {
            x: entity.transformation.origin.x.to_mm,
            y: entity.transformation.origin.y.to_mm,
            z: entity.transformation.origin.z.to_mm
          },
          material: entity.material ? entity.material.name : "Padrão",
          layer: entity.layer.name
        }
      end

      def self.detect_group(entity)
        layer_name = entity.layer.name.upcase
        return "G1" if layer_name.include?("G1")
        return "G2" if layer_name.include?("G2")
        return "G3" if layer_name.include?("G3")
        return "AV" if layer_name.include?("AV")
        "UNASSIGNED"
      end
    end
  end
end
