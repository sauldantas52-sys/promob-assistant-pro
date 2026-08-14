# Plano de Desenvolvimento: Fluxo Completo Industrial 4.0

Continuação do desenvolvimento do Monta AI focando na robustez operacional da fábrica ao cliente, refinando os módulos de Produção, Separação, Etiquetas, Montagem e Expedição.

## 1. Produção: Refinamento do Pipeline
- **Visualização de Status por Projeto**: Atualizar a tela de Produção para exibir um dashboard técnico com as etapas (Corte, Borda, Usinagem, Separação, Montagem) em tempo real.
- **Bloqueios Claros**: Implementar indicadores visuais de "Bloqueio de Produção" (ex: peças sem furação ou erros de engenharia) que impedem o avanço do projeto.

## 2. Separação: Gestão de Insumos G1/G2/G3/AV
- **Organização por Grupos**: Ajustar a interface de Picking para agrupar Peças, Ferragens e Acessórios conforme os grupos G1, G2, G3 e AV (Avulsos).
- **Checklist Obrigatório**: Adicionar validação para que o projeto só avance se todos os itens críticos forem bipados (simulado ou via QR Code).
- **Localização Física**: Adicionar campo de "Endereço Industrial" (ex: Prateleira A-12) para cada peça/acessório.

## 3. Etiquetas: Dossiê de Identificação Industrial
- **Expansão de Metadados**: Atualizar o componente `AssemblyLabel` para incluir:
  - Material, Espessura e Fita de Borda.
  - Cor do Módulo (visual).
  - Localização na Fábrica (Setor/Prateleira).

## 4. Montagem: Caderno Técnico Mobile 4.0
- **Sequência e Fotos**: Implementar na aba de Montagem:
  - Sequência recomendada de passos.
  - Upload de fotos "Antes" (local/volumes) e "Depois" (finalizado).
- **Registro de Ocorrências**: Botão dedicado para "Falta/Dano" com integração automática ao Dossiê de Assistência Técnica.
- **Offline Sync**: Refinar a lógica de sincronização para garantir que dados coletados em campo sem sinal sejam enviados ao reconectar.

## 5. Expedição: Logística e Entrega
- **Dados do Veículo**: Expandir o formulário de carregamento para capturar Placa do Veículo e Nome do Motorista.
- **Status de Entrega**: Fluxo de "A caminho" -> "Chegou ao Cliente" -> "Assinatura Digital/Foto".

## Detalhes Técnicos
- **Tecnologias**: TanStack Start, Supabase (PostgreSQL), Lucide Icons, QR Code SVG.
- **Segurança**: Manter `machining_blocked = true` (usinagem CNC desativada conforme instrução).
- **Responsividade**: Garantir legibilidade em TV (Wallboard) e ergonomia em Mobile (Montador).

