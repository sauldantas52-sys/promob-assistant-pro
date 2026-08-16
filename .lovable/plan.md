# Plano Industrial: Alimentação Automática de Processos (Plano de Corte e Produção)

O objetivo deste plano é garantir que a "Pasta do Cliente" importada alimente automaticamente os processos de **Plano de Corte** e as demais etapas operacionais, conforme solicitado. O sistema deve processar os arquivos técnicos (XML, PDF de Corte, DXF) e distribuir os dados para os módulos de produção, picking e montagem, respeitando a trava de segurança `machining_blocked = true`.

## 1. Processamento e Classificação Industrial
- **XML Promob**: Extração detalhada de módulos e peças para alimentar a lista de peças (`parts`).
- **Lista de Corte (PDF)**: Vinculação obrigatória ao Gate 1 (Corte e Borda). O sistema deve identificar que o plano de corte está disponível para a fábrica.
- **DXF (Nesting)**: Uso da geometria para auditoria técnica e liberação de usinagem.
- **Etiquetas**: Geração automática de metadados para as etiquetas baseada nos itens importados.

## 2. Fluxo de Alimentação de Processos
- **Módulo de Corte**: Notificar a produção assim que o `lista_corte_pdf` for processado na importação.
- **Módulo de Borda**: Mapear as fitas de borda extraídas do XML para o checklist de materiais.
- **Módulo de Picking**: Alimentar a lista de separação de ferragens automaticamente a partir do XML.
- **Módulo de Montagem**: Organizar os itens nos grupos físicos (G1, G2, G3) identificados no XML.

## 3. Segurança e Auditoria
- Manter `machining_blocked = true` até a validação manual do DXF/PDF técnico no checklist do piloto.
- Registrar no `production_logs` cada etapa alimentada pelo assistente de importação.

## 4. Próximos Passos (Implementação)
- Ajustar `src/lib/promob-import.ts` para garantir que campos de material e borda alimentem corretamente a tabela `parts`.
- Refinar a interface de visualização do projeto para destacar os arquivos de plano de corte e compras anexados.

---
**Aviso:** O sistema já possui a infraestrutura de banco de dados (tabelas `parts`, `modules`, `validation_checks`). Este plano foca na integração lógica para que o usuário sinta a fluidez entre a "pasta" e o "processo".
