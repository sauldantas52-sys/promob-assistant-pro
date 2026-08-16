# Plano de Consolidação Industrial: Monta Aí / Promob Assistant Pro

Este plano detalha a transição do sistema para uma base funcional 100% operacional, eliminando dados demonstrativos e vinculando a interface exclusivamente aos arquivos técnicos oficiais (.XML e .DXF) e ao banco de dados persistido.

## Auditoria de Arquivos e Componentes

### Componentes a Reutilizar (Mantendo Identidade Visual 4.0)
- `src/components/AppShell.tsx`: Estrutura de navegação e drawer mobile.
- `src/components/PilotValidationChecklist.tsx`: Lógica de gates industriais e bloqueios.
- `src/components/DrillingInspector.tsx`: Tabela de furações (será alimentada pelo DXF).
- `src/components/PhysicalChecklistFlow.tsx`: Fluxo de evidências físicas.
- `src/components/AssemblyLabel.tsx`: Etiquetas com QR Code.

### Componentes a Modificar (Remoção de Dados Fictícios)
- `src/routes/_authenticated.dashboard.tsx`: Remover contadores estáticos; vincular ao `count` real das tabelas `projects` e `production_logs`.
- `src/components/project/BudgetTab.tsx`: Substituir valores fixos (R$ 12.450,00) por "Pendente" ou consulta à `project_quotes`.
- `src/components/project/VisualEstimateTab.tsx`: Remover simulação de IA; vincular à detecção real de arquivos ou desativar se o XML/DXF for a única fonte.
- `src/components/project/PreliminaryCutPlanTab.tsx`: Remover alertas genéricos; vincular ao status real do gate "Lista de Corte".
- `src/components/EngineeringTab.tsx`: Unificar a visualização de furações baseada exclusivamente no DXF.

### Novos Componentes / Funções Necessários
- `src/lib/dxf-geometry-processor.ts`: Processador para converter geometria DXF em visualização técnica espacial (ambiente/paredes).
- `src/components/project/Technical3DView.tsx`: Visualizador 3D técnico baseado em Three.js ou SVG avançado, usando exclusivamente as coordenadas do DXF.
- `src/lib/inventory/material-calculator.ts`: Calculador de lista de compras baseado na explosão de materiais do XML.

## Etapas de Implementação

### 1. Saneamento de Dados e Persistência Real
- **Ação**: Varrer todas as rotas de detalhe de projeto e dashboard.
- **Mudança**: Substituir strings de exemplo e números fixos por condicionais `data ? ... : "Não informado"`.
- **Garantia**: Nenhuma informação será inferida; se o XML não trouxer a espessura, o sistema exibirá "Pendente".

### 2. Motor de Visualização DXF (Ambiente e Peças)
- **Ação**: Implementar leitura de camadas (layers) do DXF para identificar paredes, módulos e furações.
- **Mudança**: A aba de visualização técnica não usará mais imagens de placeholder, mas sim o render da geometria do arquivo.
- **Lock**: Manter `machining_blocked = true` até que a geometria DXF coincida com os IDs do XML.

### 3. Alimentação de Processos Industriais
- **Ação**: Vincular a "Lista de Compra" e o "Plano de Corte" aos dados extraídos no `promob-import.ts`.
- **Mudança**: O XML passa a ser a única autoridade para materiais e quantidades.
- **Regra**: Arquivos originais da "Pasta do Cliente" serão mantidos no storage sem alteração, servindo como auditoria.

### 4. Gestão de Arquivos do Cliente
- **Ação**: Refinar o storage para garantir que .promob, .dxf e .xml estejam sempre vinculados ao `project_id`.
- **Mudança**: Garantir que o projetista e a fábrica visualizem a mesma versão do arquivo, evitando erros de revisão.

## Detalhes Técnicos
- **Banco de Dados**: Uso extensivo de RLS para garantir que a `company_id` isole os dados.
- **Segurança**: Bloqueio de usinagem (machining_blocked) persistido no nível da peça (`parts`) e do projeto (`projects`).
- **Performance**: Processamento de DXF e XML no lado do servidor via `createServerFn` para não sobrecarregar dispositivos móveis de montadores.

O sistema passará a ser uma ferramenta de auditoria e operação fiel, onde o que está na tela é exatamente o que está no arquivo.
