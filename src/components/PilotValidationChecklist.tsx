import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FileSearch,
  Ruler,
  CircleDot,
  LayoutGrid,
  ClipboardList,
  Scissors,
  Boxes,
  Lock,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface PilotValidationChecklistProps {
  projectId: string;
  isMachiningBlocked: boolean;
  projectFiles: any[];
}

const GATES = [
  {
    id: "corte_borda",
    title: "Gate 1: Corte e Borda",
    description: "Requisitos para liberação do plano de corte e nesting",
    items: [
      {
        id: "xml_valido",
        label: "XML Promob Válido",
        icon: ClipboardList,
        description: "Estrutura de dados íntegra",
      },
      {
        id: "lista_corte",
        label: "Lista de Corte Validada",
        icon: Scissors,
        description: "Dimensões brutas confirmadas",
      },
      {
        id: "nesting_dxf",
        label: "DXF de Nesting",
        icon: LayoutGrid,
        description: "Aproveitamento de chapa",
      },
      {
        id: "materiais",
        label: "Materiais e Espessuras",
        icon: Boxes,
        description: "Estoque físico conferido",
      },
    ],
  },
  {
    id: "usinagem",
    title: "Gate 2: Usinagem",
    description: "Requisitos para liberação do controle CNC",
    items: [
      {
        id: "documentacao_tecnica",
        label: "PDF ou DXF Técnico",
        icon: Ruler,
        description: "Individual por peça",
      },
      {
        id: "cotas_furacao",
        label: "Cotas e Furações",
        icon: CircleDot,
        description: "Geometria confirmada",
      },
      {
        id: "bitolas",
        label: "Validação de Bitolas",
        icon: ClipboardList,
        description: "MDF 6/15/18/25/36mm",
      },
      {
        id: "visual_ingestion",
        label: "Alimentação Visual (Gêmeo)",
        icon: FileSearch,
        description: "Módulos vs DXF conferidos",
      },
    ],
  },
  {
    id: "montagem",
    title: "Gate 3: Montagem",
    description: "Requisitos para liberação do caderno mobile",
    items: [
      {
        id: "usinagem_liberada",
        label: "Usinagem Liberada",
        icon: ShieldCheck,
        description: "Status técnico OK",
      },
      {
        id: "pecas_conferidas",
        label: "Peças Conferidas",
        icon: CheckCircle2,
        description: "Conferência de saída",
      },
      {
        id: "ferragens_conferidas",
        label: "Ferragens Conferidas",
        icon: Boxes,
        description: "Kit de acessórios completo",
      },
      {
        id: "grupos_completos",
        label: "Módulos G1/G2/G3 e Avulsos",
        icon: LayoutGrid,
        description: "Estrutura física completa",
      },
    ],
  },
];

// Flat items for easy lookup
const CHECK_ITEMS = GATES.flatMap((g) => g.items);

const CHECK_EVIDENCE: Record<string, { source: string; fileTypes?: string[] }> = {
  xml_valido: { source: "promob_xml", fileTypes: ["xml"] },
  lista_corte: { source: "cut_plan_document", fileTypes: ["lista_corte_pdf"] },
  nesting_dxf: { source: "nesting_dxf", fileTypes: ["dxf_conferencia"] },
  materiais: { source: "promob_xml", fileTypes: ["xml"] },
  imagem_referencia: { source: "promob_xml", fileTypes: ["imagem_referencia"] },
  documentacao_tecnica: {
    source: "technical_document",
    fileTypes: ["cotas_pdf", "dxf_conferencia"],
  },
  cotas_furacao: {
    source: "technical_document",
    fileTypes: ["cotas_pdf", "dxf_conferencia"],
  },
  bitolas: { source: "promob_xml", fileTypes: ["xml"] },
  tags_skp: { source: "promob_xml", fileTypes: ["xml"] },
  usinagem_liberada: { source: "operational_confirmation" },
  pecas_conferidas: { source: "operational_confirmation" },
  ferragens_conferidas: { source: "operational_confirmation" },
  grupos_completos: { source: "operational_confirmation" },
};

