import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  QrCode,
  Lock,
  Loader2,
  ShieldCheck,
  Scan,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProjectShippingTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-shipping", projectId],
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
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const generateVolumes = async () => {
    const sealedGroups = project?.assembly_groups?.filter((g: any) => g.sealed_at && !project.shipping_volumes?.some((v: any) => v.group_id === g.id)) || [];
    if (sealedGroups.length === 0) {
      toast.info("Nenhum módulo selado aguardando volume.");
      return;
    }
    
    try {
      const newVolumes = sealedGroups.map((g: any) => ({
        project_id: projectId,
        group_id: g.id,
        code: `VOL-${projectId.slice(0,4)}-${g.code}`,
        name: `Volume: ${g.code} - ${g.name}`,
        status: 'aguardando'
      }));

      const { error } = await supabase.from('shipping_volumes').insert(newVolumes);
      if (error) throw error;
      
      toast.success(`${newVolumes.length} volume(s) gerado(s).`);
      void queryClient.invalidateQueries({ queryKey: ["project-shipping", projectId] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" /> Volumes e Expedição
        </h2>
        <Button size="sm" onClick={generateVolumes}>
          <QrCode className="mr-2 h-4 w-4" /> Gerar Volumes Pendentes
        </Button>
      </div>

      <div className="grid gap-4">
        {project?.shipping_volumes?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>Nenhum volume gerado para este projeto.</p>
              <p className="text-xs">Volumes são gerados após o selo de montagem do módulo.</p>
            </CardContent>
          </Card>
        ) : (
          project?.shipping_volumes?.map((vol: any) => (
            <VolumeRow key={vol.id} volume={vol} project={project} />
          ))
        )}
      </div>
    </div>
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
  const isLocked = group?.is_locked || group?.conference_status === 'sincronizado';
  const lockReason = group?.lock_reason || (group?.conference_status === 'sincronizado' ? "Aguardando auditoria offline" : null);

  const updateStatus = async (newStatus: string, metadata: any = {}) => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('shipping_volumes')
        .update({ 
          status: newStatus as any,
          responsible_id: user?.id,
          ...metadata
        })
        .eq('id', volume.id);
      
      if (error) throw error;
      
      await supabase.from('production_logs').insert({
        project_id: project.id,
        user_id: user?.id || null,
        action: `expedicao:${newStatus}`,
        notes: `Volume ${volume.code} -> ${newStatus}`,
        metadata: { volume_id: volume.id, ...metadata } as any
      });

      toast.success("Volume atualizado");
      void queryClient.invalidateQueries({ queryKey: ["project-shipping", project.id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn(isLocked && "border-destructive/50 bg-destructive/5")}>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <QrCode className="h-8 w-8 text-muted-foreground opacity-50" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold">{volume.name}</p>
              <Badge variant="outline" className={cn("text-[10px]", statusColors[volume.status])}>
                {volume.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{volume.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLocked ? (
            <Badge variant="destructive" className="animate-pulse">
              <Lock className="mr-1 h-3 w-3" /> BLOQUEADO: {lockReason}
            </Badge>
          ) : (
            <>
              {volume.status === 'aguardando' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus('conferido')} disabled={busy}>
                  Conferir
                </Button>
              )}
              {volume.status === 'conferido' && (
                <Button size="sm" onClick={() => updateStatus('carregado')} disabled={busy}>
                  Carregar
                </Button>
              )}
               {volume.status === 'carregado' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus('entregue')} disabled={busy}>
                  Entregar
                </Button>
              )}
            </>
          )}
          
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info(`Info do Volume: ${volume.code}`)}>
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
