# Plano de Finalização e Melhorias - Monta AI

O sistema base e os módulos principais (Dashboard, Projetos, Produção e Montagem) já foram implementados com sucesso. O build está estável e a integração com o backend (Supabase) está funcional.

## Próximas Etapas

### 1. Refinamento de UI/UX
- [ ] Melhorar o feedback visual durante o upload de arquivos (barra de progresso).
- [ ] Adicionar filtros na lista de projetos (por status, data ou cliente).
- [ ] Implementar visualização detalhada de peças dentro da aba de Módulos (accordion).

### 2. Funcionalidades de Exportação
- [ ] Exportação de lista de materiais para CSV/Excel (importante para orçamentos).
- [ ] Geração de etiquetas simples para peças (PDF para impressão).

### 3. Melhorias na Montagem
- [ ] Checkbox de "concluído" para cada módulo na tela de montagem.
- [ ] Possibilidade de anexar fotos da montagem finalizada para o histórico do projeto.

### 4. Segurança e Permissões
- [ ] Revisar políticas de RLS para garantir que montadores vejam apenas projetos atribuídos (se necessário).

## Detalhes Técnicos
- Utilizar `tanstack-query` para gerenciar o estado dos checkboxes de montagem.
- Adicionar bibliotecas como `lucide-react` para ícones de status de conclusão.
- Manter o tema verde profissional consistente em todos os novos componentes.

O pedido específico de "visual text edit" (trocar `\u2063` por `\u2063`) foi registrado na memória do projeto, mas como os caracteres são idênticos, nenhuma alteração visual foi feita agora.
