# Plano de Implementação: Ciclo de Fabricação e Rastreabilidade 4.0

Este plano detalha a implementação do fluxo completo de fabricação, desde a fábrica até a entrega no cliente, com foco em rastreabilidade, controle por tablet/TV e gestão de grupos de montagem.

## 1. Infraestrutura de Dados (Concluído)
- Tabelas de etapas de produção (`production_steps`).
- Grupos de montagem (`assembly_groups`).
- Expedição e Volumes (`shipping_volumes`).
- Histórico e logs (`production_logs`).

## 2. Painel de Fábrica (TV/Tablet)
- **Nova Rota**: `src/routes/factory-wallboard.tsx`.
- Visão Kanban/Grid para TV mostrando status em tempo real.
- Filtros por etapa: Corte, Usinagem, Borda, Separação.
- Alertas visuais para peças bloqueadas ou chamados abertos.

## 3. Fluxo de Separação e Conferência
- **Nova Rota**: `src/routes/picking.tsx`.
- Lista de conferência de ferragens e acessórios.
- Status por item: Separado, Conferido, Faltando, Danificado.
- Regra de bloqueio: Não permite avançar para montagem se houver itens críticos faltantes.

## 4. Rastreabilidade e Etiquetas
- Integração de metadados para etiquetas (QR Code, Medidas, Material).
- Função para gerar identificação única por peça.
- Visualização de "Grupos de Montagem" (G1, G2) no detalhe do projeto.

## 5. Mobile-First: Montagem e Expedição
- Atualização da rota `src/routes/assembly.tsx` para incluir fotos "antes/depois".
- **Nova Rota**: `src/routes/shipping.tsx` para conferência de carregamento e motorista.
- Roteiro de montagem com sequência lógica e peças necessárias por grupo.

## Detalhes Técnicos
- Uso de `supabase-js` para atualizações em tempo real (Realtime).
- Componentes Shadcn UI otimizados para toque (botões grandes).
- Lógica de negócio em `src/lib/production.ts` para centralizar as regras de status.
