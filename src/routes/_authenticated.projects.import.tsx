import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Upload, FileUp, CheckCircle2, ChevronRight, Boxes, ShieldCheck, AlertTriangle } from "lucide-react";
import { parseProjectFile } from "@/lib/promob-import";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/import")({
  head: () => ({
    meta: [
      { title: "Nova Importação | Monta AI — Industrial 4.0" },
      { name: "description", content: "Assistente de importação de projetos Promob para produção industrial." }
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState({ name: "", client: "", env: "", notes: "" });
  const [files, setFiles] = useState<{ xml: File | null; dxf: File | null; pdf: File | null }>({
    xml: null,
    dxf: null,
    pdf: null,
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada.");
      if (!files.xml) throw new Error("O arquivo XML é obrigatório.");

      setIsProcessing(true);
      
      // 1. Criar o Projeto
      const { data: project, error: pError } = await supabase
        .from("projects")
        .insert({
          company_id: companyId,
          name: data.name || files.xml.name.replace(".xml", ""),
          client_name: data.client,
          environment: data.env,
          status: "novo",
          machining_blocked: true,
        })
        .select("id")
        .single();

      if (pError) throw pError;

      // 2. Processar o XML
      const result = await parseProjectFile(files.xml);
      
      // 3. Registrar Arquivos
      await supabase.from("project_files").insert({
        project_id: project.id,
        file_name: result.fileName,
        file_type: "xml",
        size_bytes: result.sizeBytes,
        summary: {
          modules: result.modules.length,
          parts: result.modules.reduce((t, m) => t + m.parts.length, 0) + result.looseParts.length,
          looseParts: result.looseParts.length,
          warnings: result.warnings,
        },
      });

      // 4. Inserir Módulos e Peças (Hierarquia Industrial)
      const moduleColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
      
      for (let i = 0; i < result.modules.length; i++) {
        const m = result.modules[i];
        if (!m) continue;

        const color = moduleColors[i % moduleColors.length];
        
        const { data: mod, error: mErr } = await supabase
          .from("modules")
          .insert({
            project_id: project.id,
            name: m.name,
            environment: m.environment || data.env || null,
            width_mm: m.width_mm ?? null,
            height_mm: m.height_mm ?? null,
            depth_mm: m.depth_mm ?? null,
            quantity: m.quantity,
            data_source: "XML",
          })
          .select("id")
          .single();
        
        if (mErr) throw mErr;

        // Grupo de Montagem
        const { data: group, error: gErr } = await supabase
          .from("assembly_groups")
          .insert({
            project_id: project.id,
            module_id: mod.id,
            code: `M${(i + 1).toString().padStart(2, '0')}`,
            name: m.name,
            color: color ?? null,
            separation_status: 'pendente',
            conference_status: 'pendente',
            is_locked: true,
          })
          .select("id")
          .single();
        
        if (gErr) throw gErr;

        if (m.parts.length > 0) {
          const { error: ptsErr } = await supabase.from("parts").insert(
            m.parts.map(p => ({
              project_id: project.id,
              module_id: mod.id,
              assembly_group_id: group.id,
              kind: p.kind,
              name: p.name,
              material: p.material ?? null,
              thickness_mm: p.thickness_mm ?? null,
              width_mm: p.width_mm ?? null,
              length_mm: p.length_mm ?? null,
              quantity: p.quantity,
              unit: p.unit || "un",
              edge_banding: p.edge_banding ?? null,
              data_source: "XML",
              machining_blocked: true,
            }))
          );
          if (ptsErr) throw ptsErr;
        }
      }


      return project.id;
    },
    onSuccess: (projectId) => {
      toast.success("Projeto importado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro na importação.");
      setIsProcessing(false);
    }
  });

  return (
    <AppShell>
      <div className="p-8 md:p-16 max-w-[1200px] mx-auto space-y-16 animate-in fade-in duration-700">
        <header className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="h-2 w-10 bg-blue-600 rounded-full" />
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-600">Fluxo de Engenharia</p>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase text-slate-900 leading-[0.8]">
            Importação <br /> Assistida
          </h1>
          
          <div className="flex items-center gap-4 pt-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500",
                  step === s ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-110" : 
                  step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
                </div>
                {s < 3 && <div className="h-px w-12 bg-slate-200" />}
              </div>
            ))}
          </div>
        </header>

        <Card className="rounded-[3rem] border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] bg-white overflow-hidden">
          <CardContent className="p-12 md:p-16">
            {step === 1 && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Identificação do Lote</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Defina os metadados básicos para rastreabilidade</p>
                </div>
                
                <div className="grid gap-10 md:grid-cols-2">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome do Projeto</Label>
                    <Input 
                      placeholder="Ex: Armário Suíte Master" 
                      className="h-16 rounded-2xl bg-slate-50 border-slate-100 text-lg font-bold" 
                      value={data.name} 
                      onChange={(e) => setData({...data, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente / Contrato</Label>
                    <Input 
                      placeholder="Ex: João da Silva" 
                      className="h-16 rounded-2xl bg-slate-50 border-slate-100 text-lg font-bold" 
                      value={data.client} 
                      onChange={(e) => setData({...data, client: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ambiente Principal</Label>
                    <Input 
                      placeholder="Ex: Dormitório 01" 
                      className="h-16 rounded-2xl bg-slate-50 border-slate-100 text-lg font-bold" 
                      value={data.env} 
                      onChange={(e) => setData({...data, env: e.target.value})} 
                    />
                  </div>
                </div>
                
                <Button 
                  className="h-20 w-full rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs gap-4 shadow-2xl shadow-slate-900/20"
                  onClick={() => setStep(2)}
                >
                  Continuar para Arquivos <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Arquivos da Engenharia</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-blue-600">O XML do Promob é a autoridade técnica do processo</p>
                </div>

                <div className="grid gap-8">
                  <div className={cn(
                    "relative border-4 border-dashed rounded-[2.5rem] p-12 transition-all duration-500 group text-center",
                    files.xml ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/30"
                  )}>
                    <input 
                      type="file" 
                      accept=".xml" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => setFiles({...files, xml: e.target.files?.[0] || null})}
                    />
                    <div className="flex flex-col items-center gap-6">
                      <div className={cn(
                        "h-20 w-20 rounded-3xl flex items-center justify-center shadow-xl transition-all duration-500",
                        files.xml ? "bg-emerald-500 text-white" : "bg-white text-blue-600 group-hover:scale-110"
                      )}>
                        {files.xml ? <CheckCircle2 className="h-10 w-10" /> : <FileUp className="h-10 w-10" />}
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-black uppercase tracking-tighter">
                          {files.xml ? files.xml.name : "Arraste o XML do Promob"}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requisito Obrigatório para Produção</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-6">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-slate-400">
                        <Boxes className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">DXF Nesting</p>
                        <Input type="file" accept=".dxf" className="h-10 text-[10px] border-none bg-transparent p-0" onChange={(e) => setFiles({...files, dxf: e.target.files?.[0] || null})} />
                      </div>
                    </div>
                    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-6">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-slate-400">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">PDF Técnico</p>
                        <Input type="file" accept=".pdf" className="h-10 text-[10px] border-none bg-transparent p-0" onChange={(e) => setFiles({...files, pdf: e.target.files?.[0] || null})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="ghost" className="h-20 flex-1 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => setStep(1)}>Voltar</Button>
                  <Button 
                    className="h-20 flex-2 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs gap-4 shadow-2xl shadow-slate-900/20" 
                    onClick={() => setStep(3)} 
                    disabled={!files.xml}
                  >
                    Revisar Engenharia <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-emerald-600">Protocolo de Segurança</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Confirme os dados antes de iniciar o fluxo industrial</p>
                </div>

                <div className="grid gap-8 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <div className="grid grid-cols-2 gap-10">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Projeto</p>
                      <p className="text-2xl font-black uppercase tracking-tighter text-slate-900">{data.name || files.xml?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cliente</p>
                      <p className="text-2xl font-black uppercase tracking-tighter text-slate-900">{data.client || "—"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 p-6 bg-white rounded-2xl border border-emerald-100">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Gate Industrial Ativo</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usinagem Bloqueada por Padrão (machining_blocked = true)</p>
                    </div>
                  </div>
                </div>

                {isProcessing && (
                  <div className="flex items-center gap-4 p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Processando Hierarquia Promob... Aguarde.</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="ghost" className="h-20 flex-1 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => setStep(2)} disabled={isProcessing}>Voltar</Button>
                  <Button 
                    className="h-20 flex-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs gap-4 shadow-2xl shadow-emerald-600/20" 
                    onClick={() => createProjectMutation.mutate()}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Upload className="h-5 w-5" /> Liberar para Produção</>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
            <Boxes className="h-8 w-8 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-widest">Integração XML</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Leitura automática de módulos, peças e ferragens diretamente da exportação do Promob.</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Trava de Segurança</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Nenhuma peça é liberada para usinagem sem a validação técnica da engenharia no Gate 2.</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Piloto Físico</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">O sistema exige registro de evidências físicas da primeira peça produzida no lote.</p>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
