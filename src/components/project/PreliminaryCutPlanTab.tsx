import { Scissors, LockKeyhole, FileCheck2, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function PreliminaryCutPlanTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-4">
      <Alert className="rounded-lg border-amber-200 bg-amber-50 text-amber-950">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle className="text-xs font-black uppercase tracking-wide">
          Limite de autoridade
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed">
          O pré-plano local é apenas estimativo. A autoridade de peças e medidas permanece no XML; a
          produção exige saída oficial do CutPlanning/Cut Pro e conferência técnica. Nenhuma
          importação libera CNC automaticamente.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 lg:grid-cols-2">
        <CutPlanBoundary
          icon={Scissors}
          eyebrow="Referência interna"
          title="Pré-plano local"
          status="Estimativo"
          tone="amber"
          items={[
            "Apoia análise preliminar",
            "Não é ordem de corte",
            "Não contém liberação de usinagem",
          ]}
        />
        <CutPlanBoundary
          icon={FileCheck2}
          eyebrow="Autoridade industrial"
          title="CutPlanning / Cut Pro"
          status="Exige evidência"
          tone="slate"
          items={[
            "Resultado deve vir do software oficial",
            "Conferir revisão e identidade do XML",
            "Liberação permanece sujeita aos gates industriais",
          ]}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-900">
              Gate de produção fechado por padrão
            </p>
            <p className="mt-1 text-xs text-red-800">
              Confirme a saída oficial na aba Arquivos e conclua as validações técnicas antes de
              qualquer operação de fábrica.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="w-fit shrink-0 border-red-300 bg-white text-[9px] font-black uppercase text-red-700"
        >
          Projeto {projectId.slice(0, 8)}
        </Badge>
      </div>
    </div>
  );
}

function CutPlanBoundary({
  icon: Icon,
  eyebrow,
  title,
  status,
  tone,
  items,
}: {
  icon: typeof Scissors;
  eyebrow: string;
  title: string;
  status: string;
  tone: "amber" | "slate";
  items: string[];
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                {eyebrow}
              </p>
              <CardTitle className="mt-1 text-sm font-black uppercase text-slate-950">
                {title}
              </CardTitle>
            </div>
          </div>
          <Badge
            className={
              tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
            }
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-xs text-slate-600">
              <span className="font-black text-blue-600">/</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
