require 'net/http'
require 'uri'

module MontaAI
  module Bridge
    class APIClient
      def self.send_package(manifest, company_token)
        # Placeholder para envio HTTPS
        # O Ruby do SketchUp exige cuidados com SSL em versões antigas
        puts "Enviando pacote para Monta AI..."
        puts "Empresa Token: #{company_token}"
        # Lógica real de post via Net::HTTP
      end
    end
  end
end
