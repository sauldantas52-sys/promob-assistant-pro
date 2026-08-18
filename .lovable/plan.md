# Plano de Implementação: Visualização de Módulos Reais e Caderno de Montagem

O usuário relatou que os módulos não estão aparecendo ("nada criado até agora"). Embora a lógica de vinculação e o parser tenham sido atualizados na última interação, precisamos garantir que a persistência no banco de dados e o filtro no frontend estejam perfeitamente alinhados com o `id_xml` (UniqueId do Promob) para projetos industriais.

## 1. Verificação de Dados (Auditoria)
- Validar se a tabela `modules` está recebendo o `id_xml` corretamente durante o import.
- Confirmar se a tabela `parts` possui a referência `module_id` preenchida ou se depende exclusivamente do `id_xml` no metadados.

## 2. Refinamento da Ingestão (`src/routes/_authenticated.projects.import.tsx`)
- Garantir que o payload enviado para a RPC `import_client_project` inclua o `id_xml` em todos os níveis (Módulos e Peças).
- Assegurar que o mapeamento `part.module_id` seja resolvido no backend ou que o frontend saiba lidar com a vinculação via `id_xml`.

## 3. Ajuste de Visibilidade no Frontend (`src/components/project/AssemblyBookTab.tsx`)
- Reforçar a lógica de agrupamento para garantir que peças sem `module_id` (UUID) mas com o mesmo `id_xml` (Promob) do módulo sejam exibidas dentro dele.
- Adicionar logs de depuração visíveis no console para rastrear peças "órfãs".

## 4. Ajuste no Visualizador 3D (`src/components/project/Operational3DView.tsx`)
- Sincronizar a lógica de filtragem de peças com a do Caderno de Montagem para consistência total entre 2D e 3D.

## 5. Validação com o Gabarito Closet
- Confirmar se os 13 módulos do arquivo `CLOSET-18-07-2026.xml` são renderizados com seus nomes reais e dimensões técnicas.

### Detalhes Técnicos
- **Tabela `modules`**: Campo `id_xml` é a chave de integração com o Promob.
- **Tabela `parts`**: O campo `metadata` deve conter `id_xml` para peças.
- **RLS**: Garantir que as tabelas `modules` e `parts` permitam leitura para o `company_id` do usuário.
