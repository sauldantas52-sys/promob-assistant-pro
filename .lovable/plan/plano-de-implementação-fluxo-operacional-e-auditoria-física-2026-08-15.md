# Plano de Implementação - Fluxo Operacional e Auditoria Física Industrial

Este plano detalha a implementação do checklist físico na fábrica, a geração de relatórios consolidados e o sistema de notificações em tempo real, mantendo os rigorosos padrões de segurança industrial (machining_blocked = true) e a identidade visual Industrial Design System 4.0.

## 1. Módulo de Checklist Físico Industrial
- Implementar componente `PhysicalChecklistFlow` para validação em "chão de fábrica".
- Estados obrigatórios por etapa: Conferência de Matéria-prima, Corte/Borda, Furação (Usinagem) e Pré-montagem.
- Captura de evidências fotográficas para cada falha ou exceção detectada.

## 2. Relatórios de Auditoria e Dossiê Técnico
- Geração automática de PDF consolidado ao finalizar o projeto ou um armário (G1-G3).
- Inclusão de: Checklist de validação piloto, logs de produção, fotos de evidência e status final dos gates industriais.
- Utilização de `pdfjs-dist` para manipulação e visualização de documentos técnicos.

## 3. Sistema de Notificações em Tempo Real
- Alertas instantâneos para:
    - Conclusão de Gates Industriais.
    - Registro de Exceções de Produção.
    - Alteração de status do Piloto Físico.
- Notificações via `sonner` no frontend e persistência na tabela `notifications` para histórico de auditoria.

## Detalhes Técnicos
- **Segurança**: O campo `machining_blocked` permanece `true` até a validação completa do Gate 2.
- **Banco de Dados**: Uso das tabelas `physical_pilot_checks` e `notifications` criadas na migração anterior.
- **Frontend**: Componentes otimizados para tablets industriais e visualização em TV (Wallboard).

## Próximos Passos
1. Criar `src/components/PhysicalChecklistFlow.tsx`.
2. Atualizar `src/lib/audit-report.functions.ts` para suporte a PDF consolidado.
3. Integrar notificações no dashboard e wallboard de produção.
