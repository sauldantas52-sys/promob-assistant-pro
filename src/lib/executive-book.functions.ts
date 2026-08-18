import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Fidelidade 5.4 - Caderno Executivo Automático
 * Funções servidoras para consolidação de dados e geração do caderno.
 */

export const getExecutiveBookData = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ projectId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin;

    // 1. Dados do Projeto
    const { data: project, error: pError } = await sb
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .single();

    if (pError || !project) throw new Error("Projeto não encontrado");

    // 2. Módulos Reais (Root parents)
    const { data: modules, error: mError } = await sb
      .from("modules")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at");

    if (mError) throw mError;

    // 3. Peças por Módulo
    const { data: parts, error: prError } = await sb
      .from("parts")
      .select("*")
      .eq("project_id", data.projectId);

    if (prError) throw prError;

    // 4. Arquivos do Projeto (Pasta do Cliente)
    const { data: files, error: fError } = await sb
      .from("project_files")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });

    if (fError) throw fError;

    // 5. Audit de Identificações Visuais (Geometria 5.1)
    const { data: visualIds } = await sb
      .from("visual_identifications")
      .select("*")
      .eq("project_id", data.projectId);

    return {
      success: true,
      project,
      modules: modules || [],
      parts: parts || [],
      files: files || [],
      visualIds: visualIds || [],
      timestamp: new Date().toISOString(),
    };
  });
