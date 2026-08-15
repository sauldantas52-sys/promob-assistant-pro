import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MaintenancePhoto } from "@/components/MaintenancePhoto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MaintenanceStatus = Database["public"]["Enums"]["maintenance_status"];
type MaintenanceType = Database["public"]["Enums"]["maintenance_type"];
type MaintenanceUrgency = Database["public"]["Enums"]["maintenance_urgency"];
type MaintenanceHistory = Database["public"]["Tables"]["maintenance_history"]["Row"];
type Ticket = Database["public"]["Tables"]["maintenance_requests"]["Row"] & {
  projects: { id: string; name: string; client_name: string | null } | null;
  modules: { id: string; name: string } | null;
  parts: { id: string; name: string } | null;
  maintenance_history: MaintenanceHistory[] | null;
};
type ProjectOption = {
  id: string;
  name: string;
  client_name: string | null;
  modules: { id: string; name: string }[] | null;
  parts: { id: string; name: string; module_id: string | null }[] | null;
};

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em analise",
  producao: "Em producao",
  enviado: "Enviado",
  concluido: "Concluido",
};

const nextMaintenanceStatus: Partial<Record<MaintenanceStatus, MaintenanceStatus>> = {
  aberto: "em_analise",
  em_analise: "producao",
  producao: "enviado",
  enviado: "concluido",
};

const urgencyLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  critica: "Critica",
};

export const Route = createFileRoute("/_authenticated/technical-assistance")({
  head: () => ({
    meta: [
      { title: "Assistencia Tecnica | Monta AI" },
      { name: "description", content: "Rastreabilidade de chamados e pos-venda." },
    ],
  }),
  component: TechnicalAssistancePage,
});

