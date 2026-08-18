# Plano de Implementação: Etiquetas Industriais + Ajustes + Impressão em Tamanho Real

Este plano detalha a implementação do sistema de etiquetas industriais para o Monta AI, garantindo fidelidade absoluta ao plano de corte e suporte a múltiplos formatos de impressão.

## 1. Integridade e Auditoria
Antes de iniciar as etiquetas, será implementada uma função de validação técnica para garantir que o projeto Closet (`5c5fce10-ba21-4b6e-952e-74543e835fb3`) respeita os limites de integridade.

## 2. Motor de Etiquetas (Label Engine)
Criação de `src/lib/labels/engine.ts` para gerenciar a geração de dados de etiquetas a partir das peças físicas alocadas no plano de corte.
- Expansão de repetições: 1 etiqueta por peça física.
- Ordenação industrial: Módulo > Código da Peça (ex: G1 #1.A).
- Geração de QR Code compacto com metadados técnicos.

## 3. Lógica de Fitas e Lados (Edge Mapping)
Centralização da lógica de fitas em `src/lib/cut-plan/edges.ts`.
- Mapeamento determinístico de F1, F2, F3, F4.
- Cálculo de comprimentos reais de fita baseados nas dimensões e rotação.
- Paleta de cores industrial para fitas (MDF Branco, Carbono, Cumaru, etc.).

## 4. Interface de Configuração e Preview
Criação da aba de etiquetas em `src/components/project/PreliminaryCutPlanTab.tsx` ou novo componente dedicado.
- Seletor de Presets (Pimaco, REMAC, Zebra, Manual).
- Ajustes finos: largura, altura, margens, colunas/linhas.
- Pré-visualização em tempo real das etiquetas.

## 5. Impressão Industrial
- Layout de impressão otimizado para rolos e folhas.
- Desenho esquemático da peça com indicação visual de fitagem.
- QR Code dimensionado proporcionalmente.

## Detalhes Técnicos
- **Biblioteca QR:** `qrcode.react` (já instalada).
- **Estilização:** Tailwind CSS para layouts de etiquetas e CSS `@media print` para precisão milimétrica.
- **Identificadores:** Uso estrito de `physicalId` e `masterUid` já persistidos no banco.