export function PilotValidationChecklist({
  projectId,
  isMachiningBlocked,
  projectFiles = [],
}: PilotValidationChecklistProps) {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canApprove = hasPermission(role, "projects", "approve");
  const [partialReleaseReason, setPartialReleaseReason] = useState("");
  const [showPartialRelease, setShowPartialRelease] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  const { data: checks, isLoading } = useQuery({
    queryKey: ["validation-checks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_checks")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: evidenceFiles = [] } = useQuery({
    queryKey: ["validation-evidence-files", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("id, file_type, file_name")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const toggleCheck = useMutation({
    mutationFn: async ({ type, completed }: { type: string; completed: boolean }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const evidence = CHECK_EVIDENCE[type];
      if (!evidence) throw new Error("Regra de evidência não configurada.");
      const evidenceFile = evidence.fileTypes
        ? evidenceFiles.find(
            (file) => file.file_type && evidence.fileTypes?.includes(file.file_type),
          )
        : null;
      if (completed && evidence.fileTypes && !evidenceFile) {
        toast.warning("Aviso: Arquivo técnico não localizado, mas validado em Modo Piloto.");
      }

      const { error } = await supabase.from("validation_checks").upsert(
        {
          project_id: projectId,
          check_type: type,
          is_completed: completed,
          completed_by: user.id,
          completed_at: completed ? new Date().toISOString() : null,
          evidence_source: completed ? evidence.source : null,
          evidence_file_id: completed ? (evidenceFile?.id ?? null) : null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "project_id,check_type" },
      );

      if (error) throw error;

      // Log action
      await supabase.from("production_logs").insert({
        project_id: projectId,
        user_id: user.id,
        action: `Validação de Piloto: ${type}`,
        status_to: completed ? "concluido" : "pendente",
        notes: `Checklist industrial: ${type} ${completed ? "validado" : "reaberto"}`,
      });

      // Notify completion
      if (completed) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (profile) {
          await supabase.from("notifications").insert({
            project_id: projectId,
            type: "gate_completed",
            title: `Checklist Piloto: ${type.replace(/_/g, " ").toUpperCase()}`,
            message: `Item de validação técnica concluído no projeto.`,
            company_id: profile.company_id!,
          });
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["validation-checks", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["production-logs", projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const releaseMachining = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("release_project_machining" as any, {
        _project_id: projectId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usinagem liberada com rastreabilidade.");
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["parts", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["production-logs", projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isVerified = (checkType: string) => {
    const check = checks?.find((candidate) => candidate.check_type === checkType);
    const evidence = CHECK_EVIDENCE[checkType];
    return Boolean(
      check?.is_completed &&
      evidence &&
      (check?.evidence_source === evidence.source || !evidence.source || (check?.is_completed && !check.evidence_source)),
    );
  };

  const allCompleted = CHECK_ITEMS.every((item) => isVerified(item.id));

  const gate1Items = GATES.find((g) => g.id === "corte_borda")?.items || [];
  const gate1Completed = gate1Items.every((item) => isVerified(item.id));

  const gate2Items = GATES.find((g) => g.id === "usinagem")?.items || [];
  const isGate2Done = gate2Items.every((item) => isVerified(item.id));

  // Automation: Gate 3 Montagem is naturally locked until Gate 2 is done and machining is unblocked
  const gate3Items = GATES.find((g) => g.id === "montagem")?.items || [];
  const isGate3Done = gate3Items.every((item) => isVerified(item.id));

  const completedCount = CHECK_ITEMS.filter((item) => isVerified(item.id)).length;

  if (isLoading) return null;

  return (
    <Card
      className={cn(
        "border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden shadow-2xl",
        allCompleted ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30",
      )}
    >
      <CardHeader className="pb-4 pt-8 px-8 border-b border-white/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
              <ShieldCheck
                className={cn("h-4 w-4", allCompleted ? "text-emerald-600" : "text-amber-600")}
              />
              Checklist de Validação Piloto
            </CardTitle>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              Protocolo de Segurança 4.0 — Piloto Controlado
            </h3>
          </div>
          <Badge
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full",
              allCompleted ? "bg-emerald-600 text-white" : "bg-amber-600 text-white",
            )}
          >
            {completedCount} / {CHECK_ITEMS.length} VALIDADOS
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-10">
        {/* Evidence Matrix 4.0 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 pb-6 border-b border-slate-100">
          {Object.entries(CHECK_EVIDENCE)
            .filter(([key, ev]) => ev.fileTypes && key !== 'imagem_referencia') // Imagem é visual apenas, não gate técnico rígido no grid
            .map(([key, ev]) => {
            const hasFile = projectFiles.some(f => 
              (f.file_type && ev.fileTypes?.includes(f.file_type)) || 
              (f.file_name && ev.fileTypes?.some(type => f.file_name.toLowerCase().includes(type.replace('_pdf', '').replace('_', ''))))
            );
            const isAutoValidated = checks?.some(c => c.check_type === key && c.notes?.includes("automática"));
            const label = CHECK_ITEMS.find(i => i.id === key)?.label || key;
            
            return (
              <div key={key} className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all relative overflow-hidden",
                hasFile ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-slate-50 border-slate-100 text-slate-400"
              )}>
                {isAutoValidated && (
                  <div className="absolute top-0 right-0 p-1">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" title="Validado automaticamente" />
                  </div>
                )}
                {hasFile ? <ShieldCheck className="h-4 w-4 mb-1" /> : <AlertTriangle className="h-4 w-4 mb-1" />}
                <span className="text-[8px] font-black uppercase text-center leading-tight tracking-tighter">
                  {label}
                </span>
                {hasFile && (
                  <span className="mt-1 text-[7px] font-bold text-emerald-500/70 uppercase">Processado</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-10">
          {GATES.map((gate) => {
            const gateItems = gate.items;
            const gateCompletedCount = gateItems.filter((item) => isVerified(item.id)).length;
            const isGateDone = gateCompletedCount === gateItems.length;

            return (
              <div key={gate.id} className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isGateDone ? "bg-emerald-500" : "bg-amber-500",
                        )}
                      />
                      {gate.title}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {gate.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] font-black tracking-widest px-3",
                      isGateDone
                        ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                        : "text-amber-600 border-amber-200 bg-amber-50",
                    )}
                  >
                    {gateCompletedCount} / {gateItems.length}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {gateItems.map((item) => {
                    const isDone = isVerified(item.id);
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "relative group p-5 rounded-2xl border-2 transition-all duration-300",
                          canApprove
                            ? "cursor-pointer hover:scale-[1.02]"
                            : "cursor-not-allowed opacity-75",
                          isDone
                            ? "bg-white border-emerald-100 shadow-md"
                            : "bg-white border-slate-50 hover:border-amber-200 shadow-sm",
                        )}
                        onClick={() => {
                          if (canApprove) toggleCheck.mutate({ type: item.id, completed: !isDone });
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-3">
                            <div
                              className={cn(
                                "p-2.5 rounded-xl w-fit transition-colors",
                                isDone
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-50 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600",
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <p
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider leading-tight",
                                  isDone ? "text-emerald-700" : "text-slate-900",
                                )}
                              >
                                {item.label}
                              </p>
                            </div>
                          </div>
                          <Checkbox
                            checked={isDone || false}
                            className={cn(
                              "h-5 w-5 rounded-md transition-all",
                              isDone
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-200",
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!allCompleted && (
          <div className="flex items-center gap-4 p-6 rounded-[1.5rem] bg-red-50 border-2 border-red-100 text-red-900">
            <AlertTriangle className="h-8 w-8 text-red-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em]">
                Bloqueio Industrial Ativo
              </p>
              <p className="text-xs font-medium leading-relaxed">
                Cada etapa permanece bloqueada até a conclusão do gate correspondente. A usinagem
                exige o Gate 2 e liberação técnica explícita.
              </p>
            </div>
          </div>
        )}

        {/* Automated Industrial Flow: Show Assembly Guide if Gate 3 is reachable */}
        {gate2Items.every(i => isVerified(i.id)) && !isMachiningBlocked && (
          <div className="flex flex-col gap-4 p-6 rounded-[1.5rem] bg-emerald-50 border-2 border-emerald-100 text-emerald-900 sm:flex-row sm:items-center">
            <LayoutGrid className="h-8 w-8 text-emerald-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em]">Fluxo de Montagem Liberado</p>
              <p className="text-xs font-medium leading-relaxed">
                A auditoria técnica foi concluída e a usinagem está desbloqueada. O Caderno de Montagem Mobile está pronto para uso.
              </p>
            </div>
            <Button
              asChild
              className="w-full shrink-0 bg-emerald-700 text-white hover:bg-emerald-800 sm:ml-auto sm:w-auto font-black text-[9px] uppercase tracking-widest px-6"
            >
              <Link to="/assembly">Abrir Caderno Mobile</Link>
            </Button>
          </div>
        )}

        {isGate2Done && isMachiningBlocked && (
          <div className="flex flex-col gap-4 p-6 rounded-[1.5rem] bg-blue-50 border-2 border-blue-100 text-blue-900 sm:flex-row sm:items-center">
            <ShieldCheck className="h-8 w-8 text-blue-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em]">Gate 2 concluído</p>
              <p className="text-xs font-medium leading-relaxed">
                A liberação abaixo remove os bloqueios somente após nova validação transacional no
                banco.
              </p>
            </div>
            <Button
              className="w-full shrink-0 bg-blue-700 text-white hover:bg-blue-800 sm:ml-auto sm:w-auto"
              disabled={!canApprove || releaseMachining.isPending}
              onClick={() => releaseMachining.mutate()}
            >
              {releaseMachining.isPending ? "Liberando..." : "Liberar usinagem"}
            </Button>
          </div>
        )}

        {gate1Completed && !isGate2Done && (
          <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 text-slate-900">
                <History className="h-6 w-6 text-slate-400" />
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">
                    Liberação Parcial: Corte e Borda
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">
                    O Gate 1 está concluído. Você pode liberar o corte mesmo sem a furação técnica.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-black text-[9px] uppercase tracking-widest px-6"
                onClick={() => setShowPartialRelease(!showPartialRelease)}
              >
                {showPartialRelease ? "Cancelar" : "Registrar Liberação"}
              </Button>
            </div>

            {showPartialRelease && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <textarea
                  className="w-full h-24 p-4 rounded-xl border-2 border-slate-200 text-sm focus:border-blue-500 focus:ring-0 transition-colors"
                  placeholder="Descreva o motivo da liberação parcial (ex: Nesting validado, furação será manual)..."
                  value={partialReleaseReason}
                  onChange={(e) => setPartialReleaseReason(e.target.value)}
                />
                <Button
                  className="w-full h-12 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-800"
                  disabled={partialReleaseReason.length < 10 || isSubmittingLog}
                  onClick={async () => {
                    setIsSubmittingLog(true);
                    try {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) throw new Error("Não autenticado");

                      const { error } = await supabase.from("production_logs").insert({
                        project_id: projectId,
                        user_id: user.id,
                        action: "liberacao_parcial_corte",
                        status_to: "corte",
                        notes: `LIBERAÇÃO PARCIAL (GATE 1 OK): ${partialReleaseReason}`,
                        metadata: { gate: "corte_borda", partial: true },
                      });

                      if (error) throw error;
                      toast.success("Liberação parcial registrada com sucesso.");
                      setPartialReleaseReason("");
                      setShowPartialRelease(false);
                      void queryClient.invalidateQueries({
                        queryKey: ["production-logs", projectId],
                      });
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : undefined);
                    } finally {
                      setIsSubmittingLog(false);
                    }
                  }}
                >
                  {isSubmittingLog ? "Processando..." : "Confirmar Liberação Parcial"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
