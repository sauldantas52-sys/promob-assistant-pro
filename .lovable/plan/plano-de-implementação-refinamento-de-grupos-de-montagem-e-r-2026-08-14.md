# Plano de Implementação: Refinamento de Grupos de Montagem e Rastreabilidade 4.0

O objetivo é transformar os "Grupos de Montagem" de simples categorias lógicas para conjuntos físicos (Módulos) com rastreabilidade total via QR Code, conferência obrigatória de ferragens e fluxo de bloqueio de segurança.

## Alterações Técnicas

### 1. Backend e Estrutura de Dados
- **Migração Concluída**: Já aplicamos a migração que expande `assembly_groups` e cria `assembly_group_hardware` e `assembly_group_items_log`.
- **Lógica de Importação**: Atualizar o parser para criar automaticamente um grupo para cada módulo e gerar o kit de ferragens vinculado.

### 2. Fluxo de Produção e Montagem
- **Etiquetas Inteligentes**: Inclusão do código do módulo, cor exclusiva e QR Code em cada etiqueta de peça.
- **Fluxo de Conferência**:
  - Separação visual por tipo (Chapa, Usinada, Ferragens, Parafusos, etc.).
  - Validação item a item (escanear cada peça e confirmar cada ferragem).
  - Bloqueio de grupo: Impedir avanço se houver falta ou dano.

### 3. Interface do Usuário (UI)
- **Tela de Conferência (Mobile-First)**:
  - Barra de progresso real ("18 de 22 itens").
  - Interface de scanner simulada/real.
  - Botão de "Exceção Autorizada" (requer justificativa).
- **Dashboard da Fábrica**: Visualização do status de cada grupo (Módulo).

## Passos da Execução

1.  **Refatorar Parser (`src/lib/promob-import.ts`)**:
    - Garantir que cada `ParsedModule` resulte em um `assembly_groups` no banco.
    - Mapear ferragens do XML diretamente para `assembly_group_hardware`.
2.  **Atualizar Rota de Detalhes (`src/routes/projects.$projectId.tsx`)**:
    - Implementar a lógica de criação de grupos na importação.
    - Adicionar visualização dos grupos com cores e status.
3.  **Reformular Tela de Montagem (`src/routes/assembly.tsx`)**:
    - Criar o novo componente de conferência com separação por tipo de item.
    - Implementar o controle de progresso e bloqueios.
4.  **Criar Componente de QR Code/Etiqueta**:
    - Gerar visualização de etiqueta com as informações obrigatórias.

## Verificação de Qualidade
- Validar se peças de grupos diferentes com mesmo nome permanecem isoladas.
- Testar o bloqueio de "Falta de Ferragem" impedindo o fechamento do kit.
- Conferir o registro de log (usuário/data/hora) ao selar um grupo.
