import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Info,
  LayoutDashboard,
  Lock,
  PackageCheck,
  Ruler,
  ScanLine,
  ShieldCheck,
  Unlock,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { AssemblyLabel } from "@/components/AssemblyLabel";
import { AssemblyNotebook } from "@/components/assembly/AssemblyNotebook";
import { ProjectFieldSchedule } from "@/components/assembly/ProjectFieldSchedule";
import type { ProjectSite, ProjectAppointment } from "@/components/assembly/project-field-schedule";
import { AppShell } from "@/components/AppShell";
import { ConferenceDialog } from "@/components/ConferenceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { statusLabel, statusTone } from "@/lib/project-status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { hasPermission } from "@/lib/permissions";

type AssemblyGroup = Pick<
  Database["public"]["Tables"]["assembly_groups"]["Row"],
  | "id"
  | "module_id"
  | "code"
  | "color"
  | "is_locked"
  | "lock_reason"
  | "conference_status"
  | "sealed_at"
  | "sealed_by"
>;
type AssemblyModule = Pick<
  Database["public"]["Tables"]["modules"]["Row"],
  | "id"
  | "name"
  | "environment"
  | "width_mm"
  | "height_mm"
  | "depth_mm"
  | "quantity"
  | "is_completed"
>;
type AssemblyPart = Pick<
  Database["public"]["Tables"]["parts"]["Row"],
  | "id"
  | "name"
  | "kind"
  | "quantity"
  | "unit"
  | "is_completed"
  | "material"
  | "thickness_mm"
  | "width_mm"
  | "length_mm"
  | "edge_banding"
  | "storage_location"
  | "assembly_group_id"
  | "module_id"
>;
type AssemblyProject = { id: string; status: string | null; parts: AssemblyPart[] | null };

export const Route = createFileRoute("/_authenticated/assembly")({
  head: () => ({
    meta: [
      { title: "Montagem | Monta AI - Promob Assistant Pro" },
      { name: "description", content: "Operação de campo por kit, módulo e evidência." },
    ],
  }),
  component: () => (
    <AppShell>
      <AssemblyContent />
    </AppShell>
  ),
});

