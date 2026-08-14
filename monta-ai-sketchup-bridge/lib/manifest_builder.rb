# encoding: UTF-8
module MontaAI
  module Bridge
    class ManifestBuilder
      def self.build(scale = "1:20")
        model = Sketchup.active_model
        
        # Obter metadados do projeto salvos no modelo
        project_name = model.get_attribute("MontaAI", "project_name", "Projeto Sem Nome")
        client_name = model.get_attribute("MontaAI", "client_name", "Cliente Não Informado")
        
        manifest = {
          project: project_name,
          client: client_name,
          version_plugin: "0.1.0-beta",
          sketchup_version: Sketchup.version,
          origin_data: "SketchUp Bridge",
          unit: "mm",
          scale: scale,
          origin_point: [0, 0, 0], # Ponto de referência global
          machining_blocked: true, # Contrato Industrial Seguro
          status: "Não confirmado",
          timestamp: Time.now.to_s,
          environments: []
        }

        # Dicionário para organizar por ambiente
        envs_map = {}

        # Processamento recursivo a partir da raiz
        process_entities(model.entities, envs_map, "Geral", nil)
        
        manifest[:environments] = envs_map.values
        
        manifest
      end

      def self.process_entities(entities, envs_map, current_env_name, parent_id)
        entities.each do |entity|
          next unless entity.is_a?(Sketchup::ComponentInstance) || entity.is_a?(Sketchup::Group)
          
          layer_name = entity.layer.name
          
          # Se for a tag de ambiente, atualiza o contexto para os filhos
          if layer_name == "01_AMBIENTES"
            env_name = entity.name.empty? ? "Ambiente" : entity.name
            envs_map[env_name] ||= { name: env_name, modules: [] }
            process_entities(get_definition(entity).entities, envs_map, env_name, entity.guid)
            next
          end

          # Se for um módulo (Tag 04 ou similar)
          if layer_name == "04_MODULOS" || layer_name == "02_MODULOS" # 02_MODULOS suporte legado
            env_name = current_env_name || "Geral"
            envs_map[env_name] ||= { name: env_name, modules: [] }
            
            module_data = extract_module_data(entity, parent_id)
            envs_map[env_name][:modules] << module_data
            
            # Não processamos recursivamente dentro do módulo para o manifest de arquitetura,
            # a menos que precisemos identificar sub-peças como portas/frentes.
            process_sub_items(entity, module_data)
          end
          
          # Se não for módulo nem ambiente, mas tiver filhos, continua a busca (ex: grupos organizacionais)
          if layer_name != "04_MODULOS" && layer_name != "01_AMBIENTES"
            process_entities(get_definition(entity).entities, envs_map, current_env_name, parent_id)
          end
        end
      end

      def self.extract_module_data(entity, parent_id)
        bounds = entity.bounds
        trans = entity.transformation
        
        material = entity.material
        
        {
          guid: entity.guid,
          parent_guid: parent_id,
          name: entity.name.empty? ? "Módulo" : entity.name,
          code: entity.get_attribute("MontaAI", "code", "Não confirmado"),
          width: bounds.width.to_mm.round(2),
          height: bounds.height.to_mm.round(2),
          depth: bounds.depth.to_mm.round(2),
          pos_x: trans.origin.x.to_mm.round(2),
          pos_y: trans.origin.y.to_mm.round(2),
          pos_z: trans.origin.z.to_mm.round(2),
          material: material ? material.name : "Não confirmado",
          color: material ? material.color.to_a.to_s : "Não confirmado",
          thickness: entity.get_attribute("MontaAI", "thickness", "Não confirmado"),
          parts: []
        }
      end
      
      def self.process_sub_items(entity, module_data)
        definition = get_definition(entity)
        definition.entities.each do |child|
          next unless child.is_a?(Sketchup::ComponentInstance) || child.is_a?(Sketchup::Group)
          
          if child.layer.name == "07_PORTAS_FRENTES"
            bounds = child.bounds
            module_data[:parts] << {
              type: "Porta/Frente",
              name: child.name.empty? ? "Peça" : child.name,
              width: bounds.width.to_mm.round(2),
              height: bounds.height.to_mm.round(2),
              depth: bounds.depth.to_mm.round(2)
            }
          end
        end
      end

      def self.get_definition(entity)
        entity.is_a?(Sketchup::ComponentInstance) ? entity.definition : entity
      end
    end
  end
end
