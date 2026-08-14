import { supabase } from "@/integrations/supabase/client";

/**
 * Exceções do fluxo de montagem/conferência.
 * Regra de ouro: nenhuma exceção libera montagem silenciosamente.
 * Todo evento registra usuário, data/hora, motivo e status resultante.
 */
export type ExceptionKind =
  | "peca_faltante"
  | "ferragem_faltante"
  | "peca_danificada"
  | "qr_ilegivel"
  | "qr_outro_projeto"
  | "item_duplicado"
  | "offline"
  | "sincronizacao"
  | "conferencia_cancelada"
  | "kit_reaberto"
  | "expedicao_bloqueada";

export const exceptionLabels: Record<ExceptionKind, string> = {
  peca_faltante: "Peça faltante",
  ferragem_faltante: "Ferragem faltante",
  peca_danificada: "Peça danificada",
  qr_ilegivel: "QR Code ilegível",
  qr_outro_projeto: "QR Code de outro projeto",
  item_duplicado: "Item duplicado",
  offline: "Perda de conexão",
  sincronizacao: "Sincronização de pendências",
  conferencia_cancelada: "Conferência cancelada",
  kit_reaberto: "Kit reaberto",
  expedicao_bloqueada: "Expedição bloqueada",
};

/** Exceções que impedem a liberação do kit até tratativa explícita. */
export const blockingExceptions: ExceptionKind[] = [
  "peca_faltante",
  "ferragem_faltante",
  "peca_danificada",
  "qr_outro_projeto",
  "item_duplicado",
  "expedicao_bloqueada",
];

export interface ExceptionEvent {
  id?: string; // Idempotent ID (client-side generated)
  projectId: string;
  groupId?: string | null;
  kind: ExceptionKind;
  reason: string;
  statusFrom?: string | null;
  statusTo?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

const QUEUE_KEY = "montaai.assembly.exceptions.queue";

function readQueue(): ExceptionEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as ExceptionEvent[];
  } catch {
    return [];
  }
}

function writeQueue(items: ExceptionEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function pendingExceptionCount(): number {
  return readQueue().length;
}

function enqueue(event: ExceptionEvent) {
  writeQueue([...readQueue(), { ...event, occurredAt: event.occurredAt ?? new Date().toISOString() }]);
}

async function persist(event: ExceptionEvent): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Prevent duplicates using the idempotent ID in metadata
  if (event.id) {
    const { data: existing } = await supabase
      .from("production_logs")
      .select("id")
      .eq("project_id", event.projectId)
      .eq("action", `excecao_montagem:${event.kind}`)
      .contains("metadata", { event_id: event.id })
      .maybeSingle();

    if (existing) {
      console.log(`Evento ${event.id} já processado. Ignorando duplicata.`);
      return;
    }
  }

  const { error } = await supabase.from("production_logs").insert({
    project_id: event.projectId,
    user_id: user.id,
    action: `excecao_montagem:${event.kind}`,
    notes: event.reason,
    status_from: event.statusFrom ?? null,
    status_to: event.statusTo ?? null,
    metadata: {
      event_id: event.id ?? null,
      kind: event.kind,
      label: exceptionLabels[event.kind],
      blocking: blockingExceptions.includes(event.kind),
      group_id: event.groupId ?? null,
      occurred_at: event.occurredAt ?? new Date().toISOString(),
      registered_at: new Date().toISOString(),
      ...(event.metadata ?? {}),
    },
  });
  if (error) throw error;
}

/**
 * Registra a exceção. Se estiver offline (ou o insert falhar), enfileira
 * localmente para sincronizar depois — nunca descarta o evento.
 */
export async function logException(event: ExceptionEvent): Promise<"registrado" | "pendente"> {
  const stamped: ExceptionEvent = { 
    ...event, 
    id: event.id ?? crypto.randomUUID(),
    occurredAt: event.occurredAt ?? new Date().toISOString() 
  };
  
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    enqueue(stamped);
    return "pendente";
  }
  try {
    await persist(stamped);
    return "registrado";
  } catch (error) {
    console.error("Erro ao persistir evento, enfileirando:", error);
    enqueue(stamped);
    return "pendente";
  }
}

