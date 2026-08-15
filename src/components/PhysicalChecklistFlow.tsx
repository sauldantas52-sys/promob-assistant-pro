import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ShieldCheck, 
  Camera, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Boxes
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PhysicalChecklistFlowProps {
  projectId: string;
}

const GATES = [
  { id: 'gate1', title: 'Gate 1: Validação Física Corte/Borda', description: 'Conferência de chapas e fita no chão de fábrica' },
  { id: 'gate2', title: 'Gate 2: Validação Física Usinagem', description: 'Conferência de bitolas e furações na máquina' },
  { id: 'gate3', title: 'Gate 3: Validação Física Montagem', description: 'Conferência de ferragens e volumes pré-expedição' },
];

export function PhysicalChecklistFlow({ projectId }: PhysicalChecklistFlowProps) {
  const queryClient = useQueryClient();
  const [activeGate, setActiveGate] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [notes, setNotes] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const { data: pilotChecks, isLoading } = useQuery({
    queryKey: ["physical-pilot-checks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("physical_pilot_checks")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["modules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, name")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  const submitCheck = useMutation({
    mutationFn: async (gateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error("Perfil não encontrado");

      const { data, error } = await supabase
        .from("physical_pilot_checks")
        .insert({
          project_id: projectId,
          gate_id: gateId,
          operator_name: operatorName,
          notes: notes,
          evidence_url: evidenceUrl || null,
          status: 'concluido',
          validated_by: user.id,
          company_id: profile.company_id
        });

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        project_id: projectId,
        type: 'gate_completed',
        title: `Piloto Físico: ${gateId.toUpperCase()} Concluído`,
        message: `O operador ${operatorName} finalizou a validação física do ${gateId}.`,
        company_id: profile.company_id
      } as any);
    },
    onSuccess: () => {
      toast.success("Validação física registrada.");
      setActiveGate(null);
      setOperatorName("");
      setNotes("");
      setEvidenceUrl("");
      void queryClient.invalidateQueries({ queryKey: ["physical-pilot-checks", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Fluxo de Teste Físico</h2>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Evidências de fábrica — Piloto Controlado</p>
        </div>
      </div>

      <div className="grid gap-6">
        {GATES.map((gate) => {
          const check = pilotChecks?.find(c => c.gate_id === gate.id);
          const isDone = check?.status === 'concluido';

          return (
            <Card key={gate.id} className={cn(
              "rounded-[2rem] border-2 transition-all duration-300",
              isDone ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 bg-white"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldCheck className="h-4 w-4 text-slate-400" />}
                    {gate.title}
                  </CardTitle>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{gate.description}</p>
                </div>
                {isDone ? (
                  <Badge className="bg-emerald-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Validado na Fábrica
                  </Badge>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full text-[9px] font-black uppercase tracking-widest"
                    onClick={() => setActiveGate(activeGate === gate.id ? null : gate.id)}
                  >
                    {activeGate === gate.id ? 'Cancelar' : 'Iniciar Validação'}
                  </Button>
                )}
              </CardHeader>
              
              {activeGate === gate.id && !isDone && (
                <CardContent className="space-y-6 animate-in slide-in-from-top-2 duration-300 border-t border-slate-50 pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Operador Responsável</Label>
                      <Input 
                        placeholder="Nome do operador..." 
                        className="rounded-xl border-slate-200"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Foto de Evidência (URL)</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Link da imagem..." 
                          className="rounded-xl border-slate-200"
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                        />
                        <Button variant="secondary" className="rounded-xl"><Camera className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Observações Técnicas</Label>
                    <Textarea 
                      placeholder="Relate divergências ou conformidades físicas..." 
                      className="rounded-xl border-slate-200 min-h-[100px]"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <Button 
                    className="w-full bg-slate-900 text-white rounded-xl h-12 font-black uppercase tracking-widest text-[10px]"
                    disabled={!operatorName || submitCheck.isPending}
                    onClick={() => submitCheck.mutate(gate.id)}
                  >
                    {submitCheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finalizar Validação de Gate'}
                  </Button>
                </CardContent>
              )}

              {isDone && (
                <CardContent className="border-t border-emerald-100/50 pt-4 bg-emerald-50/10">
                  <div className="flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-emerald-600" />
                      <span>{check.operator_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-emerald-600" />
                      <span className="truncate max-w-[200px]">{check.notes || 'Sem observações'}</span>
                    </div>
                    {check.evidence_url && (
                      <a href={check.evidence_url} target="_blank" className="flex items-center gap-2 text-blue-600 hover:underline">
                        <Camera className="h-3 w-3" />
                        Ver Evidência
                      </a>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {!pilotChecks?.some(c => c.gate_id === 'gate2' && c.status === 'concluido') && (
        <AlertTriangle className="h-5 w-5 text-amber-500 inline-block mr-2" />
      )}
    </div>
  );
}
