require 'sketchup.rb'
require 'extensions.rb'

module MontaAI
  module Bridge
    unless file_loaded?(__FILE__)
      ex = SketchupExtension.new('Monta AI Bridge', 'monta-ai-sketchup-bridge/main.rb')
      ex.description = 'Ponte industrial para preparação de ambientes e exportação para o Monta AI.'
      ex.version     = '0.1.0-beta'
      ex.copyright   = 'Monta AI © 2026'
      ex.creator     = 'Monta AI Industrial'
      Sketchup.register_extension(ex, true)
      file_loaded(__FILE__)
    end
  end
end
