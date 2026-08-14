import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Truck,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  type ExceptionKind,
  canFinalizeKit,
  canShipModule,
  exceptionLabels,
  logException,
  pendingExceptionCount,
  syncPendingExceptions,
  validateScan,
} from "@/lib/assembly-exceptions";

type PartRow = {
  id: string;
  name: string;
  kind: string;
  quantity: number;
  unit: string | null;
  is_completed: boolean | null;
};

type GroupRow = {
  id: string;
  code: string | null;
  color: string | null;
  is_locked: boolean | null;
  lock_reason: string | null;
  conference_status: string | null;
  sealed_at: string | null;
} | null;

const manualKinds: ExceptionKind[] = [
  "peca_faltante",
  "ferragem_faltante",
  "peca_danificada",
  "qr_ilegivel",
  "qr_outro_projeto",
  "item_duplicado",
];

export function ConferenceDialog({
  open,
  onOpenChange,
  projectId,
  projectPartIds,
  moduleName,
  group,
  parts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectPartIds: string[];
  moduleName: string;
  group: GroupRow;
  parts: PartRow[];
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [excKind, setExcKind] = useState<ExceptionKind>("peca_faltante");
  const [excReason, setExcReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [busy, setBusy] = useState(false);

  const groupId = group?.id ?? null;

  const logs = useQuery({
    queryKey: ["conference-exceptions", groupId],
    enabled: open && !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_logs")
        .select("id, action, notes, status_to, metadata, created_at, user_id")
        .eq("project_id", projectId)
        .like("action", "excecao_montagem:%")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).filter((l) => (l.metadata as any)?.group_id === groupId);
    },
  });

  const hardware = useQuery({
    queryKey: ["conference-hardware", groupId],
    enabled: open && !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assembly_group_hardware")
        .select("id, part_id, quantity_required, quantity_confirmed, status, parts(name, unit)")
        .eq("group_id", groupId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    setPending(pendingExceptionCount());
    const goOnline = async () => {
      setOnline(true);
      const { synced, remaining } = await syncPendingExceptions();
      setPending(remaining);
      if (synced > 0) {
        toast.success(`Conexão restabelecida: ${synced} evento(s) sincronizados.`);
        
        // After sync, we update the group status to "sincronizado" to force manual re-validation
        if (groupId) {
          await supabase
            .from("assembly_groups")
            .update({ 
              conference_status: "sincronizado",
              lock_reason: "Dados sincronizados offline. Revalidação manual obrigatória." 
            })
            .eq("id", groupId);
          void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
        }
        
        void queryClient.invalidateQueries({ queryKey: ["conference-exceptions"] });
      }
    };
    const goOffline = () => {
      setOnline(false);
      toast.warning("Sem internet. As leituras e exceções ficam pendentes de sincronização.");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [queryClient, groupId]);

  const hwRows = hardware.data ?? [];
  const confirmedParts = parts.filter((p) => p.is_completed).length;
  const confirmedHardware = hwRows.filter((h) => h.status === "conferido").length;
  const openExceptions = (logs.data ?? []).filter(
    (l) => (l.metadata as any)?.blocking && l.status_to === "aberto",
  );

  const guard = useMemo(
    () =>
      canFinalizeKit({
        totalParts: parts.length,
        confirmedParts,
        totalHardware: hwRows.length,
        confirmedHardware,
        openExceptions: openExceptions.length,
      }),
    [parts.length, confirmedParts, hwRows.length, confirmedHardware, openExceptions.length],
  );

  const isSynchronizing = pending > 0 && online;
  const statusToDisplay = isSynchronizing 
    ? "Sincronizado — aguardando conferência" 
    : (group?.conference_status === "sincronizado" ? "Sincronizado — conferência manual necessária" : null);

  const sealed = !!group?.sealed_at;
  const shipping = canShipModule({ sealed, guard });
  const progress = parts.length ? (confirmedParts / parts.length) * 100 : 0;

  async function register(kind: ExceptionKind, reason: string, extra?: Record<string, unknown>) {
    const result = await logException({
      projectId,
      groupId,
      kind,
      reason,
      statusFrom: group?.conference_status ?? "em_andamento",
      statusTo: "aberto",
      metadata: { module: moduleName, group_code: group?.code ?? null, ...(extra ?? {}) },
    });
    if (result === "pendente") {
      setPending(pendingExceptionCount());
      toast.warning("Exceção registrada localmente. Será sincronizada ao voltar a internet.");
    } else {
      void logs.refetch();
    }
    return result;
  }

  async function lockGroup(reason: string) {
    if (!groupId) return;
    await supabase
      .from("assembly_groups")
      .update({ is_locked: true, lock_reason: reason, conference_status: "com_excecao" })
      .eq("id", groupId);
    void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
  }

  async function handleScan() {
    const scanned = parts.filter((p) => p.is_completed).map((p) => p.id);
    const result = validateScan(code, {
      projectId,
      groupPartIds: parts.map((p) => p.id),
      alreadyScannedIds: scanned,
      projectPartIds,
    });
    if (!result.ok) {
      toast.error(`${exceptionLabels[result.kind]}: ${result.message}`);
      await register(result.kind, result.message, { scanned_code: code });
      if (result.kind !== "qr_ilegivel") await lockGroup(`${exceptionLabels[result.kind]} na conferência`);
      setCode("");
      return;
    }
    const { error } = await supabase.from("parts").update({ is_completed: true }).eq("id", result.partId);
    if (error) {
      toast.error(error.message);
      await register("offline", `Falha ao gravar leitura da peça ${result.partId}: ${error.message}`, {
        part_id: result.partId,
      });
    } else {
      if (groupId) {
        await supabase.from("assembly_group_items_log").insert({
          group_id: groupId,
          item_type: "peca",
          item_id: result.partId,
        });
      }
      toast.success("Item conferido.");
      void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
    }
    setCode("");
  }

  async function handleFinalize() {
    if (!guard.allowed) {
      toast.error("Kit bloqueado", { description: guard.reasons.join(" ") });
      await register(
        "expedicao_bloqueada",
        `Tentativa de finalizar kit com pendências: ${guard.reasons.join(" ")}`,
      );
      return;
    }
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("assembly_groups")
      .update({
        conference_status: "concluida",
        separation_status: "concluida",
        sealed_at: new Date().toISOString(),
        sealed_by: user?.id ?? null,
        is_locked: false,
        lock_reason: null,
      })
      .eq("id", groupId!);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logException({
      projectId,
      groupId,
      kind: "sincronizacao",
      reason: "Kit conferido e selado sem pendências.",
      statusFrom: "em_andamento",
      statusTo: "selado",
      metadata: { module: moduleName, group_code: group?.code ?? null, parts: parts.length },
    });
    toast.success("Kit selado para expedição.");
    void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
    void logs.refetch();
  }

  async function handleCancel() {
    if (cancelReason.trim().length < 5) {
      toast.error("Informe o motivo do cancelamento (mín. 5 caracteres).");
      return;
    }
    setBusy(true);
    await supabase
      .from("assembly_groups")
      .update({ conference_status: "cancelada", is_locked: true, lock_reason: cancelReason })
      .eq("id", groupId!);
    await logException({
      projectId,
      groupId,
      kind: "conferencia_cancelada",
      reason: cancelReason,
      statusFrom: group?.conference_status ?? "em_andamento",
      statusTo: "cancelada",
      metadata: { module: moduleName, group_code: group?.code ?? null },
    });
    setBusy(false);
    setCancelReason("");
    toast.warning("Conferência cancelada e kit bloqueado.");
    void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
    void logs.refetch();
  }

  async function handleReopen() {
    if (reopenReason.trim().length < 5) {
      toast.error("Informe o motivo da reabertura (mín. 5 caracteres).");
      return;
    }
    setBusy(true);
    await supabase
      .from("assembly_groups")
      .update({
        conference_status: "em_andamento",
        sealed_at: null,
        sealed_by: null,
        is_locked: true,
        lock_reason: `Kit reaberto: ${reopenReason}`,
      })
      .eq("id", groupId!);
    await logException({
      projectId,
      groupId,
      kind: "kit_reaberto",
      reason: reopenReason,
      statusFrom: "selado",
      statusTo: "reaberto",
      metadata: { module: moduleName, group_code: group?.code ?? null },
    });
    setBusy(false);
    setReopenReason("");
    toast.warning("Kit reaberto. Expedição bloqueada até nova conferência completa.");
    void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
    void logs.refetch();
  }

  async function handleManualException() {
    if (excReason.trim().length < 5) {
      toast.error("Descreva o motivo da exceção (mín. 5 caracteres).");
      return;
    }
    await register(excKind, excReason);
    await lockGroup(`${exceptionLabels[excKind]}: ${excReason}`);
    setExcReason("");
    toast.warning(`${exceptionLabels[excKind]} registrada. Kit bloqueado.`);
  }

  async function resolveException(logId: string, kind: string) {
    const row = (logs.data ?? []).find((l) => l.id === logId);
    await logException({
      projectId,
      groupId,
      kind: (row?.metadata as any)?.kind ?? "sincronizacao",
      reason: `Tratativa registrada para: ${row?.notes ?? kind}`,
      statusFrom: "aberto",
      statusTo: "resolvido",
      metadata: { resolves_log: logId, module: moduleName },
    });
    await supabase
      .from("production_logs")
      .update({ status_to: "resolvido" })
      .eq("id", logId);
    toast.success("Exceção tratada e registrada.");
    void logs.refetch();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg rounded-3xl border-none shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900 tracking-tight uppercase">
            Conferência: {group?.code}
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            {moduleName} · Validação técnica via QR Code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={online ? "secondary" : "destructive"} className="gap-1">
                {online ? <CheckCircle2 className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {online ? "Online" : "Offline"}
              </Badge>
              {pending > 0 && (
                <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700">
                  <AlertTriangle className="h-3 w-3" /> {pending} pendente(s) de sincronização
                </Badge>
              )}
              {sealed && (
                <Badge className="gap-1">
                  <Lock className="h-3 w-3" /> Selado
                </Badge>
              )}
            </div>
            
            {statusToDisplay && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2 text-[11px] font-medium text-amber-800 border border-amber-200">
                <ShieldAlert className="h-3.5 w-3.5" />
                {statusToDisplay}
              </div>
            )}
          {pending > 0 && online && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { synced, remaining } = await syncPendingExceptions();
                setPending(remaining);
                toast.success(`${synced} exceção(ões) sincronizadas.`);
                void logs.refetch();
              }}
            >
              Sincronizar agora
            </Button>
          )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Peças {confirmedParts}/{parts.length} · Ferragens {confirmedHardware}/{hwRows.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-code" className="text-xs">
              Leitura de QR Code / etiqueta
            </Label>
            <div className="flex gap-2">
              <Input
                id="scan-code"
                inputMode="text"
                autoComplete="off"
                placeholder="montaai://projeto/peça ou id da peça"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleScan();
                }}
                className="h-11"
              />
              <Button className="h-11 gap-2" onClick={() => void handleScan()} disabled={!code.trim()}>
                <ScanLine className="h-4 w-4" /> Ler
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Peças do kit</p>
            {parts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 border-b pb-2">
                <Checkbox
                  checked={p.is_completed ?? false}
                  disabled={sealed}
                  onCheckedChange={async (val) => {
                    const { error } = await supabase
                      .from("parts")
                      .update({ is_completed: !!val })
                      .eq("id", p.id);
                    if (error) {
                      await register("offline", `Falha ao gravar conferência de ${p.name}: ${error.message}`, {
                        part_id: p.id,
                        action_type: "check_part",
                        value: !!val
                      });
                    }
                    void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
                  }}
                />
                <span className={cn("text-sm", p.is_completed && "text-muted-foreground line-through")}>
                  {p.name} ({p.quantity} {p.unit})
                </span>
              </div>
            ))}
            {parts.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma peça vinculada a este kit.</p>
            )}
          </div>

          {hwRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Ferragens do kit</p>
              {hwRows.map((h: any) => (
                <div key={h.id} className="flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    checked={h.status === "conferido"}
                    disabled={sealed}
                    onCheckedChange={async (val) => {
                      await supabase
                        .from("assembly_group_hardware")
                        .update({
                          status: val ? "conferido" : "pendente",
                          quantity_confirmed: val ? h.quantity_required : 0,
                        })
                        .eq("id", h.id);
                      void hardware.refetch();
                    }}
                  />
                  <span className="text-sm">
                    {h.parts?.name ?? "Ferragem"} — {h.quantity_required} {h.parts?.unit ?? "un"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {openExceptions.length > 0 && (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" /> Exceções em aberto ({openExceptions.length})
              </p>
              {openExceptions.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-2 text-xs">
                  <div>
                    <p className="font-medium">{(l.metadata as any)?.label ?? l.action}</p>
                    <p className="text-muted-foreground">{l.notes}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(l.created_at as string).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void resolveException(l.id, l.action)}>
                    Tratar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Registrar exceção</p>
            <Select value={excKind} onValueChange={(v) => setExcKind(v as ExceptionKind)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {manualKinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {exceptionLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Motivo, peça envolvida e evidência"
              value={excReason}
              onChange={(e) => setExcReason(e.target.value)}
              rows={2}
            />
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={() => void handleManualException()}
            >
              <AlertTriangle className="h-4 w-4" /> Registrar e bloquear kit
            </Button>
          </div>

          {!guard.allowed && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">Expedição bloqueada</p>
              <ul className="mt-1 list-disc pl-4">
                {guard.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2 rounded-lg border p-3">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">
              Cancelar conferência
            </p>
            <Textarea
              placeholder="Motivo do cancelamento"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
            <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void handleCancel()}>
              <XCircle className="h-4 w-4" /> Cancelar conferência
            </Button>
          </div>

          {sealed && (
            <div className="grid gap-2 rounded-lg border p-3">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Reabrir kit selado</p>
              <Textarea
                placeholder="Motivo da reabertura"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={2}
              />
              <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void handleReopen()}>
                <RotateCcw className="h-4 w-4" /> Reabrir kit
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:mr-auto">
            <Truck className="h-3.5 w-3.5" />
            {shipping.allowed ? "Liberado para expedição" : "Expedição bloqueada"}
          </div>
          <Button
            className="h-11 w-full sm:w-auto"
            disabled={busy || sealed}
            onClick={() => void handleFinalize()}
          >
            {sealed ? "Kit selado" : "Finalizar kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
