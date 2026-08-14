# Plano de Refinamento dos Gates do Checklist Piloto

Este plano detalha a reestruturação do sistema de validação industrial, separando as travas de segurança por etapas produtivas (Corte/Borda, Usinagem e Montagem) conforme solicitado.

## Alterações Técnicas

### 1. Banco de Dados e Esquema
- Adicionar novos tipos de validação à tabela `validation_checks` via aplicação (a coluna é `text`).
- Manter a lógica de `is_validated` global como um indicador de "Conformidade Total", mas implementar verificações granulares por etapa.
- Garantir que `machining_blocked` permaneça como trava primária até a aprovação manual.

### 2. Componente PilotValidationChecklist
- Refatorar a UI para exibir 3 cards distintos representando os gates industriais:
    - **Gate 1: Corte e Borda**
        - Itens: XML Válido, Lista de Corte, DXF Nesting, Materiais/Espessuras.
        - Permite liberação para a etapa de Corte mesmo sem documentação de furação.
    - **Gate 2: Usinagem**
        - Itens: PDF/DXF Técnico, Cotas/Furações, Validação de Bitolas, Tags Industriais.
        - Desbloqueia a interface de engenharia para liberação manual por peça.
    - **Gate 3: Montagem**
        - Itens: Usinagem Liberada (check lógico), Peças Conferidas, Ferragens Conferidas, Grupos G1-G3/AV Completos.
- Adicionar funcionalidade de "Liberação Parcial" com registro obrigatório de motivo em `production_logs`.

### 3. Lógica de Pipeline (Produção)
- Atualizar `src/routes/_authenticated.production.tsx` para validar gates específicos antes de permitir o avanço do status:
    - `orcamento -> corte`: Exige Gate 1 concluído.
    - `borda -> usinagem`: Exige Gate 2 concluído.
    - `expedicao -> montagem`: Exige Gate 3 concluído.

### 4. Integração com Engenharia
- Ajustar `src/components/EngineeringTab.tsx` para refletir o status do Gate 2.
- Garantir que a liberação individual de peças exija a conformidade do Gate 2.

## Verificação e Testes
- Validar que a falta de furação NÃO bloqueia o avanço para Corte se o Gate 1 estiver ok.
- Confirmar o registro de logs com metadados de "liberação parcial".
- Testar a restrição de avanço de status em cada etapa do pipeline.