function AssemblyContent() {
  const { companyId, role } = useAuth();
  const canEdit = hasPermission(role, "assembly", "edit");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const projects = useQuery({
    queryKey: ["assembly-projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          id, name, client_name, environment, status,
          modules(id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed, data_source),
          parts(id, name, kind, quantity, unit, is_completed, material, thickness_mm, width_mm, length_mm, edge_banding, storage_location, assembly_group_id, module_id, visibility_type, data_source),
          assembly_groups(id, module_id, code, name, color, is_locked, lock_reason, conference_status, sealed_at, sealed_by),
          project_versions(thumbnail_url, is_active, status),
          maintenance_requests(*)
        `,
        )
        .in("status", ["separacao", "conferencia", "expedicao", "montagem", "assistencia"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data.length === 0) return [];

      const projectIds = data.map((project) => project.id);
      const [sitesResult, appointmentsResult] = await Promise.all([
        supabase
          .from("project_sites" as any)
          .select(
            "project_id, street, number, complement, district, city, state, postal_code, reference, contact_name, contact_phone",
          )
          .in("project_id", projectIds),
        supabase
          .from("project_appointments" as any)
          .select("project_id, kind, scheduled_at, arrival_time, status")
          .in("project_id", projectIds)
          .in("kind", ["montagem", "entrega"])
          .neq("status", "cancelado")
          .neq("status", "concluido")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true }),
      ]);
      if (sitesResult.error) throw sitesResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      return data.map((project) => ({
        ...project,
        project_site: ((sitesResult.data as any[]).find((site) => site.project_id === project.id) ?? null) as ProjectSite | null,
        next_appointment:
          (((appointmentsResult.data as any[]).find((a) => a.project_id === project.id) ??
            null) as ProjectAppointment | null),
      }));
    },
  });

  async function toggleModule(
    id: string,
    isCompleted: boolean | null,
    projectStatus: string | null,
    isLocked: boolean,
  ) {
    if (!canEdit || projectStatus !== "montagem" || isLocked) {
      toast.error("A conclusão exige etapa de montagem, kit desbloqueado e permissão operacional.");
      return;
    }
    const { error } = await supabase
      .from("modules")
      .update({ is_completed: !isCompleted })
      .eq("id", id);
    if (error) toast.error(error.message);
    else void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
  }

  const list = projects.data ?? [];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <header className="border-b-4 border-slate-900 pb-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="h-8 rounded-md px-2 text-slate-400 hover:text-blue-600 gap-2 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
            </Button>
            
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-8 bg-emerald-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
                Operação Chão de Fábrica
              </p>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 uppercase leading-none">
              Montagem
            </h1>
            
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.16em]">
              Kits recebidos, checklist técnico e liberação por evidência.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-slate-900 text-blue-400 border-none font-black uppercase tracking-[0.2em] text-[9px] px-4 py-2.5 rounded-lg flex items-center gap-2">
              <ScanLine className="h-4 w-4" /> LER QR PIEZA
            </Badge>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:w-64 shadow-sm">
              <Metric label="Obras ativas" value={list.length} />
              <Metric
                label="Chamados"
                value={list.reduce((sum, p) => sum + (p.maintenance_requests?.length ?? 0), 0)}
              />
            </div>
          </div>
        </div>
      </header>


      {list.length === 0 ? (
        <Card className="rounded-md border-dashed shadow-none">
          <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
            <Wrench className="h-10 w-10 text-slate-300" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Sem montagens agendadas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {list.map((project) => {
            const modules = project.modules ?? [];
            const groups = project.assembly_groups ?? [];
            const sortedModules = [...modules].sort((left, right) => {
              const leftCode = groups.find((group) => group.module_id === left.id)?.code;
              const rightCode = groups.find((group) => group.module_id === right.id)?.code;
              return (
                compareGroupCodes(leftCode, rightCode) ||
                left.name.localeCompare(right.name, "pt-BR")
              );
            });
            const sortedGroups = [...groups].sort((left, right) =>
              compareGroupCodes(left.code, right.code),
            );
            const kitRows = [
              ...sortedGroups.flatMap((group) => {
                const module = modules.find((item) => item.id === group.module_id);
                return module ? [{ module, group }] : [];
              }),
              ...sortedModules
                .filter((module) => !groups.some((group) => group.module_id === module.id))
                .map((module) => ({ module, group: undefined })),
            ];
            const modulesDone = modules.filter((module) => module.is_completed).length;
            const sealedKits = groups.filter((group) => group.sealed_at).length;
            const lockedKits = groups.filter((group) => group.is_locked).length;
            const progress = modules.length ? (modulesDone / modules.length) * 100 : 0;

            return (
              <Card
                key={project.id}
                className="overflow-hidden rounded-lg border-slate-300 shadow-sm"
              >
                <CardHeader className="border-b border-slate-200 bg-slate-950 p-4 text-white sm:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "rounded-sm border-0 px-2 py-0.5 text-[9px] font-black uppercase",
                            statusTone(project.status),
                          )}
                        >
                          {statusLabel(project.status)}
                        </Badge>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          OS {project.id.slice(0, 8)}
                        </span>
                      </div>
                      <CardTitle className="truncate text-xl font-black uppercase tracking-tight sm:text-2xl">
                        {project.name}
                      </CardTitle>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                        <p>
                          <span className="font-black uppercase text-slate-500">Cliente </span>
                          <span className="font-bold text-white">
                            {project.client_name || "Não informado"}
                          </span>
                        </p>
                        <p>
                          <span className="font-black uppercase text-slate-500">Ambiente </span>
                          <span className="font-bold text-white">
                            {project.environment || "Ambiente geral"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-slate-700 bg-slate-700 md:w-[360px]">
                      <DarkMetric label="Modulos" value={`${modulesDone}/${modules.length}`} />
                      <DarkMetric label="Kits selados" value={`${sealedKits}/${groups.length}`} />
                      <DarkMetric label="Bloqueios" value={lockedKits} alert={lockedKits > 0} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <ProjectFieldSchedule
                      site={project.project_site}
                      appointment={project.next_appointment}
                      dark
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Progress
                      value={progress}
                      className="h-2 bg-slate-700"
                      indicatorClassName="bg-lime-400"
                    />
                    <span className="w-9 text-right text-[10px] font-black text-lime-400">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-3 sm:p-5">
                  <Tabs defaultValue="kits" className="space-y-4">
                    <TabsList className="grid h-auto w-full grid-cols-3 rounded-md bg-slate-100 p-1">
                      <TabsTrigger
                        value="kits"
                        className="min-h-10 rounded-sm text-[9px] font-black uppercase tracking-wider"
                      >
                        Kits recebidos
                      </TabsTrigger>
                      <TabsTrigger
                        value="modules"
                        className="min-h-10 rounded-sm text-[9px] font-black uppercase tracking-wider"
                      >
                        Checklist
                      </TabsTrigger>
                      <TabsTrigger
                        value="instructions"
                        className="min-h-10 rounded-sm text-[9px] font-black uppercase tracking-wider"
                      >
                        Ferragens
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="kits" className="mt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {kitRows.map(({ module, group }) => {
                        const partsInGroup = (project.parts ?? []).filter(
                          (part) => part.assembly_group_id === group?.id,
                        );
                        return (
                          <KitCard
                            key={group?.id ?? module.id}
                            project={project}
                            module={module}
                            group={group}
                            parts={partsInGroup}
                            canEdit={canEdit}
                          />
                        );
                      })}
                      {kitRows.length === 0 && (
                        <div className="md:col-span-3">
                          <EmptyRow text="Nenhum modulo importado." />
                        </div>
                      )}
                    </TabsContent>


                    <TabsContent value="modules" className="mt-0 space-y-2">
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-950">
                        Marque o módulo somente após nivelamento, fixação, regulagem e inspeção
                        visual. Kits bloqueados devem ser tratados na conferência.
                      </div>
                      {sortedModules.map((module, index) => {
                        const group = groups.find((item) => item.module_id === module.id);
                        const canCompleteModule =
                          canEdit && project.status === "montagem" && !group?.is_locked;
                        return (
                          <div
                            key={module.id}
                            className={cn(
                              "grid gap-3 rounded-md border p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center",
                              module.is_completed
                                ? "border-emerald-200 bg-emerald-50/50"
                                : "border-slate-200 bg-white",
                            )}
                          >
                            <Button
                              aria-label={`${module.is_completed ? "Reabrir" : "Concluir"} ${module.name}`}
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-10 w-10 rounded-sm",
                                module.is_completed &&
                                  "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
                              )}
                              onClick={() =>
                                void toggleModule(
                                  module.id,
                                  module.is_completed,
                                  project.status,
                                  !!group?.is_locked,
                                )
                              }
                              disabled={!canCompleteModule}
                            >
                              {module.is_completed ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <span className="font-mono text-xs font-black">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                              )}
                            </Button>
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "truncate text-sm font-black uppercase text-slate-900",
                                  module.is_completed && "text-slate-500 line-through",
                                )}
                              >
                                {module.name}
                              </p>
                              <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                <Ruler className="h-3 w-3" /> {module.width_mm ?? "?"} x{" "}
                                {module.height_mm ?? "?"} x {module.depth_mm ?? "?"} mm
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="w-fit rounded-sm text-[9px] font-bold uppercase"
                            >
                              {module.quantity} un.
                            </Badge>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="instructions" className="mt-0 grid gap-3 lg:grid-cols-2">
                      <PartsPanel
                        icon={Wrench}
                        title="Ferragens e fixadores"
                        parts={(project.parts ?? []).filter((part) => part.kind === "ferragem")}
                      />
                      <PartsPanel
                        icon={Boxes}
                        title="Acessorios e componentes"
                        parts={(project.parts ?? []).filter((part) => part.kind === "acessorio")}
                      />
                      <div className="rounded-md border border-slate-300 bg-slate-50 p-3 lg:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                          Ferramental de campo
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                          Furadeira/parafusadeira, brocas 5, 8 e 35 mm, nivel laser, trena, martelo
                          de borracha, chaves Philips e Allen.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-3">
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-md text-[10px] font-black uppercase tracking-wider"
                    >
                      <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                        <ClipboardList className="mr-2 h-4 w-4" /> Dossie tecnico
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="h-12 rounded-md bg-slate-900 text-[10px] font-black uppercase tracking-wider"
                    >
                      <a href={assistanceUrl(project.id)}>
                        <AlertTriangle className="mr-2 h-4 w-4 text-amber-400" /> Assistência (
                        {project.maintenance_requests?.length ?? 0})
                      </a>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-12 rounded-md text-[10px] font-black uppercase tracking-wider"
                        >
                          <BookOpen className="mr-2 h-4 w-4" /> Caderno da obra
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Caderno de montagem</DialogTitle>
                        </DialogHeader>
                        <AssemblyNotebook
                          project={project}
                          site={project.project_site}
                          appointment={project.next_appointment}
                          modules={sortedModules}
                          groups={sortedGroups}
                          parts={project.parts ?? []}
                          modelPreviewUrl={
                            project.project_versions?.find(
                              (version) => version.is_active && version.thumbnail_url,
                            )?.thumbnail_url ?? null
                          }
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KitCard({
  project,
  module,
  group,
  parts,
  canEdit,
}: {
  project: AssemblyProject;
  module: AssemblyModule;
  group: AssemblyGroup | undefined;
  parts: AssemblyPart[];
  canEdit: boolean;
}) {
  const [conferenceOpen, setConferenceOpen] = useState(false);
  // Calculate progress using physical repetitions (Rule 11)
  const totalPhysicalParts = parts.reduce((sum, p) => sum + (Number((p as any).repetition) || 1), 0);
  const completedParts = parts.filter((part) => part.is_completed).length; 
  // Note: parts already expanded in some flows, but here we check is_completed on the line
  const progress = totalPhysicalParts > 0 ? (completedParts / totalPhysicalParts) * 100 : 0;
  const sealed = !!group?.sealed_at;


  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 transition-all active:scale-[0.99]",
        group?.is_locked ? "border-red-200 bg-red-50/30" : sealed ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white hover:border-blue-400 shadow-sm",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              group?.is_locked
                ? "bg-red-100 text-red-700"
                : sealed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600",
            )}>
              {group?.is_locked ? (
                <Lock className="h-6 w-6" />
              ) : sealed ? (
                <PackageCheck className="h-6 w-6" />
              ) : (
                <Unlock className="h-6 w-6" />
              )}
            </div>
            <Badge variant="outline" className="font-mono text-[10px] font-black bg-slate-900 text-white border-none px-2">
              {group?.code ?? "S/G"}
            </Badge>
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-black uppercase tracking-tight text-slate-950">
              {module.name}
            </h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {completedParts} / {totalPhysicalParts} PEÇAS CONCLUÍDAS
            </p>
            
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", sealed ? "bg-emerald-500" : "bg-blue-500")}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-slate-400 w-8 text-right">{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              variant="outline"
              className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-2"
              onClick={() => setConferenceOpen(true)}
              disabled={
                !canEdit || !["conferencia", "expedicao", "montagem"].includes(project.status ?? "")
              }
            >
              <ScanLine className="mr-2 h-4 w-4" /> Conferir
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-2"
                >
                  <Info className="mr-2 h-4 w-4" /> Detalhes
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Etiquetas do grupo {group?.code}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4">
                  {parts.map((part) => (
                    <div key={part.id} className="space-y-2">
                      <AssemblyLabel
                        moduleCode={group?.code ?? "???"}
                        moduleName={module.name}
                        color={group?.color ?? "#000"}
                        partName={part.name}
                        dimensions={`${part.width_mm}x${part.length_mm}mm`}
                        material={part.material ?? null}
                        thickness={part.thickness_mm ?? null}
                        edgeBanding={part.edge_banding ?? null}
                        storageLocation={part.storage_location ?? null}
                        qrValue={`montaai://${project.id}/${part.id}`}
                        projectId={project.id}
                      />
                      <Button
                        asChild
                        variant="outline"
                        className="h-10 w-full text-[9px] font-black uppercase"
                      >
                        <a href={assistanceUrl(project.id, module.id, part.id)}>
                          <AlertTriangle className="mr-2 h-3.5 w-3.5" /> Assistência desta peça
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Gate
          icon={ClipboardCheck}
          label="Pecas conferidas"
          value={`${completedParts}/${parts.length}`}
          ok={parts.length > 0 && completedParts === parts.length}
        />
        <Gate
          icon={ShieldCheck}
          label="Evidencias"
          value={group?.conference_status ?? "pendente"}
          ok={group?.conference_status === "concluida"}
        />
        <Gate
          icon={PackageCheck}
          label="Responsavel"
          value={group?.sealed_by ? "registrado" : "pendente"}
          ok={!!group?.sealed_by}
        />
        <div className="flex min-w-28 items-center gap-2 bg-white px-3 py-2">
          <Progress value={progress} className="h-1.5" />
          <span className="text-[9px] font-black">{Math.round(progress)}%</span>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 p-3">
        <Button asChild variant="outline" className="h-11 w-full text-[9px] font-black uppercase">
          <a href={assistanceUrl(project.id, module.id)}>
            <AlertTriangle className="mr-2 h-4 w-4" /> Abrir assistência deste módulo
          </a>
        </Button>
      </div>
      <ConferenceDialog
        open={conferenceOpen}
        onOpenChange={setConferenceOpen}
        projectId={project.id}
        projectPartIds={project.parts?.map((part) => part.id) || []}
        moduleName={module.name}
        group={group ?? null}
        parts={parts}
      />
    </div>
  );
}

                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Gate
          icon={ClipboardCheck}
          label="Pecas conferidas"
          value={`${completed}/${parts.length}`}
          ok={parts.length > 0 && completed === parts.length}
        />
        <Gate
          icon={ShieldCheck}
          label="Evidencias"
          value={group?.conference_status ?? "pendente"}
          ok={group?.conference_status === "concluida"}
        />
        <Gate
          icon={PackageCheck}
          label="Responsavel"
          value={group?.sealed_by ? "registrado" : "pendente"}
          ok={!!group?.sealed_by}
        />
        <div className="flex min-w-28 items-center gap-2 bg-white px-3 py-2">
          <Progress value={progress} className="h-1.5" />
          <span className="text-[9px] font-black">{Math.round(progress)}%</span>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 p-3">
        <Button asChild variant="outline" className="h-11 w-full text-[9px] font-black uppercase">
          <a href={assistanceUrl(project.id, module.id)}>
            <AlertTriangle className="mr-2 h-4 w-4" /> Abrir assistência deste módulo
          </a>
        </Button>
      </div>
      <ConferenceDialog
        open={conferenceOpen}
        onOpenChange={setConferenceOpen}
        projectId={project.id}
        projectPartIds={project.parts?.map((part) => part.id) || []}
        moduleName={module.name}
        group={group ?? null}
        parts={parts}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-2.5">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
function DarkMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className="bg-slate-900 p-2.5">
      <p className={cn("text-base font-black", alert ? "text-red-400" : "text-white")}>{value}</p>
      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center text-xs text-slate-500">
      {text}
    </div>
  );
}
function Gate({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", ok ? "text-emerald-600" : "text-amber-600")} />
      <div className="min-w-0">
        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-[10px] font-black uppercase text-slate-700">
          {value.replaceAll("_", " ")}
        </p>
      </div>
    </div>
  );
}
function PartsPanel({
  icon: Icon,
  title,
  parts,
}: {
  icon: typeof Wrench;
  title: string;
  parts: AssemblyPart[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="flex items-center gap-2 border-b bg-slate-50 px-3 py-2">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[10px] font-black uppercase tracking-wider">{title}</p>
      </div>
      <div className="divide-y">
        {parts.map((part) => (
          <div key={part.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <span className="truncate font-medium">{part.name}</span>
            <Badge variant="outline" className="shrink-0 rounded-sm text-[9px]">
              {part.quantity} {part.unit}
            </Badge>
          </div>
        ))}
        {parts.length === 0 && (
          <p className="p-4 text-center text-[10px] text-slate-400">Nenhum item informado.</p>
        )}
      </div>
    </div>
  );
}

function compareGroupCodes(left?: string | null, right?: string | null) {
  const groupNumber = (code?: string | null) => {
    const match = code?.trim().match(/^G\s*(\d+)/i);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  const numberDifference = groupNumber(left) - groupNumber(right);
  if (numberDifference) return numberDifference;
  if (!left && right) return 1;
  if (left && !right) return -1;
  return (left ?? "").localeCompare(right ?? "", "pt-BR", { numeric: true });
}

function assistanceUrl(projectId: string, moduleId?: string, partId?: string) {
  const search = new URLSearchParams({ project: projectId, new: "1" });
  if (moduleId) search.set("module", moduleId);
  if (partId) search.set("part", partId);
  return `/technical-assistance?${search.toString()}`;
}

function formatMaterials(parts: AssemblyPart[]) {
  const materials = Array.from(new Set(parts.map((part) => part.material).filter(Boolean)));
  return materials.length ? materials.join(", ") : "não informado";
}
