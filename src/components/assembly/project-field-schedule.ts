import type { Database } from "@/integrations/supabase/types";

export type ProjectSite = Pick<
  Database["public"]["Tables"]["project_sites"]["Row"],
  | "project_id"
  | "street"
  | "number"
  | "complement"
  | "district"
  | "city"
  | "state"
  | "postal_code"
  | "reference"
  | "contact_name"
  | "contact_phone"
>;

export type ProjectAppointment = Pick<
  Database["public"]["Tables"]["project_appointments"]["Row"],
  "project_id" | "kind" | "scheduled_at" | "arrival_time" | "status"
>;

export function formatSiteAddress(site: ProjectSite) {
  const street = `${site.street}, ${site.number}${site.complement ? ` - ${site.complement}` : ""}`;
  const locality = [site.district, `${site.city}/${site.state}`, site.postal_code]
    .filter(Boolean)
    .join(" · ");
  return locality ? `${street} · ${locality}` : street;
}

export function formatAppointment(appointment: ProjectAppointment) {
  const kind = appointment.kind === "montagem" ? "Montagem" : "Entrega";
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(appointment.scheduled_at));
  const status = appointment.status.replaceAll("_", " ");
  const arrival = appointment.arrival_time ? ` · chegada ${appointment.arrival_time}` : "";
  return `${kind} · ${date} · ${status}${arrival}`;
}
