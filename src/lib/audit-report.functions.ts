import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const generateAuditReport = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ projectId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    console.log(`Gerando dossiê industrial consolidado para o projeto: ${data.projectId}`);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sb = supabaseAdmin;
      
      const { data: project } = await sb
        .from("projects")
        .select("name, status, is_validated, company_id, machining_blocked, environment, client_name")
        .eq("id", data.projectId)
        .single();

      const { data: parts } = await sb
        .from("parts")
        .select("*")
        .eq("project_id", data.projectId);

      const { data: validationChecks } = await sb
        .from("validation_checks")
        .select("*")
        .eq("project_id", data.projectId);

      const { data: physicalChecks } = await sb
        .from("physical_pilot_checks")
        .select("*")
        .eq("project_id", data.projectId);

      const { data: logs } = await sb
        .from("production_logs")
        .select("*")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false });

      const partsSummary = parts?.reduce((acc: any, part) => {
        acc[part.kind] = (acc[part.kind] || 0) + (part.quantity || 1);
        return acc;
      }, {});

      return {
        success: true,
        reportUrl: "#", 
        timestamp: new Date().toISOString(),
        projectName: project?.name,
        clientName: project?.client_name,
        environment: project?.environment,
        isValidated: project?.is_validated,
        machiningBlocked: project?.machining_blocked,
        summary: "Dossiê Industrial 4.0 Consolidado.",
        sections: [
          { 
            title: "Engenharia e XML", 
            status: "Auditado",
            details: `Total de itens: ${parts?.length || 0}. Resumo: ${JSON.stringify(partsSummary)}`
          },
          { 
            title: "Gates de Segurança Industrial", 
            status: project?.is_validated ? "Aprovado" : "Em Auditoria",
            checks: validationChecks?.length || 0
          },
          { 
            title: "Evidências do Piloto Físico", 
            count: physicalChecks?.length || 0,
            status: physicalChecks?.length ? "Em Andamento" : "Não Iniciado"
          },
          { 
            title: "Histórico de Auditoria e Logs", 
            logsCount: logs?.length || 0,
            lastAction: logs?.[0]?.action
          }
        ]
      };
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      throw new Error("Falha ao consolidar dossiê industrial.");
    }
  });
