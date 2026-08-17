import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const distributeProject = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    projectId: z.string().uuid(),
    modules: z.array(z.any()),
    looseParts: z.array(z.any())
  }).parse(data))
  .handler(async ({ data }) => {
    // A função ingest_and_distribute_project agora aceita 3 argumentos:
    // _project_id, _modules, _loose_parts.
    // O company_id é resolvido internamente na função SQL.
    const { error } = await supabase.rpc('ingest_and_distribute_project', {
      _project_id: data.projectId,
      _modules: data.modules,
      _loose_parts: data.looseParts
    });

    if (error) {
      console.error("Erro na distribuição industrial:", error);
      throw error;
    }
    return { success: true };
  });
