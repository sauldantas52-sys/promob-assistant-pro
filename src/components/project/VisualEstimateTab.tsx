import { Box, Upload, AlertCircle, Eye, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

export function VisualEstimateTab({ projectId }: { projectId: string }) {
  const { data: modules } = useQuery({
    queryKey: ["project_modules_visual", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["project_files_visual", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .in("file_type", ["imagem_referencia", "dxf_conferencia"]);
      if (error) throw error;
      return data;
    },
  });

  const referenceImage = files?.find(f => f.file_type === 'imagem_referencia');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-none shadow-xl bg-slate-900 overflow-hidden relative aspect-video flex items-center justify-center">
          {referenceImage ? (
             <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${referenceImage.storage_path})` }} />
          ) : (
            <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80')] bg-cover bg-center" />
          )}
          
          <div className="relative z-10 text-center p-8">
            <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
              <Eye className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm">Visualização de Referência</h3>
            <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-tight">
              {referenceImage ? "Imagem da Pasta do Cliente" : "Nenhuma imagem de referência anexada"}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
             <Box className="h-3 w-3" /> Módulos Identificados no XML
          </h3>
          {modules && modules.length > 0 ? (
            modules.slice(0, 5).map((mod) => (
              <Card key={mod.id} className="rounded-2xl border-none shadow-sm bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Box className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{mod.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">
                      {mod.width_mm}x{mod.height_mm}x{mod.depth_mm}mm
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] uppercase font-black">Confirmado XML</Badge>
              </Card>
            ))
          ) : (
            <div className="p-8 text-center border-2 border-dashed rounded-2xl border-slate-100">
              <p className="text-xs text-slate-400 italic">Aguardando importação de arquivos técnicos.</p>
            </div>
          )}
          {modules && modules.length > 5 && (
            <p className="text-[10px] text-center text-slate-400 uppercase font-bold tracking-widest">+ {modules.length - 5} outros módulos</p>
          )}
        </div>
      </div>

      <Card className="rounded-3xl border-none shadow-xl bg-white">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Governança Industrial</CardTitle>
          <Info className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-1" />
            <div>
              <p className="text-sm font-black text-amber-900 uppercase">Fidelidade aos Arquivos</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Este sistema opera em base técnica real. Imagens e croquis servem apenas como referência visual espacial. 
                A autoridade de fabricação reside exclusivamente no **XML Promob** e no **DXF de Usinagem**.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
             <Button asChild variant="outline" className="rounded-full text-[10px] font-black uppercase tracking-widest">
               <Link to="/projects/import">Anexar Novos Arquivos</Link>
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
