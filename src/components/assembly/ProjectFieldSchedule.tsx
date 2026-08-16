import { CalendarClock, MapPin } from "lucide-react";
import {
  formatAppointment,
  formatSiteAddress,
  type ProjectAppointment,
  type ProjectSite,
} from "@/components/assembly/project-field-schedule";

export function ProjectFieldSchedule({
  site,
  appointment,
  dark = false,
}: {
  site: ProjectSite | null;
  appointment: ProjectAppointment | null;
  dark?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div
        className={
          dark
            ? "flex min-w-0 gap-2 rounded border border-slate-700 bg-slate-900/60 p-2.5"
            : "flex min-w-0 gap-2 rounded-lg border border-slate-200 bg-white p-3"
        }
      >
        <MapPin
          className={
            dark ? "mt-0.5 h-4 w-4 shrink-0 text-lime-400" : "mt-0.5 h-4 w-4 shrink-0 text-blue-600"
          }
        />
        <div className="min-w-0">
          <p
            className={
              dark
                ? "text-[8px] font-black uppercase tracking-wider text-slate-500"
                : "text-[8px] font-black uppercase tracking-wider text-slate-400"
            }
          >
            Endereço da obra
          </p>
          <p
            className={
              dark
                ? "mt-0.5 text-xs font-bold text-white"
                : "mt-0.5 text-xs font-bold text-slate-800"
            }
          >
            {site ? formatSiteAddress(site) : "Não cadastrado"}
          </p>
          {site?.reference && (
            <p
              className={dark ? "mt-1 text-[9px] text-slate-400" : "mt-1 text-[9px] text-slate-500"}
            >
              Referência: {site.reference}
            </p>
          )}
        </div>
      </div>
      <div
        className={
          dark
            ? "flex min-w-0 gap-2 rounded border border-slate-700 bg-slate-900/60 p-2.5"
            : "flex min-w-0 gap-2 rounded-lg border border-slate-200 bg-white p-3"
        }
      >
        <CalendarClock
          className={
            dark
              ? "mt-0.5 h-4 w-4 shrink-0 text-lime-400"
              : "mt-0.5 h-4 w-4 shrink-0 text-indigo-600"
          }
        />
        <div className="min-w-0">
          <p
            className={
              dark
                ? "text-[8px] font-black uppercase tracking-wider text-slate-500"
                : "text-[8px] font-black uppercase tracking-wider text-slate-400"
            }
          >
            Próximo agendamento
          </p>
          <p
            className={
              dark
                ? "mt-0.5 text-xs font-bold text-white"
                : "mt-0.5 text-xs font-bold text-slate-800"
            }
          >
            {appointment ? formatAppointment(appointment) : "Sem montagem ou entrega futura"}
          </p>
        </div>
      </div>
    </div>
  );
}
