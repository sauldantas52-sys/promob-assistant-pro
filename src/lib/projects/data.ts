import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

type ClientRow = {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
};

type EnvironmentRow = {
  id: string;
  project_id: string;
  name: string;
  sequence: number;
};

type AppointmentRow = {
  id: string;
  project_id: string;
  kind: string;
  scheduled_at: string;
  arrival_time: string | null;
  status: string | null;
  notes: string | null;
};

type SiteRow = {
  id: string;
  project_id: string;
  postal_code: string | null;
  street: string;
  number: string;
  complement: string | null;
  district: string | null;
  city: string;
  state: string;
  reference: string | null;
  contact_name: string | null;
  contact_phone: string | null;
};

type BaseTables = Database["public"]["Tables"];
type ProjectRow = BaseTables["projects"]["Row"] & { client_id: string | null };
type ProjectInsert = BaseTables["projects"]["Insert"] & { client_id?: string | null };
type FutureTables = Omit<BaseTables, "projects"> & {
  projects: Table<ProjectRow, ProjectInsert>;
  clients: Table<ClientRow, Omit<ClientRow, "id">>;
  project_sites: Table<SiteRow, Omit<SiteRow, "id">>;
  project_environments: Table<EnvironmentRow, Omit<EnvironmentRow, "id">>;
  project_appointments: Table<AppointmentRow, Omit<AppointmentRow, "id">>;
};
type ProjectsDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & { Tables: FutureTables };
};

const projectsDb = supabase as unknown as SupabaseClient<ProjectsDatabase>;

export type ProjectClient = Pick<ClientRow, "id" | "name" | "phone" | "email" | "document">;

export type ProjectSummary = {
  id: string;
  name: string;
  clientName: string | null;
  environments: string[];
  status: string | null;
  cuttingStatus: string | null;
  createdAt: string | null;
  deliveryAt: string | null;
  completedSteps: number;
  totalSteps: number;
  modulesCount: number;
  partsCount: number;
  isTest: boolean;
};

export type CreateProjectInput = {
  companyId: string;
  client:
    | { mode: "existing"; id: string; name: string }
    | {
        mode: "new";
        name: string;
        phone: string;
        email: string;
        document: string;
      };
  projectName: string;
  site: {
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
    reference: string;
    contactName: string;
    contactPhone: string;
  };
  environments: string[];
};

export async function fetchProjectClients(companyId: string): Promise<ProjectClient[]> {
  const { data, error } = await projectsDb
    .from("clients")
    .select("id, name, phone, email, document")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ProjectClient[];
}

export async function fetchProjectsDashboard(companyId: string): Promise<ProjectSummary[]> {
  const { data: projects, error } = await supabase
    .from("projects")
    .select(`
      id, name, client_id, client_name, environment, status, cutting_status, created_at, is_test,
      modules(count),
      parts(count)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (projects.length === 0) return [];

  const projectIds = projects.map((project) => project.id);
  const clientIds = projects
    .map((project) => project.client_id)
    .filter((id): id is string => id !== null);
  const [clientsResult, environmentsResult, appointmentsResult, stepsResult] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("project_environments")
      .select("project_id, name, sequence")
      .in("project_id", projectIds)
      .order("sequence"),
    supabase
      .from("project_appointments")
      .select("project_id, kind, scheduled_at, status")
      .in("project_id", projectIds)
      .order("scheduled_at"),
    supabase.from("production_steps").select("project_id, status").in("project_id", projectIds),
  ]);

  const relatedError =
    clientsResult.error ||
    environmentsResult.error ||
    appointmentsResult.error ||
    stepsResult.error;
  if (relatedError) throw relatedError;

  const clientNames = new Map((clientsResult.data ?? []).map((client) => [client.id, client.name]));

  return projects.map((project) => {
    const environments = (environmentsResult.data ?? [])
      .filter((item) => item.project_id === project.id)
      .map((item) => item.name);
    const steps = (stepsResult.data ?? []).filter((step) => step.project_id === project.id);
    const delivery = (appointmentsResult.data ?? []).find(
      (appointment) =>
        appointment.project_id === project.id &&
        ["entrega", "delivery"].some((kind) =>
          appointment.kind.toLocaleLowerCase("pt-BR").includes(kind),
        ) &&
        !["cancelado", "concluido", "concluído"].includes(
          appointment.status?.toLocaleLowerCase("pt-BR") ?? "",
        ) &&
        new Date(appointment.scheduled_at).getTime() >= Date.now(),
    );

    return {
      id: project.id,
      name: project.name,
      clientName:
        (project.client_id ? clientNames.get(project.client_id) : null) ?? project.client_name,
      environments:
        environments.length > 0 ? environments : project.environment ? [project.environment] : [],
      status: project.status,
      cuttingStatus: project.cutting_status,
      createdAt: project.created_at,
      deliveryAt: delivery?.scheduled_at ?? null,
      completedSteps: steps.filter((step) => step.status === "concluido").length,
      totalSteps: steps.length,
      modulesCount: (project as any).modules?.[0]?.count || 0,
      partsCount: (project as any).parts?.[0]?.count || 0,
      isTest: !!project.is_test,
    };
  });
}

export async function createCompleteProject(input: CreateProjectInput): Promise<string> {
  const environments = input.environments.map((name) => name.trim()).filter(Boolean);
  const client =
    input.client.mode === "existing"
      ? { id: input.client.id }
      : {
          name: input.client.name.trim(),
          phone: input.client.phone.trim(),
          email: input.client.email.trim(),
          document: input.client.document.trim(),
        };
  const { data, error } = await (projectsDb as any).rpc("create_complete_client_project", {
    _client: client,
    _project: { name: input.projectName.trim() },
    _site: {
      postal_code: input.site.postalCode.trim(),
      street: input.site.street.trim(),
      number: input.site.number.trim(),
      complement: input.site.complement.trim(),
      district: input.site.district.trim(),
      city: input.site.city.trim(),
      state: input.site.state.trim().toUpperCase(),
      reference: input.site.reference.trim(),
      contact_name: input.site.contactName.trim(),
      contact_phone: input.site.contactPhone.trim(),
    },
    _environments: environments,
  });
  if (error) throw error;
  if (!data) throw new Error("O banco não retornou o projeto criado.");
  return String(data);
}
