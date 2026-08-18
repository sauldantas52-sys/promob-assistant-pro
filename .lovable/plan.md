# Plano de Ação: Ajuste de Layout das Etiquetas Industriais

O objetivo é aprimorar a diagramação das etiquetas, tornando-as mais adequadas para impressoras de rolo, com fontes em negrito para melhor legibilidade e um estilo mais robusto.

## Tarefas

1.  **Refatoração do Estilo da Etiqueta (`src/lib/labels/piece-label.ts`)**:
    *   Ajustar o CSS embutido (`pieceLabelHtml` function) para utilizar fontes com `font-weight: 900` ou `800` (bold/black) em textos críticos (código da peça, dimensões).
    *   Ajustar espaçamentos e margens internas (`padding`, `gap`) para um layout mais compacto, otimizado para rolos de etiquetas.
    *   Garantir que a hierarquia visual (G1-G5, master UID, fita) seja clara e legível mesmo em tamanhos reduzidos.

2.  **Ajuste do Balizador Industrial (`src/components/project/labels/IndustrialLabelsTab.tsx`)**:
    *   Verificar se a lógica de `page-break` e `box-sizing` está garantindo que nenhuma etiqueta "escape" da área de impressão.
    *   Refinar a regra `@media print` para garantir que o layout de rolo (que muitas vezes é `cols: 1`) seja tratado corretamente pela impressora Zebra/Remac.

3.  **Validação**:
    *   Verificar o layout em modo de impressão (visualização de impressão no navegador).
    *   Confirmar que o tamanho da fonte e o peso (negrito) atendem à necessidade de "boa interpretação" solicitada.

## Considerações Técnicas
*   O arquivo `piece-label.ts` contém a estrutura HTML/CSS base da etiqueta.
*   O arquivo `IndustrialLabelsTab.tsx` gerencia o grid e as configurações de página.
*   Não alteraremos a lógica de dados, apenas o template visual.

## Próximos Passos
*   Após a aprovação deste plano, iniciarei as alterações nos arquivos citados.
