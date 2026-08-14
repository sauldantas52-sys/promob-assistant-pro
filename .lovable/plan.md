# Plano de Piloto Físico da Expedição e Carga

Este plano detalha a execução do piloto físico do módulo de Expedição e Carga, validando as travas de segurança e a integridade dos dados para o projeto `amanda_111.xml`.

## Objetivos
1. Validar a geração de volumes e QR Codes para módulos selados.
2. Testar o fluxo de conferência de volumes e carregamento logístico.
3. Verificar a aplicação de bloqueios de segurança (kit pendente, auditoria offline).
4. Monitorar a atualização em tempo real no Wallboard da fábrica.

## Etapas de Execução

### 1. Preparação do Ambiente e Dados
- Garantir que o projeto `amanda_111.xml` esteja no status "conferencia".
- Selar ao menos um módulo (ex: G1) na tela de Montagem.
- Gerar o volume correspondente na aba "Expedição" do projeto.

### 2. Fluxo de Conferência e Carga
- **Leitura do QR Code**: Simular a leitura do QR Code do volume `VOL-...`.
- **Conferência**: Marcar o volume como "conferido".
- **Carregamento**: Inserir dados de motorista ("Carlos Silva") e veículo ("ABC-1234") para marcar como "carregado".
- **Entrega**: Finalizar o fluxo marcando como "entregue".

### 3. Teste de Exceções e Travas
- **Caso 1: Ferragem Faltante**: Registrar uma exceção de ferragem na montagem e verificar se o volume correspondente na expedição exibe o alerta de bloqueio.
- **Caso 2: Auditoria Offline**: Simular uma sincronização offline no kit e verificar se a expedição exige a auditoria manual antes de permitir o carregamento.

### 4. Monitoramento do Wallboard
- Acompanhar a métrica de "Expedição" no `factory-wallboard` durante as mudanças de status (aguardando -> carregado -> entregue).

## Detalhes Técnicos
- **Local Storage**: O sistema utiliza LocalStorage para a fila de sincronização offline (`montaai.assembly.exceptions.queue`).
- **Idempotência**: Cada evento de sincronização possui um UUID único para evitar duplicidade de logs.
- **Sincronização**: O componente `ConferenceDialog` força o status `sincronizado` e insere um `lock_reason` ao detectar reconexão com internet.

## Verificação Final
O piloto será considerado bem-sucedido se todos os logs forem registrados corretamente em `production_logs` com os metadados de logística e se as travas impedirem ações não autorizadas em volumes bloqueados.
