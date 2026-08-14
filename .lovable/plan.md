# Plano de Refinamento: Ciclo de Fabricação e Rastreabilidade 4.0

Este plano detalha o refinamento do fluxo de produção com foco em bloqueios de segurança, rastreabilidade de dados e conformidade técnica rigorosa.

## 1. Bloqueios de Segurança e Integridade de Dados
- **Bloqueio de Produção**: Impedir a transição do status do projeto para "producao" se houver qualquer campo crítico (medida, material, espessura) marcado como "Não confirmado".
- **Origem dos Dados**: Adicionar campo `data_source` nas tabelas `modules` e `parts` (XML, PDF, DXF, Cadastro, Estimativa).
- **Classificação Visual**: Implementar indicadores para diferenciar peças: Ausente, Oculta, Avulsa e Não Confirmada.

## 2. Rastreabilidade 360°
- **Código Único**: Garantir que o `id` da peça/etiqueta seja gerado no momento da importação e mantido inalterado.
- **Etiquetas Técnicas**: Novo componente de etiqueta contendo Projeto, Módulo, Grupo (G1/G2), Peça, Código Único (QR Code), Medidas, Material, Espessura, Borda e Status.
- **Logs de Auditoria**: Refinar `production_logs` para registrar automaticamente Usuário, Data, Hora e Observação em cada mudança de status.

## 3. Interfaces de Operação (TV, Tablet e Mobile)
- **Painel TV (Read-only)**: Otimizar o `/factory-wallboard` para modo leitura com atualização automática via Realtime, sem necessidade de navegação.
- **Caderno de Montagem**: Expandir a visualização mobile para listar exaustivamente ferragens, parafusos, buchas, corrediças, dobradiças e ferramentas necessárias por módulo.
- **Bloqueio de Expedição**: Validar a integridade dos volumes antes da liberação final (bloquear se houver pendências críticas).

## 4. Banco de Dados (Migração)
- Adicionar coluna `data_source` a `modules` e `parts`.
- Adicionar coluna `visibility_type` (oculta, avulsa, etc.) a `parts`.
- Garantir que `production_logs` capture os campos obrigatórios.

## Detalhes Técnicos
- Migração SQL para novos campos.
- Atualização do `promob-import.ts` para capturar origem e visibilidade.
- Refinamento do `ProjectDetail` para gerir bloqueios e etiquetas.
