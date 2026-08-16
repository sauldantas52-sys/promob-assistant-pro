import { Printer } from "lucide-react";
import {
  formatAppointment,
  formatSiteAddress,
  type ProjectAppointment,
  type ProjectSite,
} from "@/components/assembly/project-field-schedule";
import { Button } from "@/components/ui/button";

export type NotebookPart = {
  id: string;
  name: string;
  kind: string;
  quantity: number;
  unit: string | null;
  material: string | null;
  is_completed: boolean | null;
  assembly_group_id: string | null;
};

export type NotebookModule = {
  id: string;
  name: string;
  environment: string | null;
  quantity: number;
  is_completed: boolean | null;
};

export type NotebookGroup = {
  id: string;
  code: string;
  color: string | null;
  module_id: string | null;
};

type AssemblyNotebookProps = {
  project: {
    id: string;
    name: string;
    client_name: string | null;
    environment: string | null;
  };
  site: ProjectSite | null;
  appointment: ProjectAppointment | null;
  modules: NotebookModule[];
  groups: NotebookGroup[];
  parts: NotebookPart[];
  modelPreviewUrl?: string | null;
};

export function AssemblyNotebook({
  project,
  site,
  appointment,
  modules,
  groups,
  parts,
  modelPreviewUrl,
}: AssemblyNotebookProps) {
  const hardware = parts.filter((part) => part.kind === "ferragem" || part.kind === "acessorio");
  const pieces = parts.filter((part) => part.kind !== "ferragem" && part.kind !== "acessorio");
  const environments = Array.from(
    new Set(
      modules.map((module) => module.environment).filter((value): value is string => !!value),
    ),
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body * { visibility: hidden !important; }
          .assembly-notebook-print, .assembly-notebook-print * { visibility: visible !important; }
          .assembly-notebook-print {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            color: #0f172a !important;
            background: white !important;
          }
          .assembly-notebook-print section { break-inside: avoid; }
          .assembly-notebook-print .print-break { break-before: page; }
          .assembly-notebook-action { display: none !important; }
        }
      `}</style>
      <div className="assembly-notebook-action flex justify-end">
        <Button
          type="button"
          onClick={() => window.print()}
          className="h-12 w-full rounded-md bg-slate-950 text-xs font-black uppercase tracking-wider sm:w-auto"
        >
          <Printer className="mr-2 h-4 w-4" /> Imprimir caderno
        </Button>
      </div>
      <article className="assembly-notebook-print mx-auto max-w-4xl space-y-6 bg-white p-1 text-slate-950 sm:p-4">
        <header className="border-b-4 border-slate-950 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em]">Caderno de montagem</p>
          <h2 className="mt-1 text-3xl font-black uppercase tracking-tight">{project.name}</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <NotebookField label="Cliente" value={project.client_name || "Não informado"} />
            <NotebookField
              label="Ambientes"
              value={environments.join(", ") || project.environment || "Não informado"}
            />
            <NotebookField
              label="Endereço"
              value={site ? formatSiteAddress(site) : "Não cadastrado"}
            />
            <NotebookField
              label="Próximo agendamento"
              value={
                appointment ? formatAppointment(appointment) : "Sem montagem ou entrega futura"
              }
            />
          </div>
        </header>

        <section>
          <h3 className="mb-3 border-b-2 border-slate-900 pb-1 text-sm font-black uppercase tracking-wider">
            Módulos e kits logísticos
          </h3>
          <div className="space-y-3">
            {groups.map((group) => {
              const module = modules.find((item) => item.id === group.module_id);
              const groupParts = parts.filter((part) => part.assembly_group_id === group.id);
              return (
                <div key={group.id} className="border border-slate-400 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-lg font-black">{group.code}</p>
                      <p className="text-sm font-bold">{module?.name || "Módulo não vinculado"}</p>
                      <p className="text-xs text-slate-600">
                        {module?.environment || project.environment || "Ambiente não informado"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-bold uppercase">Cor logística</p>
                      <p className="flex items-center justify-end gap-1.5">
                        <span
                          className="inline-block h-3 w-3 border border-slate-400"
                          style={{ backgroundColor: group.color || "transparent" }}
                        />
                        {group.color || "Não informada"}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                    {groupParts.map((part) => (
                      <li key={part.id} className="flex justify-between gap-2 border-t py-1">
                        <span>{part.name}</span>
                        <span className="shrink-0 font-bold">
                          {part.quantity} {part.unit || "un."}
                        </span>
                      </li>
                    ))}
                    {groupParts.length === 0 && (
                      <li className="text-slate-500">Sem itens vinculados.</li>
                    )}
                  </ul>
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-sm text-slate-500">Sem kits logísticos.</p>}
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <NotebookList title="Peças" parts={pieces} />
          <NotebookList title="Ferragens e acessórios" parts={hardware} />
        </section>

        <section>
          <h3 className="mb-3 border-b-2 border-slate-900 pb-1 text-sm font-black uppercase tracking-wider">
            Referência visual
          </h3>
          {modelPreviewUrl ? (
            <img
              src={modelPreviewUrl}
              alt={`Referência validada de ${project.name}`}
              className="max-h-72 w-full object-contain"
            />
          ) : (
            <div className="border-2 border-dashed border-slate-400 p-8 text-center text-sm font-black uppercase">
              3D aguardando validação XML+DXF
            </div>
          )}
        </section>

        <section className="print-break">
          <h3 className="mb-3 border-b-2 border-slate-900 pb-1 text-sm font-black uppercase tracking-wider">
            Checklist de montagem
          </h3>
          <div className="space-y-2 text-sm">
            {modules.map((module) => (
              <div
                key={module.id}
                className="flex items-center gap-3 border-b border-slate-300 py-2"
              >
                <span className="inline-block h-5 w-5 border-2 border-slate-700 text-center text-xs">
                  {module.is_completed ? "X" : ""}
                </span>
                <span className="font-bold">{module.name}</span>
                <span className="ml-auto text-xs">Nivelar / fixar / regular / inspecionar</span>
              </div>
            ))}
            <ChecklistLine text="Conferir peças, ferragens e acessórios por kit G" />
            <ChecklistLine text="Registrar avarias, faltas e divergências" />
            <ChecklistLine text="Limpar ambiente e validar entrega com o cliente" />
          </div>
          <div className="mt-12 grid gap-8 pt-8 text-center text-xs sm:grid-cols-2">
            <p className="border-t border-slate-900 pt-2">Responsável pela montagem</p>
            <p className="border-t border-slate-900 pt-2">Cliente / responsável no local</p>
          </div>
        </section>
      </article>
    </>
  );
}

function NotebookField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function NotebookList({ title, parts }: { title: string; parts: NotebookPart[] }) {
  return (
    <div>
      <h3 className="mb-2 border-b-2 border-slate-900 pb-1 text-sm font-black uppercase tracking-wider">
        {title}
      </h3>
      {parts.map((part) => (
        <div
          key={part.id}
          className="flex justify-between gap-3 border-b border-slate-300 py-1 text-xs"
        >
          <span>
            {part.name}
            {part.material ? ` | Material/acabamento: ${part.material}` : ""}
          </span>
          <span className="shrink-0 font-bold">
            {part.quantity} {part.unit || "un."}
          </span>
        </div>
      ))}
      {parts.length === 0 && <p className="text-xs text-slate-500">Nenhum item informado.</p>}
    </div>
  );
}

function ChecklistLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-300 py-2">
      <span className="inline-block h-5 w-5 border-2 border-slate-700" />
      <span>{text}</span>
    </div>
  );
}
