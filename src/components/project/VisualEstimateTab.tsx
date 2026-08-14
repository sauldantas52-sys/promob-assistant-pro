import { useState } from "react";
import { Camera, Upload, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function VisualEstimateTab({ projectId }: { projectId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  
  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      toast.success("IA detectou 4 módulos e 12 peças no croqui.");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-dashed border-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Camera className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Upload de Croqui / Foto</h3>
            <p className="text-sm text-slate-500 max-w-xs mt-2">
              Envie fotos do ambiente ou desenhos à mão para gerar uma estimativa rápida de materiais.
            </p>
            <Button 
              onClick={handleSimulateUpload}
              disabled={isUploading}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12 gap-2"
            >
              {isUploading ? "Processando IA..." : <><Upload className="h-4 w-4" /> Selecionar Arquivo</>}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2">Detecção Inteligente</h3>
          {[
            { type: "Armário Superior", qty: 2, confidence: 94 },
            { type: "Gaveteiro", qty: 1, confidence: 88 },
            { type: "Painel TV", qty: 1, confidence: 72 },
          ].map((item, idx) => (
            <Card key={idx} className="rounded-2xl border-none shadow-sm bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.type}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{item.qty} unidade(s)</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={item.confidence > 90 ? "bg-emerald-500" : "bg-amber-500"}>
                  {item.confidence}% Confiança
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="rounded-3xl border-none shadow-xl bg-white">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Matriz de Validação Visual</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50 border border-red-100">
            <AlertCircle className="h-5 w-5 text-red-600 mt-1" />
            <div>
              <p className="text-sm font-black text-red-900 uppercase">Bloqueio de Engenharia Ativo</p>
              <p className="text-xs text-red-700 mt-1">
                Estimativas visuais servem apenas para orçamento inicial. É obrigatório o envio do XML Promob para liberação da produção.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
