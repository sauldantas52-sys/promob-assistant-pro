# Monta AI - SketchUp Plugin Bridge Specification v1.0

Este documento descreve a especificação completa para o desenvolvimento do plugin Ruby do SketchUp para integração com o ecossistema Monta AI.

## 1. Fluxo de Autenticação

O plugin deve utilizar a autenticação do Supabase. Para ambientes industriais, recomenda-se o fluxo de login via e-mail/senha ou código de operador.

- **Endpoint**: `POST https://nhkburqoligtdyrjtkrs.supabase.co/auth/v1/token?grant_type=password`
- **Headers**: 
  - `apikey`: `sb_publishable_M9jDHpJ214--HnafZLr8dA_CS3WAlF2`
  - `Content-Type`: `application/json`
- **Body**: `{"email": "user@example.com", "password": "..."}`
- **Resposta**: Retorna um `access_token` (JWT).

## 2. API de Integração (TanStack Start Server Function)

O envio do pacote SketchUp é feito através de uma Server Function segura que valida o `manifest.json` e os arquivos associados.

- **Endpoint (RPC)**: `POST /_server/processSkpPackage`
- **Payload**:
```json
{
  "projectId": "UUID-DO-PROJETO",
  "manifest": {
    "plugin_version": "1.0.0",
    "project_id": "UUID-DO-PROJETO",
    "version_number": 1,
    "items": [ ... ]
  },
  "files": [
    { "type": "skp", "url": "URL-DO-STORAGE", "name": "projeto.skp" },
    { "type": "pdf", "url": "URL-DO-STORAGE", "name": "plantas.pdf" }
  ]
}
```

## 3. Especificação do manifest.json

### Campos Obrigatórios do Projeto/Versão
- `plugin_version`: Versão do plugin emissor.
- `project_id`: ID único do projeto no Monta AI.
- `version_number`: Contador incremental de versões.

### Campos do Módulo (Items)
- `environment_id`: Nome ou ID do ambiente (Cozinha, Quarto, etc).
- `module_id` (GUID): ID único e persistente do componente no SketchUp. **Crucial para rastreabilidade.**
- `group_code`: Classificação industrial:
  - `G1`: Estruturas/Módulos base.
  - `G2`: Frentes/Portas.
  - `G3`: Internos/Gavetas.
  - `AV`: Itens avulsos/Acessórios.
- `module_name`: Nome descritivo (ex: "Balcão Pia 2 Portas").
- `material`: Nome do material (ex: "MDF Branco TX").
- `color`: Cor/Acabamento.
- `thickness_mm`: Espessura da chapa em milímetros (numeric).
- `width_mm`, `height_mm`, `depth_mm`: Dimensões externas (numeric).
- `position_x`, `position_y`, `position_z`: Coordenadas globais no modelo SKP.
- `tags`: Array de strings contendo as layers do componente.

## 4. Arquivos do Pacote
O plugin deve realizar o upload prévio para o Supabase Storage (bucket `project_files`) e enviar as URLs:
- **SKP**: Modelo original 3D.
- **Planta**: Desenhos técnicos em PDF.
- **Cotas**: Detalhamento de medidas.
- **Perspectivas**: Renderizações ou capturas de tela.

## 5. Respostas e Auditoria

### Sucesso (200 OK)
```json
{
  "versionId": "UUID",
  "itemCount": 150,
  "validationCount": 0
}
```

### Erro (400/500)
- Erros de schema Zod (campos faltando).
- Erros de permissão (Company ID mismatch).

### Logs de Auditoria
O sistema registra automaticamente em `project_package_validations`:
- `MISSING_NAME`: Módulo sem nome.
- `DUPLICATE_GROUP`: GUID repetido.
- `ORPHAN_OBJECT`: Sem ambiente definido.

## 6. Regras de Negócio e Segurança
- **Isolamento**: Filtro obrigatório por `company_id`.
- **Status**: Versões novas entram como "Não confirmado" (análise de engenharia).
- **Trava Industrial**: `machining_blocked = true`. O SketchUp fornece geometria e layout; a autoridade de furação e CNC permanece no Promob.

---

# Exemplos de Manifest

## Exemplo Válido (manifest_valid.json)
```json
{
  "plugin_version": "1.0.0",
  "project_id": "81fa35c2-70ed-4be7-8bb0-e64501b55952",
  "version_number": 1,
  "items": [
    {
      "environment_id": "Cozinha",
      "module_id": "SKP-GUID-998877",
      "group_code": "G1",
      "module_name": "Balcão 2 Portas",
      "material": "MDF Branco",
      "color": "Branco",
      "thickness_mm": 18,
      "width_mm": 800,
      "height_mm": 720,
      "depth_mm": 580,
      "position_x": 0, "position_y": 0, "position_z": 0,
      "tags": ["02_MODULOS", "03_G1"]
    }
  ]
}
```

## Exemplo Inválido (manifest_invalid.json)
```json
{
  "plugin_version": "1.0.0",
  "project_id": "ID-INVALIDO",
  "version_number": "um",
  "items": [
    {
      "module_id": "GUID_REPETIDO",
      "module_name": "", 
      "group_code": "X9",
      "thickness_mm": -18
    }
  ]
}
```
