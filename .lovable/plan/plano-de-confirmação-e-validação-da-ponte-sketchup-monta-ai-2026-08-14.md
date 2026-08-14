# Plano de Confirmação e Validação da Ponte SketchUp ↔ Monta AI

O objetivo é validar o fluxo completo de exportação (SketchUp) e importação (Web) garantindo que os dados industriais sejam processados corretamente.

## 1. Alinhamento de Contrato (Ruby Plugin)
Ajustar o `lib/manifest_builder.rb` no pacote do plugin para exportar os dados exatamente no formato esperado pelo servidor (`processSkpPackage`).
- Usar `module_id` em vez de `guid`.
- Usar `module_name` em vez de `name`.
- Flatten de dimensões: `width_mm`, `height_mm`, `depth_mm` em vez de objeto `dimensions`.

## 2. Implementação da Interface de Importação (Web)
Atualizar `src/components/SketchUpBridgeTab.tsx` para tornar o botão "Nova Versão" funcional.
- Adicionar `input type="file"` oculto para selecionar o `manifest.json`.
- Implementar `handleUpload` usando `useServerFn(processSkpPackage)`.
- Exibir feedback de progresso e sucesso/erro via `sonner`.

## 3. Refinamento do Processamento (Server)
Ajustar `src/lib/sketchup-bridge.functions.ts` para garantir que a auditoria industrial seja rigorosa.
- Validar tags industriais (00-18) durante o processamento.
- Garantir que `is_machining_assembly_blocked` seja propagado corretamente para as peças criadas.

## 4. Teste de Aceite Automatizado (QA)
Criar um script Playwright (`qa_sketchup_bridge_import.py`) para:
- Realizar login como Administrador.
- Navegar até o dashboard de um projeto existente.
- Acessar a aba "Ponte SKP".
- Fazer o upload de um manifesto de teste (`public/manifest_valid_example.json`).
- Verificar se a nova versão aparece no histórico e se os itens foram criados no banco.

## Detalhes Técnicos
- **Safety Lock:** Todos os itens importados via Ponte SKP nascem com `machining_blocked: true`.
- **Rastreabilidade:** Cada item será vinculado ao `version_id` para auditoria histórica.
