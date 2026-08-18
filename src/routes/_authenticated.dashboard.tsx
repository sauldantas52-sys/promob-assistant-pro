import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FolderKanban, Factory, Wrench, AlertTriangle, ClipboardCheck, ChevronRight, ShieldCheck, Upload, FileDown, Loader2 } from "lucide-react";
import { generateAuditReport } from "@/lib/audit-report.functions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useAuth, roleLabels, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hasPermission } from "@/lib/permissions";
import { statusLabel, statusTone } from "@/lib/project-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Monta AI — Promob Assistant Pro" },
      {
        name: "description",
        content:
          "Visão geral de projetos, produção, conferência e montagem de móveis planejados a partir dos arquivos do Promob.",
      },
      { property: "og:title", content: "Dashboard | Monta AI" },
      { property: "og:description", content: "Indicadores de projetos, produção e montagem." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { fullName, role, companyId } = useAuth();

  const projects = useQuery({
    queryKey: ["projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, client_name, status, operational_status, environment, created_at, 
          machining_blocked, is_validated, company_id, updated_at, is_test,
          modules(count),
          parts(count),
          project_distribution(area, status)
        `)
        .eq("company_id", companyId as string)
        .eq("is_test", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = projects.data ?? [];
  const activeCount = list.filter(p => p.operational_status !== 'finalizado' && (p.operational_status as string) !== 'assistencia').length;
  const decisionRequired = list.filter(p => p.operational_status === 'divergencia_encontrada' || p.operational_status === 'conferencia_pendente').length;
  const validationPending = list.filter(p => p.is_validated === false && p.operational_status !== 'finalizado').length;
  
  const countByStatus = (status: string) => list.filter((p) => p.status === status).length;

  return (
    <div className="flex flex-col min-h-full">
      {/* Technical Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Fábrica em Movimento</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Turno Industrial • {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        
        {hasPermission(role, "projects", "import") && (
          <Button asChild className="h-10 w-full sm:w-auto px-6 rounded-md bg-[var(--lime-industrial)] hover:bg-lime-600 text-slate-900 font-bold uppercase tracking-wider text-[11px] shadow-sm transition-all active:scale-95">
            <Link to="/projects/import">Novo Projeto</Link>
          </Button>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Top Summary Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fluxo Atual - Dark Panel */}
          <Card className="bg-[var(--sidebar-industrial)] border-none text-white overflow-hidden shadow-lg group relative">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--lime-industrial)]" />
                Comando Industrial
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black tracking-tighter">{activeCount}</p>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projetos Ativos</p>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded px-1.5 py-0 text-[8px] font-bold uppercase">
                        Real-time Ingestion
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                  <div>
                    <p className="text-lg font-bold text-[var(--status-corte)]">
                      {list.filter(p => p.project_distribution?.some(d => d.area === 'corte' && d.status !== 'concluido')).length}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Corte</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--status-usinagem)]">
                      {list.filter(p => p.project_distribution?.some(d => d.area === 'usinagem' && d.status !== 'concluido')).length}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Usinagem</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-lg font-bold text-[var(--status-montagem)]">
                      {list.filter(p => p.status === 'montagem').length}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Montagem</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-lg font-bold text-[var(--status-expedicao)]">
                      {list.filter(p => p.status === 'expedicao').length}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Carga</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segurança de Engenharia - Light/Accent Panel */}
          <Card className="bg-white border border-slate-200 overflow-hidden shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Segurança Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black tracking-tighter text-slate-900">{decisionRequired}</p>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bloqueios CNC</p>
                      <p className="text-[8px] font-bold text-red-500 uppercase">Aguardando Auditoria</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xl font-black text-blue-600">{validationPending}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Aguardando Checklist</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded px-2 py-0.5 text-[9px] font-bold uppercase">
                    Modo Piloto: Bypass Ativo
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Linha de Produção Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Factory className="h-3.5 w-3.5" />
              Terminal de Projetos Industriais
            </h2>
            <Link to="/projects" className="text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:underline">Auditar Planta</Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Projeto / Cliente</th>
                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-right">Módulos / Peças</th>
                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status / Etapa</th>
                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-right">Segurança</th>
                    <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.slice(0, 8).map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{project.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{project.client_name || "Sem cliente"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-black text-slate-900">
                            {(project as any).modules?.[0]?.count || 0} / {(project as any).parts?.[0]?.count || 0}
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Módulos / Peças</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge className={cn("w-fit rounded px-2 py-0.5 text-[9px] font-bold uppercase border-none", statusTone(project.status))}>
                            {statusLabel(project.status)}
                          </Badge>
                          <span className="text-[8px] text-slate-400 font-bold uppercase px-1">
                            {statusLabel(project.operational_status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {project.machining_blocked ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase">Bloqueada</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase">Liberada</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                          <Link to="/projects/$projectId" params={{ projectId: project.id }} search={{ tab: 'modules' }}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {list.slice(0, 5).map((project) => (
                <Link 
                  key={project.id}
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="block p-4 active:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{project.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">{project.client_name || "Sem cliente"}</span>
                    </div>
                    <Badge className={cn("rounded px-2 py-0.5 text-[8px] font-bold uppercase border-none", statusTone(project.status))}>
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Segurança CNC</span>
                    {project.machining_blocked ? (
                      <span className="text-[9px] font-bold text-red-600 uppercase">Bloqueada</span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">Liberada</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {list.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nenhum projeto em linha</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
