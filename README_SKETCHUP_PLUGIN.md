# Monta AI - SketchUp Plugin Bridge Specification

Este documento descreve a integração técnica entre o plugin SketchUp (Ruby) e a plataforma Monta AI.

## 1. Fluxo de Autenticação
O plugin deve utilizar o `access_token` do usuário autenticado na plataforma.
Endpoint de autenticação: `POST /api/public/auth/login` (ou via Supabase Auth).

## 2. Contrato de Dados (Manifest.json)
O arquivo `manifest.json` deve ser incluído no pacote de upload.

### Estrutura do Item
```json
{
  "plugin_version": "1.0.0",
  "project_id": "uuid",
  "version_number": 1,
  "items": [
    {
      "environment_id": "Ambiente 01",
      "module_id": "GUID_UNIQUE_SKP",
      "group_code": "G1",
      "module_name": "Balcão 2P",
      "material": "MDF 18mm",
      "color": "Branco TX",
      "thickness_mm": 18.0,
      "width_mm": 800.0,
      "height_mm": 720.0,
      "depth_mm": 580.0,
      "position_x": 100.0,
      "position_y": 0.0,
      "position_z": 0.0,
      "tags": ["02_MODULOS", "03_G1"]
    }
  ]
}
```

## 3. Estrutura de Tags Obrigatórias
Para que a organização automática funcione, os componentes no SketchUp devem estar associados às seguintes tags:
- `00_REFERENCIAS`
- `01_AMBIENTES`
- `02_MODULOS`
- `03_G1` | `04_G2` | `05_G3`
- `06_AV` (Itens avulsos/não identificados)
- `18_MONTAGEM` (Agrupadores para caderno mobile)

## 4. Endpoint de Upload
`POST /api/public/skp-upload`

Campos Multipart/Form-Data:
- `manifest`: Arquivo JSON
- `skp_file`: Arquivo .skp
- `thumbnails`: Array de imagens (png/jpg)
- `drawings`: Plantas e cortes (pdf/png)

## 5. Validações Automáticas (Server-side)
1. **Nome Obrigatório**: Módulos sem nome serão marcados como "Não confirmado".
2. **Geometria**: Medidas negativas ou zero geram erro de validação.
3. **Ambientes**: Itens fora de tags de ambiente serão marcados como "Órfãos".
4. **Duplicidade**: GUIDs repetidos bloqueiam a versão para revisão manual.

## 6. Segurança
- **machining_blocked = true**: Por padrão, nenhuma peça vinda do SketchUp libera usinagem CNC sem conferência no Promob.
- **RLS**: Todos os dados são isolados por `company_id`.

---
*Monta AI — Promob Assistant Pro*
