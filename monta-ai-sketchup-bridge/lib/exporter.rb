require 'sketchup.rb'
require 'json'
require_relative 'manifest_builder'
require_relative 'tag_manager'
require_relative 'validation'
require_relative 'api_client'
require_relative 'module_detector'


module MontaAI
  module Bridge
    class Exporter
      def self.init_menu
        menu = UI.menu('Plugins').add_submenu('Monta AI')
        menu.add_item('Preparar Projeto') { self.prepare_project }
        menu.add_item('Exportar para Monta AI') { self.show_dialog }
        menu.add_item('Configurações') { self.settings }
      end

      def self.prepare_project
        TagManager.create_industrial_tags
        UI.messagebox("Tags Industriais (G1, G2, G3, AV) criadas com sucesso.")
      end

      def self.show_dialog
        # Implementação do diálogo UI
        dialog = UI::HtmlDialog.new({
          :dialog_title => "Monta AI Bridge",
          :preferences_key => "com.montaai.bridge",
          :scrollable => true,
          :resizable => true,
          :width => 600,
          :height => 800,
          :style => UI::HtmlDialog::STYLE_DIALOG
        })
        
        html_path = File.join(__dir__, '..', 'ui', 'dialog.html')
        dialog.set_file(html_path)
        dialog.show
      end

      def self.settings
        UI.messagebox("Configurações do Plugin Monta AI.")
      end
    end
  end
end

MontaAI::Bridge::Exporter.init_menu unless file_loaded?(__FILE__)
file_loaded(__FILE__)
