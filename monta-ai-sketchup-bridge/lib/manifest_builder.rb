# encoding: UTF-8
module MontaAI
  module Bridge
    class ManifestBuilder
      def self.build
        model = Sketchup.active_model
        manifest = {
          plugin_version: "1.0.0",
          project_id: model.get_attribute("MontaAI", "project_id", ""),
          version_number: (model.get_attribute("MontaAI", "version_count", 0) + 1).to_i,
          items: []
        }

        model.entities.each do |entity|
          next unless entity.is_a?(Sketchup::ComponentInstance) || entity.is_a?(Sketchup::Group)
          process_entity(entity, manifest[:items])
        end
        
        # Incrementa contador local
        model.set_attribute("MontaAI", "version_count", manifest[:version_number])
        
        manifest
      end

      def self.process_entity(entity, items_list, environment_id = nil)
        bounds = entity.bounds
        layer_name = entity.layer.name
        
        # Se for um ambiente, passa o ID para os filhos
        current_env = (layer_name == "01_AMBIENTES") ? entity.name : environment_id
        
        item = {
          environment_id: current_env,
          module_id: entity.guid,
          group_code: detect_group(entity),
          module_name: entity.name.empty? ? "Item Sem Nome" : entity.name,
          material: entity.material ? entity.material.name : "Padrão",
          color: entity.material ? entity.material.color.to_a.to_s : "N/A",
          thickness_mm: bounds.depth.to_mm,
          width_mm: bounds.width.to_mm,
          height_mm: bounds.height.to_mm,
          depth_mm: bounds.depth.to_mm,
          position_x: entity.transformation.origin.x.to_mm,
          position_y: entity.transformation.origin.y.to_mm,
          position_z: entity.transformation.origin.z.to_mm,
          tags: [layer_name]
        }
        
        items_list << item

        # Recursividade para componentes aninhados
        if entity.respond_to?(:entities)
          entity.entities.each do |child|
            next unless child.is_a?(Sketchup::ComponentInstance) || child.is_a?(Sketchup::Group)
            process_entity(child, items_list, current_env)
          end
        end
      end

      def self.detect_group(entity)
        layer = entity.layer.name
        return "G1" if layer.include?("03_G1")
        return "G2" if layer.include?("04_G2")
        return "G3" if layer.include?("05_G3")
        return "AV" if layer.include?("06_AV")
        "AV"
      end
    end
  end
end

