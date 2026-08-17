import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const partSchema = z.object({
  type: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  depth: z.number(),
});

const moduleSchema = z.object({
  guid: z.string(),
  parent_guid: z.string().optional().nullable(),
  name: z.string(),
  code: z.string().optional().nullable(),
  width: z.number(),
  height: z.number(),
  depth: z.number(),
  pos_x: z.number(),
  pos_y: z.number(),
  pos_z: z.number(),
  material: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  thickness: z.union([z.number(), z.string()]).optional().nullable(),
  parts: z.array(partSchema).optional(),
});

const environmentSchema = z.object({
  name: z.string(),
  modules: z.array(moduleSchema),
});

const manifestSchema = z.object({
  project: z.string(),
  client: z.string(),
  version_plugin: z.string(),
  sketchup_version: z.string(),
  origin_data: z.string(),
  unit: z.string(),
  scale: z.string(),
  origin_point: z.array(z.number()),
  machining_blocked: z.boolean(),
  status: z.string(),
  timestamp: z.string(),
  environments: z.array(environmentSchema),
});


export const processSkpPackage = createServerFn({ method: "POST" })
  .inputValidator((data: any) => z.object({
    projectId: z.string(),
    manifest: manifestSchema,
  }).parse(data))
  .handler(async ({ data }) => {
    const { projectId, manifest } = data;
    
    const admin = supabaseAdmin as any;

    // 1. Get project metadata and company_id
    const { data: projectData, error: pError } = await admin
      .from("projects")
      .select("company_id, name")
      .eq("id", projectId)
      .single();
    
    if (pError || !projectData) throw new Error("Project not found");
    const companyId = projectData.company_id;

    // 2. Create version record
    const { data: version, error: vError } = await admin
      .from("project_versions")
      .insert({
        project_id: projectId,
        version_number: 1, // Beta version tracking
        status: "analise_fabrica",
        company_id: companyId,
        metadata: {
          scale: manifest.scale,
          sketchup_version: manifest.sketchup_version,
          plugin_version: manifest.version_plugin,
          client: manifest.client
        }
      })
      .select()
      .single();

    if (vError) throw new Error(`Failed to create version: ${vError.message}`);

    const processedItems: any[] = [];
    const partsToInsert: any[] = [];

    // 3. Flatten environments and modules for storage
    for (const env of manifest.environments) {
      for (const mod of env.modules) {
        processedItems.push({
          version_id: version.id,
          project_id: projectId,
          environment_id: env.name,
          module_id: mod.guid,
          module_name: mod.name,
          material: mod.material,
          color: mod.color,
          thickness_mm: typeof mod.thickness === 'number' ? mod.thickness : null,
          width_mm: mod.width,
          height_mm: mod.height,
          depth_mm: mod.depth,
          position_x: mod.pos_x,
          position_y: mod.pos_y,
          position_z: mod.pos_z,
          plugin_version: manifest.version_plugin,
          engineering_status: mod.material === "Não confirmado" ? "não_confirmado" : "confirmado",
          company_id: companyId,
          tags: ["04_MODULOS"]
        });

        // Add main module as a part
        partsToInsert.push({
          project_id: projectId,
          company_id: companyId,
          name: mod.name,
          kind: 'modulo',
          material: mod.material || 'NÃO CONFIRMADO',
          width_mm: mod.width,
          length_mm: mod.height,
          depth_mm: mod.depth,
          quantity: 1,
          data_source: 'SKP_BRIDGE',
          machining_blocked: false, // Liberado por padrão no Modo Piloto
          status: 'Não confirmado',
          metadata: { 
            skp_guid: mod.guid, 
            environment: env.name,
            code: mod.code,
            scale: manifest.scale
          }
        });

        // Add sub-parts (doors, etc)
        if (mod.parts) {
          for (const p of mod.parts) {
            partsToInsert.push({
              project_id: projectId,
              company_id: companyId,
              name: p.name,
              kind: 'peca',
              material: mod.material || 'NÃO CONFIRMADO',
              width_mm: p.width,
              length_mm: p.height,
              depth_mm: p.depth,
              quantity: 1,
              data_source: 'SKP_BRIDGE',
              machining_blocked: false, // Liberado por padrão no Modo Piloto
              status: 'Não confirmado',
              metadata: { 
                parent_guid: mod.guid,
                type: p.type
              }
            });
          }
        }
      }
    }

    // 4. Persistence with Safety Locks
    if (processedItems.length > 0) {
      await admin.from("project_version_items").insert(processedItems);
      await admin.from("parts").insert(partsToInsert);
      
      // Update global project block
      await admin.from("projects")
        .update({ 
          machining_blocked: false, // Liberado por padrão no Modo Piloto
          status: 'conferencia'
        })
        .eq("id", projectId);
    }

    return { 
      versionId: version.id, 
      itemCount: processedItems.length,
      status: "Ponte Processada"
    };
  });
