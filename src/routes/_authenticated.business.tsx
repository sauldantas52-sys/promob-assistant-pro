import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Briefcase,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  FileText,
  Layers,
  Loader2,
  Lock,
  Package,
  Palette,
  RefreshCw,
  Scissors,
  ShoppingCart,
  Tag,
  Truck,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({
    meta: [
      { title: "Business 360 | Monta AI" },
      {
        name: "description",
        content: "Visão operacional de orçamento, clientes, compras, terceirização e SKP Hub.",
      },
    ],
  }),
  component: BusinessPage,
});

type ProjectSummary = {
  id: string;
  name: string;
  client_name: string | null;
  status: string | null;
  commercial_approved: boolean | null;
  machining_blocked: boolean | null;
  created_at: string | null;
};

const pendingBadge = (
  <Badge className="shrink-0 rounded-sm border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-amber-700 shadow-none hover:bg-amber-50">
    <Clock className="mr-1 h-3 w-3" /> Pendente de configuração
  </Badge>
);

function BusinessPage() {
  return (
    <AppShell>
      <BusinessContent />
    </AppShell>
  );
}

function BusinessContent() {
  const { companyId, role } = useAuth();
  const canViewBusiness = role === "admin" || role === "escritorio" || role === "auditor";
  const projects = useQuery({
    queryKey: ["business-360-projects", companyId],
    enabled: Boolean(companyId) && canViewBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, status, commercial_approved, machining_blocked, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProjectSummary[];
    },
  });

  const portfolio = projects.data ?? [];
  const clientNames = Array.from(
    new Set(
      portfolio
        .map((project) => project.client_name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );
  const activeProjects = portfolio.filter(
    (project) => !["concluido", "expedido", "assistencia"].includes(project.status ?? ""),
  ).length;
  const approvedProjects = portfolio.filter(
    (project) => project.commercial_approved === true,
  ).length;
  const blockedProjects = portfolio.filter((project) => project.machining_blocked === true).length;

  if (!canViewBusiness) {
    return (
      <main className="min-h-full bg-slate-100/70 p-5 sm:p-8">
        <div className="mx-auto max-w-xl border border-red-200 bg-red-50 p-5 text-red-900">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 shrink-0" />
            <div>
              <h1 className="text-sm font-black uppercase">Acesso comercial restrito</h1>
              <p className="mt-1 text-xs">
                Seu perfil não possui permissão para visualizar o Negócio 360.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-slate-100/70 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-3 py-4 sm:px-5 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              <span className="h-1.5 w-6 bg-[var(--lime-industrial)]" />
              Centro de decisão
            </div>
            <h1 className="text-2xl font-black uppercase tracking-[-0.04em] text-slate-950 sm:text-3xl">
              Business <span className="text-slate-400">360</span>
            </h1>
            <p className="mt-1 max-w-2xl text-[10px] font-bold uppercase leading-relaxed tracking-[0.08em] text-slate-500 sm:text-xs">
              Leitura comercial e operacional sem alterar a autoridade da produção.
            </p>
          </div>
          <div className="flex w-full items-center justify-between gap-3 border-l-4 border-[var(--lime-industrial)] bg-slate-950 px-3 py-2.5 text-white sm:w-auto sm:min-w-64">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Fonte operacional
              </p>
              <p className="text-[10px] font-black uppercase tracking-wider">Projetos Monta AI</p>
            </div>
            {projects.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--lime-industrial)]" />
            ) : projects.isError ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <Activity className="h-4 w-4 text-[var(--lime-industrial)]" />
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        {projects.isError && (
          <div
            role="alert"
            className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-3 text-amber-900"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider">
                Dados operacionais indisponíveis
              </p>
              <p className="mt-1 text-xs">
                Não foi possível consultar os projetos. Nenhum indicador foi estimado.
              </p>
            </div>
          </div>
        )}

        <section
          aria-label="Indicadores do portfólio"
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          <Metric
            label="Projetos ativos"
            value={activeProjects}
            icon={Briefcase}
            loading={projects.isLoading}
          />
          <Metric
            label="Clientes identificados"
            value={clientNames.length}
            icon={Users}
            loading={projects.isLoading}
          />
          <Metric
            label="Aprovação comercial"
            value={approvedProjects}
            icon={CheckCircle2}
            loading={projects.isLoading}
          />
          <Metric
            label="CNC bloqueado"
            value={blockedProjects}
            icon={Lock}
            loading={projects.isLoading}
            alert={blockedProjects > 0}
          />
        </section>

        <Tabs defaultValue="budget" className="w-full">
          <div className="overflow-x-auto border border-slate-200 bg-white p-1 [scrollbar-width:thin]">
            <TabsList
              aria-label="Áreas do Business 360"
              className="h-auto min-w-max justify-start gap-1 rounded-none bg-transparent p-0"
            >
              <BusinessTab value="budget" icon={DollarSign} label="Orçamento" />
              <BusinessTab value="clients" icon={Users} label="Clientes / Contratos" />
              <BusinessTab value="purchases" icon={ShoppingCart} label="Compras" />
              <BusinessTab value="outsourcing" icon={Scissors} label="Terceirização" />
              <BusinessTab value="skp" icon={Layers} label="SKP Hub" />
            </TabsList>
          </div>

          <TabsContent value="budget" className="mt-3 focus-visible:ring-0">
            <Panel
              title="Visão de orçamento"
              eyebrow="Comercial"
              icon={DollarSign}
              status={pendingBadge}
            >
              <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <StatusCard
                  icon={Database}
                  title="Base financeira não configurada"
                  description="Receita, custo, margem, impostos, parcelas e validade de proposta não existem em uma fonte conhecida deste módulo. Totais financeiros não são inferidos a partir dos projetos."
                />
                <div className="grid grid-cols-2 gap-2">
                  <EmptyMeasure label="Receita prevista" />
                  <EmptyMeasure label="Custo previsto" />
                  <EmptyMeasure label="Margem" />
                  <EmptyMeasure label="Saldo contratual" />
                </div>
              </div>
              <AuthorityNote />
            </Panel>
          </TabsContent>

          <TabsContent value="clients" className="mt-3 focus-visible:ring-0">
            <Panel
              title="Clientes e contratos"
              eyebrow="Carteira"
              icon={Users}
              status={pendingBadge}
            >
              <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <StatusCard
                  icon={FileText}
                  title="Contratos sem integração"
                  description="Não há cadastro conhecido de contratos, valores, assinaturas, anexos ou vigências. A aprovação comercial abaixo é apenas um atributo do projeto e não comprova contratação."
                />
                <Card className="rounded-md border-slate-200 shadow-none">
                  <CardHeader className="border-b border-slate-100 p-3">
                    <CardTitle className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Clientes identificados nos projetos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {projects.isLoading ? (
                      <LoadingRow />
                    ) : clientNames.length ? (
                      <div className="grid max-h-56 grid-cols-1 overflow-y-auto sm:grid-cols-2">
                        {clientNames.map((client) => (
                          <div
                            key={client}
                            className="flex min-w-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5 sm:odd:border-r"
                          >
                            <span className="h-1.5 w-1.5 shrink-0 bg-[var(--lime-industrial)]" />
                            <span className="truncate text-[10px] font-black uppercase tracking-wide">
                              {client}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyRow text="Nenhum cliente identificado nos projetos." />
                    )}
                  </CardContent>
                </Card>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="purchases" className="mt-3 focus-visible:ring-0">
            <Panel
              title="Compras e suprimentos"
              eyebrow="Abastecimento"
              icon={ShoppingCart}
              status={pendingBadge}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <StatusCard
                  icon={Package}
                  title="Solicitações"
                  description="Sem fonte configurada para requisições, responsáveis ou aprovações."
                />
                <StatusCard
                  icon={Truck}
                  title="Pedidos e entregas"
                  description="Sem conexão com fornecedor, pedido de compra, prazo ou recebimento."
                />
                <StatusCard
                  icon={Boxes}
                  title="Estoque financeiro"
                  description="Sem custo médio, reserva comercial ou conciliação de materiais neste painel."
                />
              </div>
              <p className="border-l-2 border-slate-300 pl-3 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-slate-500">
                Este painel não cria pedidos, movimenta estoque ou promete disponibilidade de
                insumos.
              </p>
            </Panel>
          </TabsContent>

          <TabsContent value="outsourcing" className="mt-3 focus-visible:ring-0">
            <Panel
              title="Terceirização / retorno CutPlanning"
              eyebrow="Fluxo físico"
              icon={Scissors}
              status={pendingBadge}
            >
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <FlowStep
                  number="01"
                  icon={Package}
                  title="Fechar pacote"
                  text="Agrupar XML oficial, plano de corte, revisão, peças e instruções do lote."
                />
                <FlowStep
                  number="02"
                  icon={ArrowRight}
                  title="Enviar ao parceiro"
                  text="Registrar protocolo externamente e manter versão, quantidade e responsável identificados."
                />
                <FlowStep
                  number="03"
                  icon={Truck}
                  title="Receber fisicamente"
                  text="Conferir volumes retornados, integridade, quantidade e divergências antes de liberar o fluxo."
                />
                <FlowStep
                  number="04"
                  icon={Tag}
                  title="Etiquetar e segregar"
                  text="Vincular etiquetas às peças; separar sobra útil, retalho e descarte conforme regra da fábrica."
                />
              </div>
              <div className="grid gap-2 border border-slate-800 bg-slate-950 p-3 text-white sm:grid-cols-[auto_1fr] sm:items-center">
                <RefreshCw className="h-5 w-5 text-[var(--lime-industrial)]" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--lime-industrial)]">
                    Sem conexão ativa
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    O retorno do CutPlanning, o protocolo de remessa e a conferência física não são
                    sincronizados por este painel. O fluxo acima é orientação operacional, não
                    rastreamento ao vivo.
                  </p>
                </div>
              </div>
              <AuthorityNote />
            </Panel>
          </TabsContent>

          <TabsContent value="skp" className="mt-3 focus-visible:ring-0">
            <Panel
              title="SKP Hub"
              eyebrow="Apresentação e produção"
              icon={Layers}
              status={pendingBadge}
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <SourceCard
                  icon={Palette}
                  tone="lime"
                  title="SketchUp"
                  label="Apresentação / layout"
                  text="Governa a representação visual, a organização espacial e a apresentação do ambiente."
                />
                <SourceCard
                  icon={FileText}
                  tone="blue"
                  title="XML"
                  label="Autoridade de produção"
                  text="Permanece como fonte oficial para dados produtivos. A apresentação SKP não substitui o XML."
                />
                <SourceCard
                  icon={Lock}
                  tone="red"
                  title="CNC"
                  label="Bloqueado"
                  text="Usinagem não é liberada pelo SKP Hub. A validação técnica e os gates produtivos continuam obrigatórios."
                />
              </div>
              <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-3 text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-relaxed">
                  Importação, publicação, sincronização de versões e serviços externos do SketchUp
                  estão pendentes de configuração. Nenhuma conexão ao SketchUp ou ao CNC é alegada
                  nesta tela.
                </p>
              </div>
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function BusinessTab({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: typeof Briefcase;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-10 rounded-sm border border-transparent px-3 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 shadow-none data-[state=active]:border-slate-900 data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-none sm:px-4"
    >
      <Icon className="mr-1.5 h-3.5 w-3.5" /> {label}
    </TabsTrigger>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  loading,
  alert = false,
}: {
  label: string;
  value: number;
  icon: typeof Briefcase;
  loading: boolean;
  alert?: boolean;
}) {
  return (
    <Card className="rounded-md border-slate-200 shadow-none">
      <CardContent className="flex min-h-24 flex-col justify-between p-3 sm:flex-row sm:items-end sm:p-4">
        <div>
          <p className="text-[8px] font-black uppercase leading-tight tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p
            className={`mt-2 text-2xl font-black tracking-tighter sm:text-3xl ${alert ? "text-red-600" : "text-slate-950"}`}
          >
            {loading ? "--" : value}
          </p>
        </div>
        <Icon className={`mt-2 h-4 w-4 sm:mt-0 ${alert ? "text-red-500" : "text-slate-300"}`} />
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  eyebrow,
  icon: Icon,
  status,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Briefcase;
  status: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-slate-950 text-[var(--lime-industrial)]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
              {eyebrow}
            </p>
            <h2 className="truncate text-sm font-black uppercase tracking-tight sm:text-base">
              {title}
            </h2>
          </div>
        </div>
        {status}
      </div>
      <div className="space-y-3 p-3 sm:p-4">{children}</div>
    </section>
  );
}

function StatusCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Briefcase;
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-md border-slate-200 bg-slate-50 shadow-none">
      <CardContent className="p-3 sm:p-4">
        <Icon className="mb-3 h-5 w-5 text-slate-400" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyMeasure({ label }: { label: string }) {
  return (
    <div className="flex min-h-24 flex-col justify-between border border-dashed border-slate-300 bg-white p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="text-lg font-black text-slate-300">R$ --</p>
    </div>
  );
}

function FlowStep({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: string;
  icon: typeof Briefcase;
  title: string;
  text: string;
}) {
  return (
    <div className="relative overflow-hidden border border-slate-200 bg-slate-50 p-3">
      <span className="absolute right-2 top-1 text-3xl font-black tracking-tighter text-slate-200">
        {number}
      </span>
      <Icon className="relative mb-5 h-5 w-5 text-slate-700" />
      <h3 className="relative text-[10px] font-black uppercase tracking-wider">{title}</h3>
      <p className="relative mt-2 text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function SourceCard({
  icon: Icon,
  tone,
  title,
  label,
  text,
}: {
  icon: typeof Briefcase;
  tone: "lime" | "blue" | "red";
  title: string;
  label: string;
  text: string;
}) {
  const tones = {
    lime: "border-t-[var(--lime-industrial)] text-lime-700",
    blue: "border-t-blue-500 text-blue-600",
    red: "border-t-red-500 text-red-600",
  };

  return (
    <div className={`border border-t-4 border-slate-200 bg-slate-50 p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5" />
        <span className="text-[8px] font-black uppercase tracking-[0.15em]">{label}</span>
      </div>
      <h3 className="mt-6 text-lg font-black uppercase tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function AuthorityNote() {
  return (
    <div className="flex items-start gap-2 border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-blue-950">
      <FileText className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-[10px] font-bold uppercase leading-relaxed tracking-wide">
        XML permanece como autoridade de produção. Dados comerciais não liberam corte ou CNC.
      </p>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 p-4 text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-[9px] font-black uppercase tracking-wider">Consultando projetos</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="p-4 text-xs text-slate-500">{text}</p>;
}
