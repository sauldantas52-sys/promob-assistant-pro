import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const getProjectTechnicalFiles = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ projectId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: files, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", data.projectId);
    
    if (error) throw error;
    return files;
  });

export const updateValidationCheck = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    projectId: z.string(),
    checkType: z.string(),
    isCompleted: z.boolean(),
    notes: z.string().optional()
  }).parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("validation_checks")
      .upsert({
        project_id: data.projectId,
        check_type: data.checkType,
        is_completed: data.isCompleted,
        notes: data.notes ?? null,
        completed_at: data.isCompleted ? new Date().toISOString() : null
      }, { onConflict: 'project_id,check_type' });
    
    if (error) throw error;
    return { success: true };
  });
