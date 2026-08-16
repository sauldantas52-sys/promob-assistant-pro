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
          .from("project_sites")
          .select(
            "project_id, street, number, complement, district, city, state, postal_code, reference, contact_name, contact_phone",
          )
          .in("project_id", projectIds),
        supabase
          .from("project_appointments")
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
        project_site: sitesResult.data.find((site) => site.project_id === project.id) ?? null,
        next_appointment:
          appointmentsResult.data.find((appointment) => appointment.project_id === project.id) ??
          null,
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
    <div className="mx-auto max-w-[1600px] space-y-5 p-3 sm:p-5 md:p-6 lg:p-8">
      <header className="border-b-2 border-slate-900 pb-4">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/dashboard" })}
          className="mb-3 h-8 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"
        >
          <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Central
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
              <span className="h-2 w-2 bg-emerald-500" /> Operacao de campo
            </div>
            <h1 className="text-3xl font-black uppercase tracking-[-0.05em] text-slate-950 sm:text-4xl">
              Montagem
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Kits recebidos, checklist técnico e liberação por evidência.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-300 bg-slate-300 sm:w-64">
            <Metric label="Obras em campo" value={list.length} />
            <Metric
              label="Chamados"
              value={list.reduce((sum, p) => sum + (p.maintenance_requests?.length ?? 0), 0)}
            />
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

                    <TabsContent value="kits" className="mt-0 space-y-3">
                      {kitRows.map(({ module, group }) => {
                        const parts = (project.parts ?? []).filter(
                          (part) => part.assembly_group_id === group?.id,
                        );
                        return (
                          <KitCard
                            key={group?.id ?? module.id}
                            project={project}
                            module={module}
                            group={group}
                            parts={parts}
                            canEdit={canEdit}
                          />
                        );
                      })}
                      {kitRows.length === 0 && <EmptyRow text="Nenhum modulo importado." />}
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
  const completed = parts.filter((part) => part.is_completed).length;
  const progress = parts.length ? (completed / parts.length) * 100 : 0;
  const sealed = !!group?.sealed_at;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border",
        group?.is_locked ? "border-red-300" : sealed ? "border-emerald-300" : "border-slate-300",
      )}
    >
      <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm",
              group?.is_locked
                ? "bg-red-100 text-red-700"
                : sealed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600",
            )}
          >
            {group?.is_locked ? (
              <Lock className="h-5 w-5" />
            ) : sealed ? (
              <PackageCheck className="h-5 w-5" />
            ) : (
              <Unlock className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-black text-white">
                {group?.code ?? "S/G"}
              </span>
              <p className="truncate text-sm font-black uppercase text-slate-900">{module.name}</p>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {group?.is_locked
                ? group.lock_reason || "Kit bloqueado para montagem"
                : group?.sealed_at
                  ? `Recebido e selado em ${new Date(group.sealed_at).toLocaleDateString("pt-BR")}`
                  : "Aguardando conferencia e selo de recebimento"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1 rounded-sm border border-slate-200 px-1.5 py-0.5 text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: group?.color || "transparent" }}
                />
                Cor logística: {group?.color || "não informada"}
              </span>
              <span className="rounded-sm border border-slate-200 px-1.5 py-0.5 text-slate-600">
                Material/acabamento: {formatMaterials(parts)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-9 flex-1 rounded-sm text-[9px] font-black uppercase sm:flex-none"
            onClick={() => setConferenceOpen(true)}
            disabled={
              !canEdit || !["conferencia", "expedicao", "montagem"].includes(project.status ?? "")
            }
          >
            <ScanLine className="mr-2 h-3.5 w-3.5" /> Conferir
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-sm"
                aria-label="Ver etiquetas"
              >
                <Info className="h-4 w-4" />
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
