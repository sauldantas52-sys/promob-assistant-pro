export const projectStatuses = [
  "recebido",
  "processando",
  "alimentado",
  "conferencia_pendente",
  "divergencia_encontrada",
  "pronto_para_producao",
  "em_producao",
  "finalizado",
  "assistencia",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

const labels: Record<string, string> = {
  recebido: "Recebido",
  processando: "Processando",
  alimentado: "Alimentado",
  conferencia_pendente: "Conferência Pendente",
  divergencia_encontrada: "Divergência Encontrada",
  pronto_para_producao: "Pronto para Produção",
  em_producao: "Em Produção",
  finalizado: "Finalizado",
  assistencia: "Assistência",
};

const tones: Record<string, string> = {
  recebido: "bg-slate-100 text-slate-700 border-slate-200",
  processando: "bg-blue-50 text-blue-700 border-blue-200",
  alimentado: "bg-indigo-50 text-indigo-700 border-indigo-200",
  conferencia_pendente: "bg-amber-50 text-amber-700 border-amber-200",
  divergencia_encontrada: "bg-red-50 text-red-700 border-red-200",
  pronto_para_producao: "bg-emerald-50 text-emerald-700 border-emerald-200",
  em_producao: "bg-emerald-600 text-white border-emerald-700",
  finalizado: "bg-slate-400 text-white border-slate-500",
  assistencia: "bg-purple-600 text-white border-purple-700",
};

export const statusLabel = (status: string | null | undefined) =>
  labels[status ?? "novo"] ?? status ?? "Novo";

export const statusTone = (status: string | null | undefined) =>
  tones[status ?? "novo"] ?? "bg-muted text-muted-foreground";
