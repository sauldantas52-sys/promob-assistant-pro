import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  Scan,
  History,
  Info,
  QrCode,
  Lock,
  Loader2,
  ShieldCheck,
  Calendar,
  ShieldAlert,
  Search,
  Monitor,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

type AssemblyGroup = Pick<
  Database["public"]["Tables"]["assembly_groups"]["Row"],
  | "id"
  | "code"
  | "name"
  | "color"
  | "is_locked"
  | "lock_reason"
  | "conference_status"
  | "sealed_at"
  | "loading_status"
>;
type ShippingVolume = Database["public"]["Tables"]["shipping_volumes"]["Row"];
type ShippingVolumeUpdate = Database["public"]["Tables"]["shipping_volumes"]["Update"];
type ShippingStatus = Database["public"]["Enums"]["shipping_status"];
type ShippingProject = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  "id" | "name" | "client_name" | "environment" | "status"
> & {
  assembly_groups: AssemblyGroup[] | null;
  shipping_volumes: ShippingVolume[] | null;
};
type VolumeStatusMetadata = Partial<
  Pick<ShippingVolumeUpdate, "driver_name" | "vehicle_plate" | "weight_kg">
> & {
  lock_reason?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

export const Route = createFileRoute("/_authenticated/shipping")({
  head: () => ({
    meta: [
      { title: "Expedição e Carga | Monta AI" },
      { name: "description", content: "Gerenciamento de volumes, carregamento e logística." },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  const { companyId, role } = useAuth();
  const canEdit = hasPermission(role, "shipping", "edit");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("volumes");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["shipping-projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          id, name, client_name, environment, status,
          assembly_groups(
            id, code, name, color, is_locked, lock_reason, conference_status, sealed_at, loading_status
          ),
          shipping_volumes(*)
        `,
        )
        .in("status", ["expedicao", "montagem", "concluido"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client_name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [projects, searchQuery]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] space-y-6 p-3 sm:p-5 lg:p-8 animate-in fade-in duration-500">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="h-8 rounded-md px-2 text-slate-400 hover:text-blue-600 gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
            </Button>
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-8 bg-indigo-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">
                Expedição e Logística
              </p>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
              Expedição
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.16em]">
              Gestão de volumes, romaneios e status de carregamento.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar projeto ou cliente..."
                className="h-11 w-full rounded-lg border-slate-200 bg-slate-50 pl-9 text-xs font-bold placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-lg border-slate-200 bg-white px-4 text-[9px] font-black uppercase tracking-wider gap-2 hover:bg-slate-50"
            >
              <Monitor className="h-4 w-4 text-indigo-600" /> Modo Logístico
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-fit">
            <TabsTrigger
              value="volumes"
              className="h-10 rounded-lg px-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-black text-[8px] uppercase tracking-wider sm:px-5 sm:text-[9px]"
            >
              Volumes por Projeto
            </TabsTrigger>
            <TabsTrigger
              value="active-loads"
              className="h-10 rounded-lg px-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-black text-[8px] uppercase tracking-wider sm:px-5 sm:text-[9px]"
            >
              Cargas Ativas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="volumes" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-20 text-center text-muted-foreground">
                  <PackageCheck className="h-10 w-10 mx-auto mb-4 opacity-20" />
                  <p>Nenhum projeto pronto para expedição encontrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredProjects.map((project) => (
                  <ProjectShippingCard key={project.id} project={project} canEdit={canEdit} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active-loads">
            <Card className="border-dashed">
              <CardContent className="py-20 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>Módulo de Logística em Carga Ativa está sendo sincronizado...</p>
                <p className="text-xs">
                  Utilize a aba "Volumes por Projeto" para gerenciar as expedições individuais.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function ProjectShippingCard({ project, canEdit }: { project: ShippingProject; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const groups = project.assembly_groups || [];
  const volumes = project.shipping_volumes || [];

  // A group needs a volume if it's sealed.
  const pendingSealedGroups = groups.filter(
    (g) => g.sealed_at && !volumes.some((v) => v.group_id === g.id),
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const generateVolumes = async () => {
    if (!canEdit || project.status !== "expedicao") {
      toast.error("Projeto fora da etapa de expedição ou perfil somente leitura.");
      return;
    }
    if (pendingSealedGroups.length === 0) return;
    setIsGenerating(true);
    try {
      const newVolumes = pendingSealedGroups.map((g) => ({
        project_id: project.id,
        group_id: g.id,
        code: `VOL-${project.id.slice(0, 4)}-${g.code}`,
        name: `Volume: ${g.code} - ${g.name}`,
        status: "aguardando",
      }));

      const { error } = await supabase.from("shipping_volumes").insert(newVolumes);
      if (error) throw error;

      toast.success(`${newVolumes.length} volume(s) gerado(s) para o projeto.`);
      void queryClient.invalidateQueries({ queryKey: ["shipping-projects"] });
    } catch (err: unknown) {
      toast.error("Erro ao gerar volumes: " + getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 space-y-2">
            <CardTitle className="break-words text-xl font-black leading-tight tracking-tight text-slate-900 uppercase sm:text-2xl">
              {project.name}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
              {project.client_name} <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />{" "}
              {project.environment}
            </CardDescription>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            {pendingSealedGroups.length > 0 && (
              <Button
                size="lg"
                className="h-11 rounded-lg bg-indigo-600 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-indigo-700"
                onClick={generateVolumes}
                disabled={isGenerating || !canEdit || project.status !== "expedicao"}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Gerar Volumes ({pendingSealedGroups.length})
              </Button>
            )}
            <Badge
              className={cn(
                "rounded-md border-none px-3 py-2 text-[9px] font-black uppercase tracking-wider",
                project.status === "expedicao"
                  ? "bg-blue-600 text-white"
                  : "bg-emerald-600 text-white",
              )}
            >
              {project.status === "expedicao" ? "EM EXPEDIÇÃO" : project.status!.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {volumes.length > 0 ? (
            volumes.map((vol) => (
              <VolumeRow
                key={vol.id}
                volume={vol}
                project={project}
                canEdit={canEdit && project.status === "expedicao"}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aguardando conclusão da conferência para gerar volumes de carga.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VolumeRow({
  volume,
  project,
  canEdit,
}: {
  volume: ShippingVolume;
  project: ShippingProject;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const statusColors: Record<string, string> = {
    aguardando: "bg-slate-100 text-slate-700 border-slate-200",
    conferido: "bg-blue-100 text-blue-700 border-blue-200",
    bloqueado: "bg-destructive/10 text-destructive border-destructive/20",
    carregado: "bg-green-100 text-green-700 border-green-200",
    entregue: "bg-primary/10 text-primary border-primary/20",
  };

  const group = project.assembly_groups?.find((g) => g.id === volume.group_id);

  // Logic locks
  const isLocked = group?.is_locked || group?.conference_status === "sincronizado";
  const lockReason =
    group?.lock_reason ||
    (group?.conference_status === "sincronizado"
      ? "Conferência offline aguardando auditoria manual."
      : null);

  const updateStatus = async (newStatus: ShippingStatus, metadata: VolumeStatusMetadata = {}) => {
    if (!canEdit) {
      toast.error("Projeto fora da etapa de expedição ou perfil somente leitura.");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const update: ShippingVolumeUpdate & VolumeStatusMetadata = {
        status: newStatus,
        scanned_at: newStatus === "conferido" ? new Date().toISOString() : volume.scanned_at,
        loaded_at: newStatus === "carregado" ? new Date().toISOString() : volume.loaded_at,
        delivered_at: newStatus === "entregue" ? new Date().toISOString() : volume.delivered_at,
        ...(user ? { responsible_id: user.id } : {}),
        ...metadata,
      };
      const { error } = await supabase
        .from("shipping_volumes")
        .update(update as ShippingVolumeUpdate)
        .eq("id", volume.id);

      if (error) throw error;

      // Log activity
      const { error: logError } = await supabase.from("production_logs").insert({
        project_id: project.id,
        user_id: user?.id || null,
        action: `expedicao:${newStatus}`,
        notes: `Volume ${volume.code} alterado para ${newStatus}`,
        metadata: { volume_id: volume.id, ...metadata },
      });
      if (logError) throw logError;

      toast.success(`Status do volume atualizado: ${newStatus}`);
      void queryClient.invalidateQueries({ queryKey: ["shipping-projects"] });
    } catch (err: unknown) {
      toast.error("Erro: " + getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
        isLocked && "bg-destructive/5",
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-100 text-slate-400">
          <QrCode className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
            <p className="break-words text-sm font-black leading-tight tracking-tight text-slate-900 uppercase sm:text-base">
              {volume.name}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 rounded-md border-none px-2 py-1 text-[8px] font-black uppercase tracking-wider",
                statusColors[volume.status],
              )}
            >
              {volume.status.toUpperCase()}
            </Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
            <span className="font-mono">{volume.code}</span>
            {volume.weight_kg && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                <span>{volume.weight_kg}kg</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
        {isLocked ? (
          <div className="flex min-w-0 items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-destructive ring-1 ring-destructive/20">
            <Lock className="h-4 w-4 shrink-0" />
            <span className="break-words">BLOQUEADO: {lockReason}</span>
          </div>
        ) : !canEdit ? (
          <Badge variant="outline" className="rounded-md text-[9px] font-black uppercase">
            Somente leitura
          </Badge>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {volume.status === "aguardando" && (
              <Button
                size="lg"
                className="h-10 rounded-lg bg-blue-600 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-blue-700"
                onClick={() => updateStatus("conferido")}
                disabled={busy}
              >
                <Scan className="mr-2 h-4 w-4" /> Conferir
              </Button>
            )}

            {volume.status === "conferido" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    className="h-10 rounded-lg bg-indigo-600 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-indigo-700"
                  >
                    <Truck className="mr-2 h-4 w-4" /> Registrar Carga
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-[calc(100%_-_1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border-none p-5 shadow-2xl sm:p-8">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-black text-slate-900 tracking-tight uppercase sm:text-2xl">
                      Manifesto de Carregamento
                    </DialogTitle>
                    <DialogDescription className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                      Identificação do transportador para o volume {volume.code}.
                    </DialogDescription>
                  </DialogHeader>
                  <LoadingForm
                    initialData={{
                      driver_name: volume.driver_name,
                      vehicle_plate: volume.vehicle_plate,
                    }}
                    onSubmit={(data) => updateStatus("carregado", data)}
                  />
                </DialogContent>
              </Dialog>
            )}

            {volume.status === "carregado" && (
              <Button
                size="lg"
                className="h-10 rounded-lg bg-emerald-600 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-emerald-700"
                onClick={() => updateStatus("entregue")}
                disabled={busy}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Entregar
              </Button>
            )}

            {volume.status === "entregue" && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
                ENTREGUE
              </div>
            )}
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Info className="h-5 w-5 text-slate-400" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-[calc(100%_-_1.5rem)] overflow-y-auto rounded-2xl border-none p-5 shadow-2xl sm:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight uppercase sm:text-2xl">
                Detalhes do Volume
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Status</p>
                  <p className="font-medium capitalize">{volume.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">QR Code</p>
                  <p className="font-mono">{volume.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Módulo Origem</p>
                  <p className="font-medium">{group?.name || "Avulso"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Peso</p>
                  <p className="font-medium">
                    {volume.weight_kg ? `${volume.weight_kg}kg` : "Não informado"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-bold">Linha do Tempo</p>
                <div className="space-y-2">
                  <TimelineItem icon={Calendar} label="Criado" date={volume.created_at} />
                  {volume.scanned_at && (
                    <TimelineItem icon={Scan} label="Conferido" date={volume.scanned_at} />
                  )}
                  {volume.loaded_at && (
                    <TimelineItem icon={Truck} label="Carregado" date={volume.loaded_at} />
                  )}
                  {volume.delivered_at && (
                    <TimelineItem icon={CheckCircle2} label="Entregue" date={volume.delivered_at} />
                  )}
                </div>
              </div>

              {(volume.vehicle_plate || volume.driver_name) && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Logística</p>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <p>
                      <strong>Veículo:</strong> {volume.vehicle_plate || "-"}
                    </p>
                    <p>
                      <strong>Motorista:</strong> {volume.driver_name || "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              {volume.status !== "aguardando" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive"
                  onClick={() =>
                    updateStatus("bloqueado", { lock_reason: "Reabertura manual de carga" })
                  }
                >
                  <ShieldAlert className="mr-2 h-3.5 w-3.5" /> Bloquear / Reabrir Carga
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function LoadingForm({
  onSubmit,
  initialData,
}: {
  onSubmit: (data: VolumeStatusMetadata) => void;
  initialData?: { driver_name?: string | null; vehicle_plate?: string | null };
}) {
  const [plate, setPlate] = useState(initialData?.vehicle_plate || "");
  const [driver, setDriver] = useState(initialData?.driver_name || "");
  const [weight, setWeight] = useState("");

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="plate">Placa do Veículo</Label>
        <Input
          id="plate"
          placeholder="ABC-1234"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="driver">Nome do Motorista / Responsável</Label>
        <Input
          id="driver"
          placeholder="João Silva"
          value={driver}
          onChange={(e) => setDriver(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="weight">Peso Aproximado (kg)</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          placeholder="0.0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>
      <Button
        className="w-full h-11"
        disabled={!plate || !driver}
        onClick={() =>
          onSubmit({
            vehicle_plate: plate,
            driver_name: driver,
            weight_kg: weight ? parseFloat(weight) : null,
          })
        }
      >
        Confirmar Carregamento
      </Button>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  date,
}: {
  icon: LucideIcon;
  label: string;
  date: string | null;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-0.5 sm:flex-row">
        <span className="text-muted-foreground">{label}</span>
        <span className="break-words font-medium">
          {new Date(date ?? 0).toLocaleString("pt-BR")}
        </span>
      </div>
    </div>
  );
}
