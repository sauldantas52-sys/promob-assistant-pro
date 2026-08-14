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
  novo: "bg-slate-100 text-slate-600 border-slate-200",
  orcamento: "bg-blue-50 text-blue-700 border-blue-100",
  producao: "bg-blue-50 text-blue-700 border-blue-100",
  conferencia: "bg-amber-50 text-amber-700 border-amber-100",
  montagem: "bg-blue-600 text-white",
  concluido: "bg-green-600 text-white",
  assistencia: "bg-purple-50 text-purple-700 border-purple-100",
};

export const statusLabel = (status: string | null | undefined) =>
  labels[status ?? "novo"] ?? status ?? "Novo";

export const statusTone = (status: string | null | undefined) =>
  tones[status ?? "novo"] ?? "bg-muted text-muted-foreground";
