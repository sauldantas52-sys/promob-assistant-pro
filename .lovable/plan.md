# Plano: Ingestão Instantânea e Alimentação Total (Fidelity 5.8)

O usuário relata que o sistema "não alimenta" os processos ao carregar a pasta do cliente. O objetivo é tornar a importação um processo de um único clique que popula imediatamente o Plano de Corte e o Pipeline de Produção, removendo qualquer percepção de atraso ou trava.

## Alterações Técnicas

### 1. Ingestão "Deep & Fast" (`src/routes/_authenticated.projects.import.tsx`)
- Modificar o `handleFolderSelection` para realizar o `parsePromobXML` imediatamente.
- Armazenar o resultado do parse em um estado global/cache para que a página de destino (`PreliminaryCutPlanTab`) possa exibir os dados mesmo antes do banco de dados confirmar a gravação (otimismo industrial).
- Garantir que o `RPC import_client_project` defina o status inicial como `corte` (liberado para produção).

### 2. Sincronização de Visibilidade (`src/lib/cut-plan/engine.ts` e `PreliminaryCutPlanTab.tsx`)
- Ajustar o motor para garantir que, ao entrar na aba, ele tente ler do banco; se falhar ou estiver vazio, ele tenta ler do `project_import_sessions` ou do cache local do XML.
- Adicionar um estado de "Alimentando Sistema..." com progresso visível (ex: "Peça 10/409 processada").

### 3. Interface de "Aba Única" (`src/routes/_authenticated.projects.$projectId.tsx`)
- Reforçar a Sidebar para que o "Plano de Corte Pro" seja o destino absoluto pós-importação.
- Remover modais de confirmação que interrompem o fluxo.

## User Experience (Industrial)
- **Um Clique**: O usuário seleciona a pasta e, em segundos, vê o mapa de corte da primeira chapa.
- **Transparência**: Se um arquivo (como o XML) estiver faltando ou corrompido, o sistema avisa exatamente qual peça não pôde ser alimentada, em vez de falhar silenciosamente.

## Validação
- Testar com o arquivo `CLOSET-18-07-2026.xml` via script de automação para garantir que 409 peças apareçam no plano em menos de 3 segundos.
