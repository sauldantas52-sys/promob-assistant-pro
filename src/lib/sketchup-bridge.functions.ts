import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const itemSchema = z.object({
  environment_id: z.string().optional().nullable(),
  module_id: z.string(),
  group_code: z.string().optional().nullable(),
  module_name: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  thickness_mm: z.number().optional().nullable(),
  width_mm: z.number().optional().nullable(),
  height_mm: z.number().optional().nullable(),
  depth_mm: z.number().optional().nullable(),
  position_x: z.number().optional().nullable(),
  position_y: z.number().optional().nullable(),
  position_z: z.number().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

const manifestSchema = z.object({
  plugin_version: z.string(),
  project_id: z.string().optional().nullable(),
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
    
    const admin = supabaseAdmin as any;

    // 1. Get project metadata and company_id
    const { data: projectData, error: pError } = await admin
      .from("projects")
      .select("company_id, name, environment")
      .eq("id", projectId)
      .single();
    
    if (pError || !projectData) throw new Error("Project not found");
    const companyId = projectData.company_id;

    // 2. Create version record
    const { data: version, error: vError } = await admin
      .from("project_versions")
      .insert({
        project_id: projectId,
        version_number: manifest.version_number,
        status: "analise_fabrica",
        company_id: companyId
      })
      .select()
      .single();

    if (vError) throw new Error(`Failed to create version: ${vError.message}`);

    const validations: any[] = [];
    const processedItems: any[] = [];
    const seenGuids = new Set<string>();

    // 3. Process items with industrial rules
    for (const item of manifest.items) {
      let status: "confirmado" | "não_confirmado" | "divergente" = "confirmado";
      const notes: string[] = [];

      // A. Industrial Tag Validation (00-18)
      const tags = item.tags || [];
      const hasIndustrialTag = tags.some(tag => /^(0[0-9]|1[0-8])_/.test(tag));
      
      if (!hasIndustrialTag) {
        validations.push({
          version_id: version.id,
          status: "aviso",
          error_code: "TAG_NON_INDUSTRIAL",
          message: `Objeto ${item.module_id} não possui tag industrial padronizada (00-18).`,
          item_id: item.module_id,
          company_id: companyId
        });
        status = "não_confirmado";
        notes.push("Tag industrial ausente");
      }

      // B. Group Validation (G1, G2, G3, AV)
      const groupCode = item.group_code || "AV";
      const validGroups = ["G1", "G2", "G3", "AV"];
      if (!validGroups.includes(groupCode)) {
        validations.push({
          version_id: version.id,
          status: "erro",
          error_code: "INVALID_GROUP",
          message: `Grupo ${groupCode} inválido no item ${item.module_id}.`,
          item_id: item.module_id,
          company_id: companyId
        });
        status = "não_confirmado";
      }

      // C. Dimensions Validation
      if (!item.width_mm || !item.height_mm || !item.depth_mm) {
        status = "não_confirmado";
        notes.push("Medidas incompletas");
      }

      // D. Duplicate detection
      if (seenGuids.has(item.module_id)) {
        validations.push({
          version_id: version.id,
          status: "erro",
          error_code: "DUPLICATE_GUID",
          message: `GUID Duplicado: ${item.module_id}.`,
          item_id: item.module_id,
          company_id: companyId
        });
        status = "não_confirmado";
      }
      seenGuids.add(item.module_id);

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
        tags: tags,
        company_id: companyId
      });
    }

    // 4. Persistence with Safety Locks
    if (processedItems.length > 0) {
      await admin.from("project_version_items").insert(processedItems);
      
      // Auto-insert into 'parts' with safety lock
      const partsToInsert = processedItems.map(item => ({
        project_id: projectId,
        company_id: companyId,
        name: item.module_name,
        kind: 'peca',
        material: item.material || 'NÃO DEFINIDO',
        thickness_mm: item.thickness_mm,
        width_mm: item.width_mm,
        length_mm: item.height_mm,
        quantity: 1,
        data_source: 'SKP_BRIDGE',
        machining_blocked: true, // Safety Lock
        status: 'Não confirmado', // Industrial Status
        metadata: { 
          skp_guid: item.module_id, 
          environment: item.environment_id,
          group: item.group_code
        }
      }));
      
      await admin.from("parts").insert(partsToInsert);
      
      // Update global project block
      await admin.from("projects")
        .update({ 
          machining_blocked: true,
          status: 'conferencia' // Move to conference for audit
        })
        .eq("id", projectId);
    }

    if (validations.length > 0) {
      await admin.from("project_package_validations").insert(validations);
    }

    if (files && files.length > 0) {
      const versionFiles = files.map(f => ({
        version_id: version.id,
        file_type: f.type,
        file_url: f.url,
        file_name: f.name,
        company_id: companyId
      }));
      await admin.from("project_version_files").insert(versionFiles);
    }

    return { 
      versionId: version.id, 
      itemCount: processedItems.length, 
      validationCount: validations.length 
    };
  });
