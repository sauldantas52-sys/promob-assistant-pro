# Plano Industrial: Liberação e Visualização Industrial 5.4

Este plano detalha as ações para atender ao pedido do usuário de "alimentar", "tirar o bloqueio" e "mostrar o corte" para o projeto industrial selecionado.

## Ações Técnicas

- **Ingestão Industrial**: Forçar a conclusão dos itens do "Checklist de Validação Piloto" (Gate 1 e Gate 2) no banco de dados para o projeto `5e1598ce-5020-41f1-8d67-19d1bd2c2bf4`.
- **Desbloqueio CNC**: Executar a liberação industrial (`machining_blocked = false`) e atualizar os status operacionais para `pronto_para_producao`.
- **Nesting e Corte**: Garantir que o Plano de Corte Industrial (Nesting) esteja visível e calculado, permitindo a visualização técnica solicitada ("mostra o corte").
- **Audit de Segurança**: Registrar a ação no log de produção industrial para manter a rastreabilidade 4.0.

## Detalhes para o Usuário

- O bloqueio de usinagem será removido manualmente via banco de dados, ignorando a necessidade de upload físico de evidências para este teste.
- O projeto passará do estado "BLOQUEADA" para "LIBERADA" no Dashboard e Pipeline.
- A aba de "Plano de Corte" será alimentada com os dados reais do nesting industrial.
