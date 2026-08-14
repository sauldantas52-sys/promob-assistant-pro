import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const itemSchema = z.object({
  environment_id: z.string().optional(),
  module_id: z.string(),
  group_code: z.string().optional(),
  module_name: z.string().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  thickness_mm: z.number().optional(),
  width_mm: z.number().optional(),
  height_mm: z.number().optional(),
  depth_mm: z.number().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  position_z: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

const manifestSchema = z.object({
  plugin_version: z.string(),
  project_id: z.string(),
  version_number: z.number(),
  items: z.array(itemSchema),
});

export const processSkpPackage = createServerFn({ method: "POST" })
  .inputValidator((data: any) => z.object({
    projectId: z.string(),
    manifest: manifestSchema,
    files: z.array(z.object({
      type: z.string(),
      url: z.string(),
      name: z.string().optional(),
    })).optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { projectId, manifest, files } = data;
    
    // 1. Create version record
    const { data: version, error: vError } = await supabaseAdmin
      .from("project_versions")
      .insert({
        project_id: projectId,
        version_number: manifest.version_number,
        status: "analise_fabrica",
        company_id: (await supabaseAdmin.from("projects").select("company_id").eq("id", projectId).single()).data?.company_id
      })
      .select()
      .single();

    if (vError) throw new Error(`Failed to create version: ${vError.message}`);

    const validations: any[] = [];
    const processedItems: any[] = [];
    const seenGuids = new Set<string>();

    // 2. Validate and Organize
    for (const item of manifest.items) {
      let status: "confirmado" | "não_confirmado" | "divergente" = "confirmado";
      const notes: string[] = [];

      // Validations
      if (!item.module_name || item.module_name === "") {
        validations.push({
          version_id: version.id,
          status: "aviso",
          error_code: "MISSING_NAME",
          message: `Módulo ${item.module_id} sem nome definido no SketchUp.`,
          item_id: item.module_id,
          company_id: version.company_id
        });
        status = "não_confirmado";
        notes.push("Nome ausente");
      }

      if (seenGuids.has(item.module_id)) {
        validations.push({
          version_id: version.id,
          status: "erro",
          error_code: "DUPLICATE_GROUP",
          message: `ID Duplicado detectado: ${item.module_id}.`,
          item_id: item.module_id,
          company_id: version.company_id
        });
        status = "não_confirmado";
        notes.push("ID Duplicado");
      }
      seenGuids.add(item.module_id);

      if (!item.environment_id) {
        validations.push({
          version_id: version.id,
          status: "aviso",
          error_code: "ORPHAN_OBJECT",
          message: `Objeto ${item.module_id} sem ambiente definido.`,
          item_id: item.module_id,
          company_id: version.company_id
        });
        status = "não_confirmado";
        notes.push("Sem ambiente");
      }

      // Organize groups
      let groupCode = item.group_code;
      if (!groupCode) {
        // Simple logic for default AV
        groupCode = "AV";
      }

      processedItems.push({
        version_id: version.id,
        project_id: projectId,
        environment_id: item.environment_id,
        module_id: item.module_id,
        group_code: groupCode,
        module_name: item.module_name || "Módulo não identificado",
        material: item.material,
        color: item.color,
        thickness_mm: item.thickness_mm,
        width_mm: item.width_mm,
        height_mm: item.height_mm,
        depth_mm: item.depth_mm,
        position_x: item.position_x,
        position_y: item.position_y,
        position_z: item.position_z,
        plugin_version: manifest.plugin_version,
        engineering_status: status,
        validation_notes: notes.join(", "),
        tags: item.tags,
        company_id: version.company_id
      });
    }

    // 3. Batch Inserts
    if (processedItems.length > 0) {
      await supabaseAdmin.from("project_version_items").insert(processedItems);
    }
    if (validations.length > 0) {
      await supabaseAdmin.from("project_package_validations").insert(validations);
    }
    if (files && files.length > 0) {
      const versionFiles = files.map(f => ({
        version_id: version.id,
        file_type: f.type,
        file_url: f.url,
        file_name: f.name,
        company_id: version.company_id
      }));
      await supabaseAdmin.from("project_version_files").insert(versionFiles);
    }

    return { versionId: version.id, itemCount: processedItems.length, validationCount: validations.length };
  });
