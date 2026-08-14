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
  novo: "bg-muted text-muted-foreground",
  orcamento: "bg-secondary text-secondary-foreground",
  producao: "bg-primary/15 text-primary",
  conferencia: "bg-secondary text-secondary-foreground",
  montagem: "bg-primary text-primary-foreground",
  concluido: "bg-primary/25 text-primary",
  assistencia: "bg-destructive/15 text-destructive",
};

export const statusLabel = (status: string | null | undefined) =>
  labels[status ?? "novo"] ?? status ?? "Novo";

export const statusTone = (status: string | null | undefined) =>
  tones[status ?? "novo"] ?? "bg-muted text-muted-foreground";
