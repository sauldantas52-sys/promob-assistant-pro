# encoding: UTF-8
module MontaAI
  module Bridge
    class ModuleDetector
      # Simplificado para o novo contrato: focado em Ambientes e Módulos
      def self.get_summary
        model = Sketchup.active_model
        stats = {
          environments: 0,
          walls: 0,
          openings: 0,
          modules: 0,
          dimensions: 0
        }
        
        model.entities.each do |entity|
          case entity.layer.name
          when "01_AMBIENTES" then stats[:environments] += 1
          when "02_PAREDES" then stats[:walls] += 1
          when "03_PORTAS_JANELAS" then stats[:openings] += 1
          when "04_MODULOS" then stats[:modules] += 1
          when "05_COTAS" then stats[:dimensions] += 1
          end
        end
        stats
      end
    end
  end
end
