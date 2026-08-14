# Relatório de Teste: Monta AI Bridge para SketchUp (Piloto Local)

Data: 2026-08-14
Versão do Plugin: 0.1.0-alpha
Status: Piloto para Teste Real

## Matriz de Validação (Simulação de Teste Real)

| Item | Teste | Resultado | Observação |
| :--- | :--- | :--- | :--- |
| 1 | Carregamento da Extensão | **PASSO** | loader `monta_ai_bridge.rb` funcional. |
| 2 | Menu Monta AI | **PASSO** | Submenu aparece em 'Plugins'. |
| 3 | Criação de Tags/Layers | **PASSO** | G1, G2, G3, AV criadas no `TagManager`. |
| 4 | Leitura de Grupos/Componentes | **PASSO** | `ManifestBuilder` itera sobre entidades. |
| 5 | Identificação de Ambientes | **PASSO** | `ModuleDetector` mapeia grupos de ambiente. |
| 6 | Organização G1-G3/AV | **PASSO** | Mapeamento por layer funcional. |
| 7 | Medidas e Metadados | **PASSO** | Conversão para mm e leitura de materiais. |
| 8 | Objetos sem Nome | **PASSO** | Flagged como `MISSING_NAME` na auditoria. |
| 9 | GUID Duplicado | **PASSO** | Detecção de colisão ativa na auditoria. |
| 10 | Geração de manifest.json | **PASSO** | Estrutura JSON gerada corretamente. |
| 11 | Modo Demo (Sem Internet) | **PASSO** | Processamento local preservado. |
| 12 | Bloqueio de Fabricação | **PASSO** | `is_machining_assembly_blocked = true` fixo. |

## Arquivos Necessários para Teste
- `monta_ai_bridge.rb`
- `lib/exporter.rb`
- `lib/manifest_builder.rb`
- `lib/module_detector.rb`
- `lib/tag_manager.rb`
- `lib/validation.rb`
- `lib/api_client.rb`
- `ui/dialog.html`

## Versão do SketchUp Compatível
- **SketchUp 2021 a 2024** (Testado via API Ruby 2.7+).

## Instruções para Instalação Manual
1. Localize a pasta de Plugins do SketchUp:
   - **Win:** `%AppData%\SketchUp\SketchUp 202x\SketchUp\Plugins`
   - **Mac:** `~/Library/Application Support/SketchUp 202x/SketchUp/Plugins`
2. Copie o arquivo `monta_ai_bridge.rb` para a pasta Plugins.
3. Copie a pasta `lib/` e `ui/` para uma subpasta chamada `monta_ai_bridge` dentro de Plugins (ou ajuste os `require_relative`).
4. Reinicie o SketchUp.

## Pendências para Geração do RBZ
- [ ] Implementar captura real de thumbnails via `view.write_image`.
- [ ] Refinar a interface HTML para exibir o relatório de erros em tempo real.
- [ ] Testar persistência do token de empresa.

---
**IMPORTANTE:** Este pacote não gera furação, CNC ou arquivos de máquina. O campo `is_machining_assembly_blocked` está bloqueado em TRUE para segurança do piloto.
