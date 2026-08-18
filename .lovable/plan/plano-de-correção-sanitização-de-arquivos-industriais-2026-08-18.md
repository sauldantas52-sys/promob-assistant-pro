# Plano de Correção: Sanitização de Arquivos Industriais

O erro "Invalid key" ocorre porque o Supabase Storage não aceita caracteres especiais, acentos ou espaços nos caminhos dos arquivos. O projeto utiliza nomes de pastas como "PASTA DO CLIENTE..." e arquivos como "PRODUÇÃO...", o que causa falhas no upload.

## Alterações Propostas

### 1. Biblioteca de Utilitários de Sanitização
- Centralizar a lógica de sanitização em `src/lib/utils.ts` para garantir consistência em todo o sistema.
- Criar a função `sanitizeStoragePath(path: string)` que:
    - Normaliza NFD (remove acentos).
    - Substitui caracteres não seguros (espaços, acentos, símbolos) por underscores.
    - Preserva `/`, `.`, `-` e `_`.

### 2. Ajuste no Fluxo de Importação (`src/routes/_authenticated.projects.import.tsx`)
- Atualizar a geração do `storagePath` no loop de arquivos.
- Aplicar `sanitizeStoragePath` a cada parte do caminho gerado pelo `webkitRelativePath`.
- Garantir que o `file_name` enviado para a RPC `import_client_project` continue sendo o nome original (com acentos/espaços) para exibição correta na UI.

### 3. Ajuste no Assistente de Orçamento IA (`src/components/budget/AIQuoteWizard.tsx`)
- Substituir a lógica local de sanitização (que já tentava fazer algo similar em `safeStorageName`) pela função centralizada em `utils.ts`.
- Garantir que o nome do arquivo enviado para o bucket `project-files` sob o prefixo `budgets/` seja sanitizado.

### 4. Verificação de Outros Pontos de Upload
- Revisar `src/lib/commercial/documents.ts` (função `safeStorageName`).
- Revisar `src/lib/commercial/whatsapp.functions.ts` para garantir que o envio de anexos use os nomes sanitizados salvos no banco.

## Critérios de Aceite
- Upload bem-sucedido de pastas contendo espaços e acentos (Ex: "PASTA DO CLIENTE-CLOSET 18-07-2026").
- Persistência do nome original no banco de dados para exibição na lista de arquivos do projeto.
- Ausência de erro 400 "Invalid key" no console durante o processo.

## Detalhes Técnicos
```typescript
// Exemplo da função de sanitização
export function sanitizeStoragePath(path: string) {
  return path
    .split('/')
    .map(part => 
      part
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
    )
    .join('/');
}
```
