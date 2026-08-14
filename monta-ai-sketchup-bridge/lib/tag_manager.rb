# encoding: UTF-8
module MontaAI
  module Bridge
    class TagManager
      def self.create_industrial_tags
        model = Sketchup.active_model
        layers = model.layers
        
        tags = [
          "00_REFERENCIAS",
          "01_AMBIENTES",
          "02_PAREDES",
          "03_PORTAS_JANELAS",
          "04_MODULOS",
          "05_COTAS",
          "06_MATERIAIS",
          "07_PORTAS_FRENTES",
          "08_REVISAO",
          "09_NAO_FABRICAVEL"
        ]
        
        model.start_operation('Criar Tags Monta AI', true)
        tags.each do |tag|
          layers.add(tag) unless layers[tag]
        end
        model.commit_operation
        
        UI.messagebox("Tags industriais (00 a 18) criadas com sucesso.")
      end
    end
  end
end