/** Sincroniza a fila offline. Retorna quantos eventos foram gravados. */
export async function syncPendingExceptions(): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining: ExceptionEvent[] = [];
  let synced = 0;
  for (const event of queue) {
    try {
      // 1. Revalidar integridade básica antes de persistir
      if (!event.projectId || !event.kind || !event.id) {
        console.warn("Evento corrompido na fila offline, descartando:", event);
        continue;
      }

      await persist(event);
      synced += 1;
    } catch (error) {
      console.error("Falha ao sincronizar evento:", error);
      remaining.push(event);
    }
  }
  writeQueue(remaining);

  if (synced > 0) {
    const first = queue[0];
    if (first) {
      try {
        await persist({
          id: crypto.randomUUID(),
          projectId: first.projectId,
          groupId: first.groupId ?? null,
          kind: "sincronizacao",
          reason: `${synced} evento(s) sincronizados. Revalidação manual obrigatória.`,
          statusTo: "sincronizado",
          metadata: { 
            synced_count: synced,
            requires_manual_audit: true
          },
        });
      } catch (e) {
        console.error("Erro ao registrar log de sincronização:", e);
      }
    }
  }

  return { synced, remaining: remaining.length };
}

export type ScanResult =
  | { ok: true; partId: string }
  | { ok: false; kind: Extract<ExceptionKind, "qr_ilegivel" | "qr_outro_projeto" | "item_duplicado">; message: string };

export interface ScanContext {
  projectId: string;
  groupPartIds: string[];
  alreadyScannedIds: string[];
  /** ids de peças do projeto (para diferenciar "outro projeto" de "outro módulo") */
  projectPartIds: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida um código lido. Aceita o id puro da peça ou o payload
 * "montaai://<projectId>/<partId>" usado nas etiquetas.
 */
export function validateScan(raw: string, ctx: ScanContext): ScanResult {
  const code = raw.trim();
  if (!code) return { ok: false, kind: "qr_ilegivel", message: "Nada foi lido no código." };

  let projectFromCode: string | null = null;
  let partId = code;

  if (code.includes("/")) {
    const parts = code.replace(/^montaai:\/\//i, "").split("/").filter(Boolean);
    partId = parts[parts.length - 1] ?? "";
    if (parts.length >= 2) projectFromCode = parts[parts.length - 2] ?? null;
  }

  if (!UUID_RE.test(partId)) {
    return { ok: false, kind: "qr_ilegivel", message: "Código inválido ou danificado. Registre a exceção e use a conferência manual." };
  }
  if (projectFromCode && projectFromCode !== ctx.projectId) {
    return { ok: false, kind: "qr_outro_projeto", message: "Esta etiqueta pertence a outro projeto." };
  }
  if (!ctx.groupPartIds.includes(partId)) {
    if (ctx.projectPartIds.includes(partId)) {
      return { ok: false, kind: "qr_outro_projeto", message: "Peça de outro módulo deste projeto. Confira no kit correto." };
    }
    return { ok: false, kind: "qr_outro_projeto", message: "Peça não pertence a este projeto." };
  }
  if (ctx.alreadyScannedIds.includes(partId)) {
    return { ok: false, kind: "item_duplicado", message: "Item já conferido — leitura duplicada ignorada." };
  }
  return { ok: true, partId };
}

export interface KitGuardInput {
  totalParts: number;
  confirmedParts: number;
  totalHardware: number;
  confirmedHardware: number;
  openExceptions: number;
}

/** Decide se o kit pode ser finalizado. Nunca libera silenciosamente. */
export function canFinalizeKit(input: KitGuardInput): { allowed: boolean; reasons: string[]; conference_status: "concluida" | "com_excecao" | "sincronizado" } {
  const reasons: string[] = [];
  if (input.totalParts === 0) reasons.push("Kit sem peças vinculadas.");
  if (input.confirmedParts < input.totalParts)
    reasons.push(`${input.totalParts - input.confirmedParts} peça(s) não conferida(s).`);
  if (input.confirmedHardware < input.totalHardware)
    reasons.push(`${input.totalHardware - input.confirmedHardware} ferragem(ns) não conferida(s).`);
  if (input.openExceptions > 0)
    reasons.push(`${input.openExceptions} exceção(ões) bloqueante(s) em aberto.`);
  
  let status: "concluida" | "com_excecao" | "sincronizado" = "concluida";
  if (reasons.length > 0) status = "com_excecao";
  
  return { allowed: reasons.length === 0, reasons, conference_status: status };
}

/** Expedição só é liberada com kit selado e sem exceção bloqueante. */
export function canShipModule(input: { sealed: boolean; guard: { allowed: boolean; reasons: string[] } }) {
  if (!input.sealed) return { allowed: false, reasons: ["Kit não selado pela conferência.", ...input.guard.reasons] };
  return input.guard;
}
