# Plano de Implementação: Visualização de Módulos Reais e Caderno de Montagem

Este plano visa atender à solicitação do usuário de visualizar os "módulos reais", garantindo que a alimentação técnica via XML e DXF reflita corretamente no sistema Monta AI, especialmente no Caderno de Montagem e na visualização 3D.

## Objetivos
- Garantir que a importação do XML Promob extraia e vincule corretamente os módulos às peças.
- Certificar que o Caderno de Montagem (`AssemblyBookTab`) e a Visualização 3D Operacional (`Operational3DView`) carreguem os dados reais persistidos.
- Ajustar a interface para que o acesso aos módulos seja intuitivo e centralizado.

## Etapas Técnicas

### 1. Refinamento da Ingestão de Dados (Backend & Libs)
- **`src/lib/promob-import.ts`**:
    - Ajustar a função `parsePromobXML` para garantir que o `module_id` seja capturado com base no `UNIQUEID` do Promob e que a estrutura hierárquica seja mantida.
    - Garantir que o metadado `is_industrial_module: true` seja aplicado a todos os módulos reconhecidos.
- **`src/routes/_authenticated.projects.import.tsx`**:
    - Verificar se o payload enviado ao banco de dados (`modulesPayload` e `loosePartsPayload`) está vinculando corretamente as peças aos módulos via `id_xml`.

### 2. Correção de Visibilidade e Carregamento (Frontend)
- **`src/routes/_authenticated.projects.$projectId.tsx`**:
    - Garantir que a sidebar carregue as abas de "Módulos" e "Caderno de Montagem" assim que o projeto for alimentado.
    - Adicionar um log de depuração visual caso os módulos não sejam carregados, facilitando a identificação de falhas de RLS ou dados vazios.
- **`src/components/project/AssemblyBookTab.tsx`**:
    - Refinar o carregamento de peças para garantir que as peças vinculadas a módulos sejam exibidas dentro de seus respectivos containers e as peças avulsas sejam agrupadas separadamente.
- **`src/components/project/Operational3DView.tsx`**:
    - Assegurar que os módulos renderizados em 3D utilizem as dimensões reais (`width_mm`, `height_mm`, `depth_mm`) vindas do banco de dados.

### 3. Matriz de Validação (Gabarito CLOSET)
- Validar se o projeto de teste (CLOSET) reflete:
    - 13 Módulos reais identificados.
    - 409 Itens totais distribuídos.
    - Visualização 3D volumétrica correta para cada módulo.

## Resumo das Alterações
- Ajuste no parser de XML para fidelidade total dos módulos.
- Garantia de persistência do vínculo Peça <-> Módulo.
- Atualização da UI para exibição imediata após importação.
