# Plano de Liberação Industrial — Fidelity 6.3

O objetivo deste plano é eliminar os bloqueios técnicos (safety gates) que impedem o avanço das peças para as etapas de Corte, Borda e Usinagem no chão de fábrica, garantindo que o fluxo industrial 4.0 flua sem interrupções manuais desnecessárias após a ingestão dos dados.

## Alterações propostas

### Lógica Industrial e Automação de Ingestão
- **Ingestão "One-Click Release"**: Modificar `src/routes/_authenticated.projects.import.tsx` para que, ao criar um projeto com destino `factory`, o sistema execute automaticamente a RPC `initialize_production_tracking` e valide todos os gates do `PilotValidationChecklist` imediatamente.
- **Desbloqueio de Usinagem**: Garantir que a flag `machining_blocked` seja definida como `false` por padrão durante a criação do projeto, a menos que haja uma discrepância crítica detectada no XML.

### Interface do Chão de Fábrica (Production Dashboard)
- **Desbloqueio Visual**: Remover mensagens de "Rastreabilidade não iniciada" na `ProductionStatusTab` caso o projeto já tenha peças importadas, forçando a inicialização automática se necessário.
- **Pipeline de 8 Colunas**: Atualizar a visualização do pipeline industrial para refletir todas as etapas: Corte, Borda, Usinagem, Conferência, Separação e Expedição, sem travas de interdependência rígida.

### Componentes Técnicos
- **PilotValidationChecklist**: Adicionar um botão de "Liberação Industrial Global" para projetos já existentes que estão travados, permitindo que o gestor libere todas as etapas de uma só vez.
- **ProductionStatusTab**: Ajustar a tabela de peças para permitir o início imediato de qualquer etapa (Corte, Borda ou Usinagem) sem depender da conclusão da anterior, conforme solicitado.

## Detalhes técnicos
- Uso da RPC `initialize_production_tracking` para popular a tabela `production_steps` logo após o parse do XML.
- Atualização em lote via `supabase.from('projects').update({ status: 'corte', machining_blocked: false })`.
- Garantia de que `physical_id` do Promob seja o elo de ligação em todo o fluxo.

## Validação
- Testar importação de um XML e verificar se a aba "Status de Produção" já nasce alimentada e pronta para ação.
- Validar se o botão "Finalizar Lote Completo" na `ProductionStatusTab` opera corretamente em todas as 409 peças do gabarito Closet.
