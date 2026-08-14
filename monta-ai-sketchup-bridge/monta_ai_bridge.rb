require 'sketchup.rb'
require 'extensions.rb'

module MontaAI
  module Bridge
    unless file_loaded?(__FILE__)
      ex = SketchupExtension.new('Monta AI Bridge', 'lib/exporter.rb')
      ex.description = 'Ponte de dados entre SketchUp e Monta AI.'
      ex.version     = '0.1.0'
      ex.copyright   = 'Monta AI © 2026'
      ex.creator     = 'Monta AI Team'
      Sketchup.register_extension(ex, true)
      file_loaded(__FILE__)
    end
  end
end
