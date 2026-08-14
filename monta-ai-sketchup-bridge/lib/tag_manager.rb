module MontaAI
  module Bridge
    class TagManager
      def self.create_industrial_tags
        model = Sketchup.active_model
        layers = model.layers
        
        industrial_tags = [
          "MONTA_AI_G1_MODULOS",
          "MONTA_AI_G2_COMPONENTES",
          "MONTA_AI_G3_FERRAGENS",
          "MONTA_AI_AV_ACABAMENTOS",
          "MONTA_AI_LAYOUT_PLANTA"
        ]
        
        industrial_tags.each do |tag|
          layers.add(tag) unless layers[tag]
        end
      end
    end
  end
end
