export const projectStatuses = [
  "novo",
  "orcamento",
  "producao",
  "conferencia",
  "montagem",
  "concluido",
  "assistencia",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

const labels: Record<string, string> = {
  novo: "Novo",
  orcamento: "Orçamento",
  producao: "Produção",
  conferencia: "Conferência",
  montagem: "Montagem",
  concluido: "Concluído",
  assistencia: "Assistência",
};

const tones: Record<string, string> = {
  novo: "bg-slate-100 text-slate-700 border-slate-200",
  orcamento: "bg-blue-50 text-blue-700 border-blue-200",
  producao: "bg-orange-50 text-orange-700 border-orange-200", // Foco em atenção na produção
  conferencia: "bg-blue-600 text-white border-blue-700",
  montagem: "bg-emerald-600 text-white border-emerald-700",
  concluido: "bg-slate-900 text-white border-slate-800",
  assistencia: "bg-purple-600 text-white border-purple-700",
};

export const statusLabel = (status: string | null | undefined) =>
  labels[status ?? "novo"] ?? status ?? "Novo";

export const statusTone = (status: string | null | undefined) =>
  tones[status ?? "novo"] ?? "bg-muted text-muted-foreground";
