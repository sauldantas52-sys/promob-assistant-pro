import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Truck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  PackageCheck,
  Scan,
  Camera,
  History,
  Info,
  QrCode,
  Lock,
  Loader2,
  ShieldCheck,
  MapPin,
  Calendar,
  User,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shipping")({
  head: () => ({
    meta: [
      { title: "Expedição e Carga | Monta AI" },
      { name: "description", content: "Gerenciamento de volumes, carregamento e logística." },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("volumes");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["shipping-projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, client_name, environment, status,
          assembly_groups(
            id, code, name, color, is_locked, lock_reason, conference_status, sealed_at, loading_status
          ),
          shipping_volumes(*)
        `)
        .in("status", ["conferencia", "expedicao", "montagem"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery) return projects;
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col gap-3">
          <Link to="/dashboard" className="text-sm font-bold text-slate-500 flex items-center gap-2 hover:text-blue-600 transition-colors uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                <Truck className="h-8 w-8 text-blue-600" /> Expedição e Carga
              </h1>
              <p className="text-base text-slate-500 font-medium mt-1">Controle logístico, carregamento e romaneio digital.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
               <Input 
                placeholder="Buscar projeto ou cliente..." 
                className="w-full md:w-80 h-12 rounded-xl border-slate-200 shadow-sm focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 p-1 h-14 rounded-2xl">
            <TabsTrigger value="volumes" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-xs uppercase tracking-widest">Volumes por Projeto</TabsTrigger>
            <TabsTrigger value="active-loads" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-xs uppercase tracking-widest">Cargas Ativas</TabsTrigger>
          </TabsList>

          <TabsContent value="volumes" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-20 text-center text-muted-foreground">
                  <PackageCheck className="h-10 w-10 mx-auto mb-4 opacity-20" />
                  <p>Nenhum projeto pronto para expedição encontrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredProjects.map(project => (
                  <ProjectShippingCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active-loads">
            <Card className="border-dashed">
              <CardContent className="py-20 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>Módulo de Logística em Carga Ativa está sendo sincronizado...</p>
                <p className="text-xs">Utilize a aba "Volumes por Projeto" para gerenciar as expedições individuais.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function ProjectShippingCard({ project }: { project: any }) {
  const queryClient = useQueryClient();
  const groups = project.assembly_groups || [];
  const volumes = project.shipping_volumes || [];
  
  // A group needs a volume if it's sealed.
  const pendingSealedGroups = groups.filter((g: any) => g.sealed_at && !volumes.some((v: any) => v.group_id === g.id));
  
  const [isGenerating, setIsGenerating] = useState(false);

  const generateVolumes = async () => {
    if (pendingSealedGroups.length === 0) return;
    setIsGenerating(true);
    try {
      const newVolumes = pendingSealedGroups.map((g: any) => ({
        project_id: project.id,
        group_id: g.id,
        code: `VOL-${project.id.slice(0, 4)}-${g.code}`,
        name: `Volume: ${g.code} - ${g.name}`,
        status: 'aguardando'
      }));

      const { error } = await supabase.from('shipping_volumes').insert(newVolumes);
      if (error) throw error;
      
      toast.success(`${newVolumes.length} volume(s) gerado(s) para o projeto.`);
      void queryClient.invalidateQueries({ queryKey: ["shipping-projects"] });
    } catch (err: any) {
      toast.error("Erro ao gerar volumes: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription>{project.client_name} · {project.environment}</CardDescription>
          </div>
          <div className="flex gap-2">
            {pendingSealedGroups.length > 0 && (
              <Button size="sm" onClick={generateVolumes} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Gerar QR de Volumes ({pendingSealedGroups.length})
              </Button>
            )}
            <Badge className={project.status === 'expedicao' ? 'bg-blue-500' : 'bg-green-500'}>
              {project.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {volumes.length > 0 ? (
            volumes.map((vol: any) => (
              <VolumeRow key={vol.id} volume={vol} project={project} />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aguardando conclusão da conferência para gerar volumes de carga.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VolumeRow({ volume, project }: { volume: any, project: any }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  
  const statusColors: Record<string, string> = {
    aguardando: "bg-slate-100 text-slate-700 border-slate-200",
    conferido: "bg-blue-100 text-blue-700 border-blue-200",
    bloqueado: "bg-destructive/10 text-destructive border-destructive/20",
    carregado: "bg-green-100 text-green-700 border-green-200",
    entregue: "bg-primary/10 text-primary border-primary/20"
  };

  const group = project.assembly_groups?.find((g: any) => g.id === volume.group_id);
  
  // Logic locks
  const isLocked = group?.is_locked || group?.conference_status === 'sincronizado';
  const lockReason = group?.lock_reason || (group?.conference_status === 'sincronizado' ? "Conferência offline aguardando auditoria manual." : null);

  const updateStatus = async (newStatus: string, metadata: any = {}) => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('shipping_volumes')
        .update({ 
          status: newStatus as any,
          scanned_at: newStatus === 'conferido' ? new Date().toISOString() : volume.scanned_at,
          loaded_at: newStatus === 'carregado' ? new Date().toISOString() : volume.loaded_at,
          delivered_at: newStatus === 'entregue' ? new Date().toISOString() : volume.delivered_at,
          responsible_id: user?.id,
          ...metadata
        })
        .eq('id', volume.id);
      
      if (error) throw error;

      // Log activity
      await supabase.from('production_logs').insert({
        project_id: project.id,
        user_id: user?.id || null,
        action: `expedicao:${newStatus}`,
        notes: `Volume ${volume.code} alterado para ${newStatus}`,
        metadata: { volume_id: volume.id, ...metadata } as any
      });

      toast.success(`Status do volume atualizado: ${newStatus}`);
      void queryClient.invalidateQueries({ queryKey: ["shipping-projects"] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("p-4 flex flex-wrap items-center justify-between gap-4 transition-colors", isLocked && "bg-destructive/5")}>
      <div className="flex items-center gap-4 min-w-[280px]">
        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center border border-dashed text-muted-foreground">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">{volume.name}</p>
            <Badge variant="outline" className={cn("text-[10px] h-5", statusColors[volume.status])}>
              {volume.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="font-mono">{volume.code}</span>
            {volume.weight_kg && <span> · {volume.weight_kg}kg</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLocked ? (
          <div className="flex items-center gap-2 text-destructive px-3 py-1 bg-destructive/10 rounded-full text-xs font-bold animate-pulse">
            <Lock className="h-3 w-3" />
            <span>BLOQUEADO: {lockReason}</span>
          </div>
        ) : (
          <>
            {volume.status === 'aguardando' && (
              <Button size="sm" variant="outline" onClick={() => updateStatus('conferido')} disabled={busy}>
                <Scan className="mr-2 h-4 w-4" /> Conferir
              </Button>
            )}
            
            {volume.status === 'conferido' && (
               <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default" disabled={busy}>
                    <Truck className="mr-2 h-4 w-4" /> Carregar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Carregamento de Volume</DialogTitle>
                    <DialogDescription>
                      Informe os dados logísticos para o volume {volume.code}.
                    </DialogDescription>
                  </DialogHeader>
                  <LoadingForm onSubmit={(data) => updateStatus('carregado', data)} />
                </DialogContent>
              </Dialog>
            )}

            {volume.status === 'carregado' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus('entregue')} disabled={busy}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Entregar
              </Button>
            )}
            
            {volume.status === 'entregue' && (
              <div className="flex items-center gap-2 text-primary font-bold text-xs px-3 py-1 bg-primary/5 rounded-full border border-primary/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                ENTREGUE
              </div>
            )}
          </>
        )}
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Informações do Volume</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Status</p>
                  <p className="font-medium capitalize">{volume.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">QR Code</p>
                  <p className="font-mono">{volume.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Módulo Origem</p>
                  <p className="font-medium">{group?.name || "Avulso"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Peso</p>
                  <p className="font-medium">{volume.weight_kg ? `${volume.weight_kg}kg` : "Não informado"}</p>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-bold">Linha do Tempo</p>
                <div className="space-y-2">
                  <TimelineItem icon={Calendar} label="Criado" date={volume.created_at} />
                  {volume.scanned_at && <TimelineItem icon={Scan} label="Conferido" date={volume.scanned_at} />}
                  {volume.loaded_at && <TimelineItem icon={Truck} label="Carregado" date={volume.loaded_at} />}
                  {volume.delivered_at && <TimelineItem icon={CheckCircle2} label="Entregue" date={volume.delivered_at} />}
                </div>
              </div>
              
              {(volume.vehicle_plate || volume.driver_name) && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Logística</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Veículo:</strong> {volume.vehicle_plate || "-"}</p>
                    <p><strong>Motorista:</strong> {volume.driver_name || "-"}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
               {volume.status !== 'aguardando' && (
                <Button variant="outline" size="sm" className="w-full text-destructive" onClick={() => updateStatus('bloqueado', { lock_reason: 'Reabertura manual de carga' })}>
                  <ShieldAlert className="mr-2 h-3.5 w-3.5" /> Bloquear / Reabrir Carga
                </Button>
               )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function LoadingForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [plate, setPlate] = useState("");
  const [driver, setDriver] = useState("");
  const [weight, setWeight] = useState("");

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="plate">Placa do Veículo</Label>
        <Input id="plate" placeholder="ABC-1234" value={plate} onChange={(e) => setPlate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="driver">Nome do Motorista / Responsável</Label>
        <Input id="driver" placeholder="João Silva" value={driver} onChange={(e) => setDriver(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="weight">Peso Aproximado (kg)</Label>
        <Input id="weight" type="number" step="0.1" placeholder="0.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <Button 
        className="w-full h-11" 
        disabled={!plate || !driver}
        onClick={() => onSubmit({ vehicle_plate: plate, driver_name: driver, weight_kg: weight ? parseFloat(weight) : null })}
      >
        Confirmar Carregamento
      </Button>
    </div>
  );
}

function TimelineItem({ icon: Icon, label, date }: { icon: any, label: string, date: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex flex-1 justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{new Date(date).toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
}
