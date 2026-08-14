# encoding: UTF-8
module MontaAI
  module Bridge
    class TagManager
      def self.create_industrial_tags
        model = Sketchup.active_model
        layers = model.layers
        
        tags = [
          "00_REFERENCIAS", "01_AMBIENTES", "02_MODULOS", "03_G1", "04_G2", 
          "05_G3", "06_AV", "07_PORTAS_FRENTES", "08_ESTRUTURA", "09_INTERNOS", 
          "10_FERRAGENS_VISUAIS", "11_COTAS", "12_MATERIAIS", "13_NAO_FABRICAVEL", 
          "14_PROCESSO_CORTE", "15_PROCESSO_BORDA", "16_PROCESSO_USINAGEM", 
          "17_PROCESSO_SEPARACAO", "18_MONTAGEM"
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
