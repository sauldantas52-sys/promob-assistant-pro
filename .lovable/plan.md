# Plano de Implementação: Checklist de Validação de Piloto

Este plano detalha a ativação do checklist de validação industrial para o Monta AI, garantindo que nenhum projeto avance para produção sem a confirmação técnica de bitolas, medidas e furações.

## Alterações de Banco de Dados
- Criar tabela `validation_checks` para rastrear o estado de cada item do checklist por projeto.
- Adicionar campos `is_validated` e `validated_at` na tabela `projects`.
- Adicionar política RLS para que apenas perfis autorizados (Admin, Escritório, Auditor) validem os itens.

## UI e Componentes
- **EngineeringTab:** Integrar indicadores de progresso do checklist.
- **ProjectDetailPage:** Adicionar um novo card "Checklist de Validação Piloto" visível em estágios iniciais.
- **Bloqueio de Status:** Modificar o seletor de status para impedir a transição para 'Corte' se o checklist não estiver 100% concluído.

## Detalhes Técnicos
- **Filtro de Validação:**
    - Bitolas nominais (MDF 6, 15, 18, 25, 36).
    - Mapeamento DXF (Furações confirmadas).
    - Identidade Industrial (Tags 00-18).
- **Logs de Auditoria:** Registrar cada item marcado no `production_logs`.
- **Estilo:** Seguir o Industrial Design System 4.0 com indicadores pulsantes e cores semânticas.

## Passos de Execução
1. Executar migração SQL para nova tabela de validação.
2. Criar componente `PilotValidationChecklist.tsx`.
3. Integrar componente na `ProjectDetailPage`.
4. Atualizar lógica de `updateStatus` para respeitar a trava de validação.
5. Realizar teste de regressão para garantir que `machining_blocked` permanece `true` até a validação completa.