function TechnicalAssistancePage() {
  const { companyId, role } = useAuth();
  const canCreateTicket = role === "admin" || role === "escritorio" || role === "montador";
  const canTreatTicket = role === "admin" || role === "escritorio";
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = useQuery({
    queryKey: ["notifications", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tickets = useQuery({
    queryKey: ["maintenance-requests", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(
          `
          *,
          projects(id, name, client_name),
          modules(id, name),
          parts(id, name),
          maintenance_history(*)
        `,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const projects = useQuery({
    queryKey: ["assistance-project-options", companyId],
    enabled: !!companyId && isNewTicketOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, modules(id, name), parts(id, name, module_id)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredTickets = useMemo(() => {
    const rows = tickets.data ?? [];
    const query = searchQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) return rows;
    return rows.filter((ticket) =>
      [
        ticket.description,
        ticket.projects?.name,
        ticket.projects?.client_name,
        ticket.modules?.name,
        ticket.parts?.name,
        ticket.id,
      ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query)),
    );
  }, [tickets.data, searchQuery]);

  const openCount = (tickets.data ?? []).filter((ticket) => ticket.status !== "concluido").length;
  const overdueCount = (tickets.data ?? []).filter((ticket) =>
    isOverdue(ticket.deadline, ticket.status),
  ).length;
  const evidenceCount = (tickets.data ?? []).filter(
    (ticket) => (ticket.photos?.length ?? 0) > 0,
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] space-y-5 p-3 sm:p-5 md:p-6 lg:p-8">
        <header className="border-b-2 border-slate-900 pb-4">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/dashboard" })}
            className="mb-3 h-8 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"
          >
            <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Central
          </Button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
                <span className="h-2 w-2 bg-violet-500" /> Pos-venda rastreavel
              </div>
              <h1 className="text-3xl font-black uppercase tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Assistencia tecnica
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Do projeto e da peça ao diagnóstico, produção e resolução.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-300 bg-slate-300 lg:w-[390px]">
              <Metric label="Em fluxo" value={openCount} />
              <Metric label="SLA vencido" value={overdueCount} alert={overdueCount > 0} />
              <Metric label="Com evidência" value={evidenceCount} />
            </div>
          </div>
        </header>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Projeto, cliente, modulo, peca ou chamado"
              className="h-11 rounded-md pl-9 text-xs"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowNotifications((value) => !value)}
            className="relative h-11 rounded-md px-4 text-[10px] font-black uppercase tracking-wider"
          >
            <Bell className="mr-2 h-4 w-4" /> Alertas
            {(notifications.data?.length ?? 0) > 0 && (
              <span className="ml-2 rounded-sm bg-red-600 px-1.5 py-0.5 text-[8px] text-white">
                {notifications.data?.length}
              </span>
            )}
          </Button>
          {canCreateTicket && (
            <Button
              onClick={() => setIsNewTicketOpen(true)}
              className="h-11 rounded-md bg-slate-900 px-5 text-[10px] font-black uppercase tracking-wider"
            >
              <Plus className="mr-2 h-4 w-4 text-lime-400" /> Novo chamado
            </Button>
          )}
        </div>

        {showNotifications && (
          <section className="overflow-hidden rounded-md border border-slate-300 bg-white">
            <div className="border-b bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
              Alertas de auditoria
            </div>
            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
              {notifications.data?.map((notification) => (
                <div key={notification.id} className="flex gap-3 p-3">
                  {notification.type === "gate_completed" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-900">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[8px] font-bold uppercase text-slate-400">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {(notifications.data?.length ?? 0) === 0 && (
                <p className="p-4 text-xs text-slate-500">Sem alertas recentes.</p>
              )}
            </div>
          </section>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} canTreat={canTreatTicket} />
          ))}
          {filteredTickets.length === 0 && !tickets.isLoading && (
            <Card className="col-span-full rounded-md border-dashed shadow-none">
              <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
                <Wrench className="h-10 w-10 text-slate-300" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Nenhum chamado encontrado
                </p>
              </CardContent>
            </Card>
          )}
          {tickets.isLoading && (
            <Card className="col-span-full rounded-md shadow-none">
              <CardContent className="flex min-h-40 items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando chamados...
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <NewTicketDialog
        open={isNewTicketOpen}
        onOpenChange={setIsNewTicketOpen}
        companyId={companyId}
        projects={projects.data ?? []}
      />
    </AppShell>
  );
}

function TicketCard({ ticket, canTreat }: { ticket: Ticket; canTreat: boolean }) {
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const history = [...(ticket.maintenance_history ?? [])].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
  const overdue = isOverdue(ticket.deadline, ticket.status);
  const photos = ticket.photos ?? [];

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-md border-l-4 shadow-sm",
        urgencyBorder(ticket.urgency),
      )}
    >
      <CardHeader className="border-b border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400">
              CH {ticket.id.slice(0, 8)}
            </p>
            <CardTitle className="mt-1 truncate text-sm font-black uppercase text-slate-950">
              {ticket.projects?.name || "Projeto nao vinculado"}
            </CardTitle>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
              {ticket.projects?.client_name || "Cliente nao informado"}
            </p>
          </div>
          <Badge
            className={cn(
              "shrink-0 rounded-sm border px-2 py-1 text-[8px] font-black uppercase",
              statusTone(ticket.status),
            )}
          >
            {statusLabels[ticket.status] ?? ticket.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "rounded-sm border-0 text-[8px] font-black uppercase",
              urgencyTone(ticket.urgency),
            )}
          >
            {urgencyLabels[ticket.urgency] ?? ticket.urgency}
          </Badge>
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">
            <Clock className="h-3 w-3" /> {formatDate(ticket.created_at)}
          </span>
          <span className="text-[9px] font-bold uppercase text-slate-500">
            {ticket.type?.replaceAll("_", " ")}
          </span>
        </div>

        <p className="line-clamp-3 min-h-[3.75rem] text-xs font-medium leading-5 text-slate-700">
          {ticket.description}
        </p>

        <div className="overflow-hidden rounded-sm border border-slate-200">
          <TraceRow
            label="Projeto"
            value={ticket.projects?.name || "Nao vinculado"}
            complete={!!ticket.project_id}
          />
          <TraceRow
            label="Modulo"
            value={ticket.modules?.name || "Ocorrencia geral"}
            complete={!!ticket.module_id}
          />
          <TraceRow
            label="Peca"
            value={ticket.parts?.name || "Nao informada"}
            complete={!!ticket.part_id}
          />
        </div>

        <div
          className={cn(
            "flex items-center justify-between rounded-sm border px-3 py-2",
            overdue ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50",
          )}
        >
          <div className="flex items-center gap-2">
            {overdue ? (
              <ShieldAlert className="h-4 w-4 text-red-600" />
            ) : (
              <Clock className="h-4 w-4 text-slate-500" />
            )}
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                SLA / prazo
              </p>
              <p
                className={cn(
                  "text-[10px] font-black uppercase",
                  overdue ? "text-red-700" : "text-slate-700",
                )}
              >
                {ticket.deadline
                  ? `${formatDate(ticket.deadline)}${overdue ? " - vencido" : ""}`
                  : "Nao definido"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              Evidencias
            </p>
            <p className="text-[10px] font-black text-slate-700">{photos.length} foto(s)</p>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((url: string, index: number) => (
              <MaintenancePhoto
                key={url}
                pathOrLegacyUrl={url}
                alt={`Evidencia ${index + 1}`}
                className="h-12 w-12 shrink-0 rounded-sm border object-cover"
              />
            ))}
          </div>
        )}

        <div className="rounded-sm border border-slate-200 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
              <History className="h-3 w-3" /> Ultima tratativa
            </p>
            <span className="text-[8px] font-bold text-slate-400">
              {history.length} registro(s)
            </span>
          </div>
          {history[0] ? (
            <>
              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-600">
                {history[0].notes}
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase text-slate-400">
                {formatDateTime(history[0].created_at)}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-amber-700">Diagnostico ainda nao registrado.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-sm text-[9px] font-black uppercase"
          >
            <Link to="/projects/$projectId" params={{ projectId: ticket.project_id }}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Dossie
            </Link>
          </Button>
          {canTreat ? (
            <Button
              onClick={() => setTreatmentOpen(true)}
              className="h-9 rounded-sm bg-violet-700 text-[9px] font-black uppercase hover:bg-violet-800"
            >
              Tratar <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button disabled className="h-9 rounded-sm text-[9px] font-black uppercase">
              Somente leitura
            </Button>
          )}
        </div>
      </CardContent>
      {canTreat && (
        <TreatmentDialog
          ticket={ticket}
          history={history}
          open={treatmentOpen}
          onOpenChange={setTreatmentOpen}
        />
      )}
    </Card>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
  companyId,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string | null;
  projects: ProjectOption[];
}) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [moduleId, setModuleId] = useState("none");
  const [partId, setPartId] = useState("none");
  const [type, setType] = useState("defeito");
  const [urgency, setUrgency] = useState("baixa");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const project = projects.find((item) => item.id === projectId);
  const parts = (project?.parts ?? []).filter(
    (part) => moduleId === "none" || part.module_id === moduleId,
  );

  const createTicket = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !companyId || !projectId)
        throw new Error("Projeto e autenticacao sao obrigatorios.");
      if (!project) throw new Error("Projeto inválido para esta empresa.");
      if (moduleId !== "none" && !project.modules?.some((module) => module.id === moduleId))
        throw new Error("Módulo não pertence ao projeto selecionado.");
      const selectedPart =
        partId === "none" ? null : project.parts?.find((part) => part.id === partId);
      if (partId !== "none" && !selectedPart)
        throw new Error("Peça não pertence ao projeto selecionado.");
      if (selectedPart && moduleId !== "none" && selectedPart.module_id !== moduleId)
        throw new Error("Peça não pertence ao módulo selecionado.");
      const { error } = await supabase.from("maintenance_requests").insert({
        project_id: projectId,
        company_id: companyId,
        created_by: user.id,
        description: description.trim(),
        type: type as MaintenanceType,
        urgency: urgency as MaintenanceUrgency,
        module_id: moduleId === "none" ? null : moduleId,
        part_id: partId === "none" ? null : partId,
        status: "aberto",
        photos: [],
        deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado de assistencia aberto.");
      setDescription("");
      setProjectId("");
      setModuleId("none");
      setPartId("none");
      setDeadline("");
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto rounded-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase">Abrir chamado de campo</DialogTitle>
          <DialogDescription>
            Vincule a origem exata e registre evidências antes da triagem.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Projeto / cliente" className="sm:col-span-2">
            <Select
              value={projectId}
              onValueChange={(value) => {
                setProjectId(value);
                setModuleId("none");
                setPartId("none");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} / {item.client_name || "Sem cliente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Modulo">
            <Select
              value={moduleId}
              onValueChange={(value) => {
                setModuleId(value);
                setPartId("none");
              }}
              disabled={!projectId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ocorrencia geral</SelectItem>
                {project?.modules?.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Peca">
            <Select value={partId} onValueChange={setPartId} disabled={!projectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nao informada</SelectItem>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="defeito">Defeito de fabrica</SelectItem>
                <SelectItem value="dano_transporte">Dano no transporte</SelectItem>
                <SelectItem value="erro_projeto">Erro de projeto</SelectItem>
                <SelectItem value="erro_montagem">Erro de montagem</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Urgencia">
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Critica</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descricao / sintoma" className="sm:col-span-2">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descreva o sintoma, local e impacto..."
              className="min-h-24"
            />
          </Field>
          <Field label="SLA / prazo">
            <Input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </Field>
          <Field label="Fotos / evidencias">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-800">
              Armazenamento seguro de evidências pendente. Registre fotos pelo dossiê técnico até a
              migração do bucket privado.
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!projectId || !description.trim() || createTicket.isPending}
            onClick={() => createTicket.mutate()}
          >
            {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Abrir
            chamado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TreatmentDialog({
  ticket,
  history,
  open,
  onOpenChange,
}: {
  ticket: Ticket;
  history: MaintenanceHistory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState("");
  const nextStatus = nextMaintenanceStatus[ticket.status];
  const updateTicket = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nao autenticado.");
      if (notes.trim().length < 5)
        throw new Error("Registre o diagnostico ou a tratativa (minimo 5 caracteres).");
      const { error } = await supabase.rpc("record_maintenance_transition", {
        _request_id: ticket.id,
        _new_status: status as MaintenanceStatus,
        _notes: notes.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tratativa registrada.");
      setNotes("");
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase">
            Diagnostico e resolucao
          </DialogTitle>
          <DialogDescription>
            {ticket.projects?.name} / {ticket.modules?.name || "Geral"} /{" "}
            {ticket.parts?.name || "Sem peca"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Sintoma registrado
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-700">{ticket.description}</p>
          </div>
          <Field label="Etapa da resolucao">
            <Select value={status} onValueChange={(value) => setStatus(value as MaintenanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ticket.status} disabled>
                  {statusLabels[ticket.status]}
                </SelectItem>
                {nextStatus && (
                  <SelectItem value={nextStatus}>{statusLabels[nextStatus]}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Diagnostico / tratativa">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Causa identificada, acao executada, teste e resultado..."
              className="min-h-28"
            />
          </Field>
          <div className="rounded-md border border-slate-200">
            <div className="border-b bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
              Historico completo
            </div>
            <div className="max-h-44 divide-y overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-center gap-2 text-[8px] font-bold uppercase text-slate-400">
                    <span>{formatDateTime(item.created_at)}</span>
                    <span>
                      {maintenanceStatusLabel(item.old_status)}{" "}
                      <ChevronRight className="inline h-2.5 w-2.5" />{" "}
                      {maintenanceStatusLabel(item.new_status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-600">{item.notes}</p>
                </div>
              ))}
              {history.length === 0 && (
                <p className="p-4 text-[10px] text-slate-500">Sem tratativas anteriores.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={
              updateTicket.isPending ||
              notes.trim().length < 5 ||
              status === ticket.status ||
              !nextStatus
            }
            onClick={() => updateTicket.mutate()}
          >
            {updateTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar
            tratativa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </Label>
      {children}
    </div>
  );
}
function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="bg-white p-2.5">
      <p className={cn("text-lg font-black", alert ? "text-red-600" : "text-slate-950")}>{value}</p>
      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
function TraceRow({ label, value, complete }: { label: string; value: string; complete: boolean }) {
  return (
    <div className="grid grid-cols-[58px_12px_1fr] items-center gap-2 border-b px-2 py-1.5 last:border-b-0">
      <span className="text-[8px] font-bold uppercase text-slate-400">{label}</span>
      <span
        className={cn("h-1.5 w-1.5 rounded-full", complete ? "bg-emerald-500" : "bg-slate-300")}
      />
      <span className="truncate text-[10px] font-bold text-slate-700">{value}</span>
    </div>
  );
}
function isOverdue(deadline: string | null, status: string) {
  return !!deadline && status !== "concluido" && new Date(deadline).getTime() < Date.now();
}
function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "-";
}
function formatDateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "-";
}
function urgencyBorder(urgency: string) {
  return urgency === "critica"
    ? "border-l-red-600"
    : urgency === "alta"
      ? "border-l-orange-500"
      : urgency === "media"
        ? "border-l-amber-400"
        : "border-l-slate-300";
}
function urgencyTone(urgency: string) {
  return urgency === "critica"
    ? "bg-red-600 text-white"
    : urgency === "alta"
      ? "bg-orange-100 text-orange-800"
      : urgency === "media"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";
}
function statusTone(status: string) {
  return status === "concluido"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "producao"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : status === "enviado"
        ? "border-violet-200 bg-violet-50 text-violet-700"
        : status === "em_analise"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-red-200 bg-red-50 text-red-700";
}

function maintenanceStatusLabel(status: MaintenanceStatus | null) {
  return status ? statusLabels[status] : "Inicio";
}
