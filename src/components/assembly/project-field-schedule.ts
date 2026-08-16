export type ProjectSite = {
  project_id: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  reference: string | null;
  contact_name: string | null;
  contact_phone: string | null;
};

export type ProjectAppointment = {
  project_id: string;
  kind: string;
  scheduled_at: string;
  arrival_time: string | null;
  status: string;
};


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
