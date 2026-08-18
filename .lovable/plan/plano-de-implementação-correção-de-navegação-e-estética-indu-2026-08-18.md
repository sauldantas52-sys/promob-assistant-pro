# Plano de Implementação - Correção de Navegação e Estética Industrial

O usuário relatou uma falha na navegação entre as telas de "Etiquetas" e o "Painel TV" (Factory Wallboard), além de solicitar ajustes estéticos industriais (letras em negrito, diagramação de etiquetas e identificadores de cor).

## 1. Correção de Navegação e Fluxo
*   **Problema:** Quando o usuário entra em "Etiquetas", ele quer poder retornar facilmente ao "Painel TV". Atualmente, o Painel TV é acessado via sidebar ou dashboard, mas não há um link direto de retorno rápido dentro da aba de etiquetas de um projeto específico para o Wallboard.
*   **Solução:** Adicionar um botão de atalho no header da aba `IndustrialLabelsTab` ou no shell lateral que permita o retorno rápido ao Painel TV, especialmente para operadores de fábrica.

## 2. Ajustes Visuais e Funcionais nas Etiquetas (Fidelity 6.2)
*   **Negrito Industrial:** Aumentar o peso da fonte em todos os campos críticos da etiqueta para `font-weight: 900` para garantir legibilidade sob luz de fábrica.
*   **Quadrado de Cor Econômico:** Implementar um pequeno marcador colorido na etiqueta que represente o material (G1-G5), ajudando na separação rápida sem gastar excesso de tinta.
*   **Diagramação Zebra/Remac:** Ajustar as margens e o balizador de folha para garantir que o conteúdo não seja cortado em impressoras de rolo.

## Detalhes Técnicos

### Arquivos Afetados:
1.  `src/components/project/labels/IndustrialLabelsTab.tsx`:
    *   Adicionar botão "Retornar ao Painel TV".
    *   Refinar estilos de impressão.
2.  `src/lib/labels/piece-label.ts`:
    *   Atualizar o template HTML para incluir o quadrado de cor.
    *   Forçar `font-weight: 900` em textos técnicos.
3.  `src/components/AppShell.tsx`:
    *   Garantir que o item "Painel TV" na sidebar esteja sempre visível para perfis de fábrica.

### Regras de Negócio:
*   Manter a integridade do Gabarito Industrial (409 peças).
*   Não alterar cálculos de plano de corte, apenas a representação visual na etiqueta.
*   O retorno ao Painel TV deve respeitar as permissões de acesso do usuário.

---
**Nota:** Nenhuma regra de banco de dados ou RLS será alterada, apenas a camada de apresentação e navegação.