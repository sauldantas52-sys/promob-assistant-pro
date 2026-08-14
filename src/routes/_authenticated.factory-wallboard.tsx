import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  Tv, 
  AlertOctagon, 
  Scissors, 
  Settings, 
  Layers, 
  PackageCheck,
  Clock,
  CheckCircle2,
  Truck,
  Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/factory-wallboard")({
  head: () => ({
    meta: [
      { title: "Painel da Fábrica | Monta AI" },
      { name: "description", content: "Monitoramento em tempo real da produção." },
    ],
  }),
  component: FactoryWallboardPage,
});

function FactoryWallboardPage() {
  return (
    <AppShell>
      <div className="bg-background min-h-screen">
        <WallboardContent />
      </div>
    </AppShell>
  );
}

function WallboardContent() {
  const queryClient = useQueryClient();

  // Busca projetos em produção
  const projects = useQuery({
    queryKey: ["factory-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, 
          name, 
          status, 
          client_name,
          is_cutting_edge_released,
          is_machining_assembly_blocked,
          production_steps(*),
          shipping_volumes(*)
        `)
        .in("status", ["producao", "conferencia", "expedicao"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_steps' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["factory-projects"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipping_volumes' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["factory-projects"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const list = projects.data ?? [];

  const getStepStats = (projectId: string, type: string) => {
    const project = list.find(p => p.id === projectId);
    const steps = project?.production_steps || [];
    const typeSteps = steps.filter(s => s.step_type === type);
    
    // Rastreabilidade 4.0: Bloqueios explícitos no projeto
    const isCuttingBlocked = !project?.is_cutting_edge_released;
    const isMachiningBlocked = !!project?.is_machining_assembly_blocked;

    let finalBlocked = steps.some(s => s.status === 'bloqueado') || typeSteps.some(s => s.status === 'bloqueado');
    
    if ((type === 'corte' || type === 'borda') && isCuttingBlocked) finalBlocked = true;
    if ((type === 'usinagem' || type === 'separacao') && isMachiningBlocked) finalBlocked = true;

    return {
      total: typeSteps.length,
      done: typeSteps.filter(s => s.status === 'concluido').length,
      blocked: finalBlocked,
      blockingReason: finalBlocked ? (isCuttingBlocked && (type === 'corte' || type === 'borda') ? 'Aguardando Liberação' : 'Bloqueio Técnico') : null
    };
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tv className="h-8 w-8 text-primary" /> Painel de Produção (TV)
          </h1>
          <p className="text-muted-foreground">Monitoramento em tempo real do fluxo da fábrica.</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="px-3 py-1 text-sm flex gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistema Online
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((project) => (
          <Card key={project.id} className="border-2 overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold truncate max-w-[200px]">{project.name}</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{project.client_name}</p>
                </div>
                <Badge className={
                  project.status === 'conferencia' ? 'bg-blue-500' : 
                  project.status === 'expedicao' ? 'bg-purple-600' : 
                  'bg-orange-500'
                }>
                  {(project.status || 'pendente').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <StepMetric 
                  icon={Scissors} 
                  label="Corte" 
                  stats={getStepStats(project.id, 'corte')} 
                />
                <StepMetric 
                  icon={Settings} 
                  label="Usinagem" 
                  stats={getStepStats(project.id, 'usinagem')} 
                />
                <StepMetric 
                  icon={Layers} 
                  label="Borda" 
                  stats={getStepStats(project.id, 'borda')} 
                />
                <StepMetric 
                  icon={PackageCheck} 
                  label="Separação" 
                  stats={getStepStats(project.id, 'separacao')} 
                />
                <ShippingMetric volumes={project.shipping_volumes || []} />
              </div>

               {/* Alertas Críticos de Rastreabilidade */}
              {(!project.is_cutting_edge_released || !!project.is_machining_assembly_blocked) && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex flex-col gap-1">
                  {!project.is_cutting_edge_released && (
                    <div className="flex items-center gap-2 text-amber-700 animate-pulse">
                      <AlertOctagon className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Corte/Borda: Aguardando Eng.</span>
                    </div>
                  )}
                  {!!project.is_machining_assembly_blocked && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertOctagon className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Usinagem/Montagem: BLOQUEADO</span>
                    </div>
                  )}
                </div>
              )}

              {project.production_steps?.some(s => s.status === 'bloqueado') && (
                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive animate-pulse">
                  <AlertOctagon className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Peça Bloqueada na Linha</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            Aguardando liberação de projetos para produção...
          </div>
        )}
      </div>
    </div>
  );
}

function StepMetric({ icon: Icon, label, stats }: { icon: any, label: string, stats: any }) {
  const percent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
  
  return (
    <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${stats.blocked > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-card'}`}>
      <Icon className={`h-4 w-4 mb-1 ${stats.blocked > 0 ? 'text-destructive' : 'text-primary'}`} />
      <p className="text-[10px] uppercase font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-sm font-bold">{stats.done}</span>
        <span className="text-[10px] text-muted-foreground">/ {stats.total}</span>
      </div>
      <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
        <div 
          className={`h-full transition-all ${stats.blocked > 0 ? 'bg-destructive' : 'bg-primary'}`} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ShippingMetric({ volumes }: { volumes: any[] }) {
  const total = volumes.length;
  const loaded = volumes.filter(v => v.status === 'carregado' || v.status === 'entregue').length;
  const delivered = volumes.filter(v => v.status === 'entregue').length;
  const percent = total > 0 ? (loaded / total) * 100 : 0;
  
  if (total === 0) return null;

  return (
    <div className="p-2 rounded-lg border bg-purple-500/5 border-purple-200 flex flex-col items-center justify-center text-center">
      <Truck className="h-4 w-4 mb-1 text-purple-600" />
      <p className="text-[10px] uppercase font-medium text-muted-foreground">Expedição</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-sm font-bold text-purple-700">{loaded}</span>
        <span className="text-[10px] text-muted-foreground">/ {total}</span>
      </div>
      <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
        <div 
          className="h-full bg-purple-600 transition-all" 
          style={{ width: `${percent}%` }}
        />
      </div>
      {delivered === total && total > 0 && (
        <p className="text-[8px] font-bold text-green-600 mt-1 uppercase">Entregue</p>
      )}
    </div>
  );
}
