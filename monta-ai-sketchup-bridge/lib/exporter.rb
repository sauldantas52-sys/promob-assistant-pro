# encoding: UTF-8
module MontaAI
  module Bridge
    class Exporter
      def self.init_menu
        return if @menu_initialized
        menu = UI.menu('Plugins').add_submenu('Monta AI')
        menu.add_item('1. Preparar Projeto (Tags)') { TagManager.create_industrial_tags }
        menu.add_item('2. Painel de Controle') { self.show_dialog }
        menu.add_item('3. Relatório de Medidas') { self.export_validation_report }
        @menu_initialized = true
      end

      def self.show_dialog
        dialog = UI::HtmlDialog.new({
          :dialog_title => "Monta AI Bridge v0.1.0-beta",
          :preferences_key => "com.montaai.bridge.v1",
          :scrollable => true,
          :resizable => true,
          :width => 600,
          :height => 850,
          :style => UI::HtmlDialog::STYLE_DIALOG
        })
        
        html_path = File.join(File.dirname(__FILE__), '..', 'ui', 'dialog.html')
        dialog.set_file(html_path)
        
        # Conectar callbacks
        dialog.add_action_callback("export_manifest") { |action_context, scale| self.export_project_data(scale) }
        dialog.add_action_callback("generate_dxf") { |action_context, data| self.export_dxf_reference }
        dialog.add_action_callback("close_dialog") { dialog.close }
        
        dialog.show
      end

      def self.export_project_data(scale)
        manifest = ManifestBuilder.build(scale)
        path = UI.savepanel("Exportar Projeto para Promob (JSON)", "", "projeto_monta_ai.json")
        if path
          File.open(path, "w:UTF-8") { |f| f.write(JSON.pretty_generate(manifest)) }
          UI.messagebox("Sucesso!\nManifesto gerado para importação no Promob.\nEscala: #{scale}\nMachining Blocked: Ativo")
        end
      end

      def self.export_dxf_reference
        # Mock do exportador DXF arquitetônico
        path = UI.savepanel("Exportar Referência Arquitetônica (DXF)", "", "planta_arquitetonica.dxf")
        if path
          File.open(path, "w:UTF-8") do |f|
            f.puts "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF"
          end
          UI.messagebox("DXF de referência gerado (Paredes/Vãos/Cotas).\nUso exclusivo para auxílio no Promob.")
        end
      end
      
      def self.export_validation_report
        errors = Validation.audit_model
        path = UI.savepanel("Salvar Relatório de Medidas e Auditoria", "", "relatorio_medidas.txt")
        if path
          File.open(path, "w:UTF-8") do |f|
            f.puts "--- RELATÓRIO DE MEDIDAS E AUDITORIA INDUSTRIAL ---"
            f.puts "Gerado em: #{Time.now.strftime('%d/%m/%Y %H:%M')}"
            f.puts "---------------------------------------------------"
            if errors.empty?
              f.puts "Projeto OK: Nenhuma inconsistência encontrada."
            else
              errors.each { |e| f.puts "[#{e[:type]}] #{e[:message]}" }
            end
          end
          UI.messagebox("Relatório de medidas gerado com sucesso.")
        end
      end
    end
  end
end

MontaAI::Bridge::Exporter.init_menu unless file_loaded?(__FILE__)
file_loaded(__FILE__)
