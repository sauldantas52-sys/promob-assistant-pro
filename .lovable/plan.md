# Plano de Homologação Final Industrial 5.4

Este plano finaliza a homologação do sistema Monta AI, focando na visibilidade do status industrial no Dashboard e na conformidade com o Checklist Piloto para o projeto CLOSET.

## 1. Visibilidade Industrial no Dashboard
- Adicionar uma seção "Alerta de Engenharia" no `DashboardContent` para projetos com `machining_blocked: true`.
- Exibir os itens pendentes do checklist diretamente no card do projeto no Dashboard para facilitar a ação do usuário.

## 2. Refinamento do Checklist Piloto
- Garantir que a lógica de "Modo Piloto" no `PilotValidationChecklist.tsx` esteja clara, permitindo a validação manual mesmo sem arquivos físicos, conforme solicitado anteriormente, mas mantendo o bloqueio de usinagem até a aprovação total.

## 3. Validação Operacional
- Confirmar que o botão "Novo Projeto" e os indicadores de "Segurança CNC" estão visíveis para usuários com papéis administrativos e operacionais.

## Detalhes Técnicos
- **Arquivo:** `src/routes/_authenticated.dashboard.tsx`
  - Injetar uma nova consulta ou expandir a existente para buscar `validation_checks`.
  - Renderizar uma lista rápida de itens pendentes do Gate 1 e Gate 2.
- **Segurança:** Manter `machining_blocked = true` como invariante até a execução da RPC `release_project_machining`.

---
*Nota: Este plano segue a diretriz de não criar novas funcionalidades, apenas auditar, corrigir visibilidade e validar a integridade industrial.*