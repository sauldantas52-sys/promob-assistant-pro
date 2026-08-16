# Plano de Aprimoramento Industrial: Alimentação de Processos e Auditoria Visual

O objetivo deste plano é consolidar a alimentação automática dos processos industriais a partir da "Pasta do Cliente", garantindo que os dados do XML e documentos técnicos (PDF/DXF) fluam corretamente para as etapas de Corte, Usinagem e Montagem, mantendo a segurança operacional.

## Alterações Propostas

### 1. Núcleo de Processamento (Parser e Wizard)
- **Aprimoramento do Parser XML**: Refinar a extração de metadados industriais (especificamente bordas, furos e tags de identificação) para garantir que o checklist de materiais seja populado com precisão.
- **Automação no Wizard de Importação**: Ajustar a lógica de detecção de arquivos para que o sistema reconheça automaticamente o propósito de cada PDF (Lista de Corte, Cotas, Preview) e o DXF de Nesting, vinculando-os aos seus respectivos "Gates" de segurança.

### 2. Fluxo de Produção Industrial 4.0
- **Etapa de Corte e Borda**: Implementar a vinculação direta entre a "Lista de Corte PDF" e a liberação da etapa.
- **Etapa de Usinagem (CNC)**: Reforçar o bloqueio `machining_blocked = true` até que a auditoria técnica do DXF e das Cotas seja confirmada pelo Auditor ou Chefe de Produção.
- **Etapa de Montagem**: Integrar o "Caderno de Montagem" (Cotas PDF) diretamente na visão do montador, com acesso rápido via mobile.

### 3. Interface e Usabilidade (Industrial Design System 4.0)
- **Visualização de Status**: Unificar as cores de status em todo o sistema:
  - **Corte/Borda**: Vermelho/Âmbar (Processamento Inicial)
  - **Usinagem**: Roxo (Complexidade Técnica)
  - **Picking/Separação**: Azul (Logística Interna)
  - **Montagem**: Verde (Finalização)
  - **Expedição**: Indigo (Saída)
- **Matriz de Evidências**: Adicionar visualização rápida na aba de auditoria para confirmar quais arquivos obrigatórios estão presentes.

## Detalhes Técnicos

- **Frontend**: 
  - Atualizar `src/routes/_authenticated.projects.import.tsx` para melhorar a validação da "Pasta do Cliente".
  - Refinar `src/components/PilotValidationChecklist.tsx` para refletir os novos gates automáticos.
- **Backend/Database**:
  - Validar a trigger `auto_process_project_gates` (criada na última etapa) para garantir que ela não crie loops de notificação.
  - Assegurar que `machining_blocked` persista como `true` por padrão em todas as novas inserções de peças.

## Considerações de Segurança
- O acesso administrativo e operacional permanece segregado.
- Nenhuma peça é liberada para usinagem sem a presença do DXF validado.
