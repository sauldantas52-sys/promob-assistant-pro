# Plano de Correção: Bucket de Storage e Políticas RLS

O erro "Bucket not found" foi confirmado: o bucket `project-files` **não existe** no banco de dados, apesar de estar referenciado em várias migrations e no código front-end. O Supabase retornou uma lista vazia para este bucket.

## Ações Imediatas

1. **Criação do Bucket**: Criar formalmente o bucket `project-files` via ferramenta nativa do Lovable Cloud.
2. **Correção de Políticas RLS**: Reaplicar as políticas de segurança para garantir que os papéis industriais (`admin`, `escritorio`, `projetista`) tenham permissão de escrita e leitura, respeitando o isolamento por `company_id`.
3. **Validação de Upload**: Testar o fluxo de upload no ambiente de desenvolvimento para confirmar a persistência antes de liberar para o usuário.

## Detalhes Técnicos

### 1. Criação do Bucket
- **Nome**: `project-files` (exatamente como no código)
- **Privacidade**: Privado (RLS ativado)

### 2. Migração de Segurança
```sql
-- Garantir que o bucket exista (via ferramenta Lovable)
-- Aplicar políticas de acesso
CREATE POLICY "Company users can read project artifacts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "Technical roles can upload project artifacts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'escritorio') OR public.has_role(auth.uid(), 'projetista'))
);
```

### 3. Verificação no Front-end
- O código já utiliza `.from("project-files")`, o que está correto. O problema é a ausência do objeto no backend.

---
**Nota**: A função `discard_import_session` também depende da existência deste bucket para verificar arquivos órfãos. Sua criação corrigirá o erro colateral de "limpeza indevida".
