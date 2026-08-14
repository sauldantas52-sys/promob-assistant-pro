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
          items: [],
          is_machining_blocked: true # Contrato Industrial Seguro
        }

        # Processamento recursivo a partir da raiz
        model.entities.each do |entity|
          next unless valid_entity?(entity)
          process_entity(entity, manifest[:items])
        end
        
        # Incrementa contador local
        model.set_attribute("MontaAI", "version_count", manifest[:version_number])
        
        manifest
      end

      def self.valid_entity?(entity)
        entity.is_a?(Sketchup::ComponentInstance) || entity.is_a?(Sketchup::Group)
      end

      def self.process_entity(entity, items_list, environment_name = nil, parent_module_id = nil)
        bounds = entity.bounds
        layer_name = entity.layer.name
        
        # Identificação de Ambientes (Tag 01)
        current_env = (layer_name == "01_AMBIENTES") ? (entity.name.empty? ? "Ambiente Geral" : entity.name) : environment_name
        
        # Classificação Automática G1, G2, G3, AV
        group_code = detect_group(entity)
        
        # Metadados de Módulo/Peça
        item = {
          environment_name: current_env,
          module_id: entity.guid,
          parent_id: parent_module_id,
          group_code: group_code,
          name: entity.name.empty? ? "Item Sem Nome" : entity.name,
          material: entity.material ? entity.material.name : "Padrão",
          color: entity.material ? entity.material.color.to_a.to_s : "N/A",
          width_mm: bounds.width.to_mm.round(2),
          height_mm: bounds.height.to_mm.round(2),
          depth_mm: bounds.depth.to_mm.round(2),
          pos_x: entity.transformation.origin.x.to_mm.round(2),
          pos_y: entity.transformation.origin.y.to_mm.round(2),
          pos_z: entity.transformation.origin.z.to_mm.round(2),
          tags: [layer_name],
          is_machining_blocked: true # Reforço por item
        }
        
        items_list << item

        # Leitura Recursiva de Sub-grupos e Sub-componentes
        definition = entity.is_a?(Sketchup::ComponentInstance) ? entity.definition : entity
        if definition.respond_to?(:entities)
          definition.entities.each do |child|
            next unless valid_entity?(child)
            process_entity(child, items_list, current_env, entity.guid)
          end
        end
      end

      def self.detect_group(entity)
        layer = entity.layer.name
        return "G1" if layer.include?("03_G1")
        return "G2" if layer.include?("04_G2")
        return "G3" if layer.include?("05_G3")
        return "AV" if layer.include?("06_AV")
        
        # Sugestão inteligente baseada em nome se a tag não for explícita
        name = entity.name.upcase
        return "G1" if name.include?("BALCAO") || name.include?("ARMARIO")
        return "G2" if name.include?("PRATELEIRA") || name.include?("DIVISORIA")
        return "G3" if name.include?("PORTA") || name.include?("FRENTE")
        
        "AV"
      end
    end
  end
end

