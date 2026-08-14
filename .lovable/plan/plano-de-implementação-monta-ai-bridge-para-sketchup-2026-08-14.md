# Plano de Implementação: Monta AI Bridge para SketchUp

Este plano estabelece a base técnica e a estrutura de arquivos para o plugin Ruby do SketchUp, garantindo a integração com o ecossistema Monta AI sem comprometer a autoridade de fabricação do Promob.

## 1. Estrutura do Plugin
O código será organizado seguindo as melhores práticas da SketchUp Ruby API:
- `monta_ai_bridge.rb`: Ponto de entrada (Extension loader).
- `lib/`: Módulos de lógica (Exportação, Tags, Validação, API).
- `ui/`: Interface gráfica (HtmlDialog).

## 2. Funcionalidades Principais
### Preparação e Tags
- Criação automática de camadas industriais: `MONTA_AI_G1_MODULOS`, `MONTA_AI_G2_COMPONENTES`, etc.
- Ferramenta de organização para mover componentes para as tags corretas.

### Auditoria e Validação
- Verificação de GUIDs duplicados.
- Identificação de módulos sem nome ou dimensões zeradas.
- Relatório visual de erros antes da exportação.

### Exportação e Manifesto
- Geração de `manifest.json` com coordenadas (X, Y, Z), dimensões e metadados.
- Exportação do arquivo `.skp` e geração automática de miniaturas (.png).

## 3. Modos de Operação
- **Modo Local (Demo):** Permite validar a estrutura e gerar o manifesto localmente para conferência.
- **Modo Conectado:** Autenticação via token temporário e envio seguro para o endpoint `processSkpPackage`.

## 4. Segurança Industrial
- Invariante: `is_machining_assembly_blocked: true`.
- O plugin não gera furação ou caminhos de ferramenta (G-Code).
- Focado estritamente em geometria, layout e organização de montagem.

## Detalhes Técnicos
- **Linguagem:** Ruby (API SketchUp).
- **Interface:** HTML5/CSS3 via `UI::HtmlDialog`.
- **Comunicação:** `Net::HTTP` para sincronização com a nuvem Monta AI.
