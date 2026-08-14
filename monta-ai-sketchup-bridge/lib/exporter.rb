# encoding: UTF-8
require 'sketchup.rb'
require 'json'
require_relative 'manifest_builder'
require_relative 'tag_manager'
require_relative 'validation'
require_relative 'module_detector'

module MontaAI
  module Bridge
    class Exporter
      def self.init_menu
        return if @menu_initialized
        menu = UI.menu('Plugins').add_submenu('Monta AI')
        menu.add_item('Preparar Projeto') { TagManager.create_industrial_tags }
        menu.add_item('Exportar para Monta AI') { self.show_dialog }
        menu.add_item('Salvar Relatório de Validação') { self.export_validation_report }
        @menu_initialized = true
      end

      def self.show_dialog
        dialog = UI::HtmlDialog.new({
          :dialog_title => "Monta AI Bridge",
          :preferences_key => "com.montaai.bridge",
          :scrollable => true,
          :resizable => true,
          :width => 600,
          :height => 800,
          :style => UI::HtmlDialog::STYLE_DIALOG
        })
        
        html_path = File.join(File.dirname(__FILE__), '..', 'ui', 'dialog.html')
        dialog.set_file(html_path)
        
        # Conectar callbacks
        dialog.add_action_callback("export_project") { |action_context, data| self.export_project_data }
        dialog.add_action_callback("export_validation_report") { |action_context, data| self.export_validation_report }
        
        dialog.show
      end

      def self.export_project_data
        manifest = ManifestBuilder.build
        path = UI.savepanel("Salvar Manifesto Monta AI", "", "manifest.json")
        if path
          File.open(path, "w:UTF-8") { |f| f.write(JSON.pretty_generate(manifest)) }
          UI.messagebox("Manifesto salvo com sucesso.")
        end
      end
      
      def self.export_validation_report
        errors = Validation.audit_model
        path = UI.savepanel("Salvar Relatório de Validação", "", "validacao.txt")
        if path
          File.open(path, "w:UTF-8") do |f|
            f.puts "RELATÓRIO DE AUDITORIA INDUSTRIAL - MONTA AI"
            errors.each { |e| f.puts "#{e[:type]}: #{e[:message]} (GUID: #{e[:guid]})" }
          end
        end
      end
    end
  end
end

MontaAI::Bridge::Exporter.init_menu unless file_loaded?(__FILE__)
file_loaded(__FILE__)
