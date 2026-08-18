# Plano Industrial 5.5: Expansão do Pipeline e Visualização de Pátio

Este plano detalha a expansão das estações operacionais no Pipeline, a correção de inconsistências nas etapas de produção e a melhoria da visualização de pátio industrial.

## Ações Técnicas

### 1. Expansão do Pipeline Operacional (`src/routes/_authenticated.production.tsx`)
- Atualizar o objeto `flow` para incluir as etapas faltantes: `borda` (Red), `usinagem` (Purple), `conferencia` (Blue), `separacao` (Amber), `expedicao` (Indigo).
- Garantir que a ordem das colunas e as ações de transição reflitam o fluxo industrial 4.0: Corte → Borda → Usinagem → Separação → Conferência → Expedição → Montagem.
- Ajustar os filtros de consulta Supabase para incluir todas essas etapas.

### 2. Padronização de Status Industriais (`src/lib/project-status.ts`)
- Sincronizar os rótulos e cores com a Identidade Industrial 4.0:
    - **Corte**: Red
    - **Borda**: Amber/Orange
    - **Usinagem**: Purple/Violet
    - **Separação/Picking**: Blue
    - **Conferência**: Indigo
    - **Expedição**: Slate/Dark
    - **Montagem**: Green

### 3. Visualização de Pátio e Gêmeo Digital (`src/components/project/Operational3DView.tsx`)
- Refinar as ferramentas de "Afastar" e "Raio-X" para que funcionem como ferramentas de inspeção de pátio.
- Garantir que o link para "Produção" aponte para a peça física correta com rastreabilidade.

### 4. Correção de Regressões e Erros de Transição
- Eliminar o erro "Transição de produção inválida" ajustando a lógica de `flow.next` para suportar o novo encadeamento.
- Permitir o bypass de bloqueios apenas quando `machining_blocked = false`.

## Detalhes para o Usuário
- O Pipeline (Pátio de Produção) agora exibirá 6 colunas principais em vez de apenas Corte/Borda.
- As cores dos cards e ícones serão unificadas entre o Dashboard, Wallboard e Pipeline.
- O sistema de rastreabilidade por QR Code será integrado diretamente na visualização 3D.
