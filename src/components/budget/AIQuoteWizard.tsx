import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { analyzeBudgetDocument } from "@/lib/budget/budget.functions";
import { sha256File } from "@/lib/commercial/documents";
import { sanitizeStoragePath } from "@/lib/utils";


export function AIQuoteWizard({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const analyzeMutation = useMutation({
    mutationFn: async (payload: { documentId: string; fileUrl: string }) => {
      const { budgetId } = await analyzeBudgetDocument({
        data: {
          ...payload,
          companyId,
        }
      });
      return budgetId;
    },
    onSuccess: (budgetId) => {
      toast.success("Documento enviado para análise IA!");
      queryClient.invalidateQueries({ queryKey: ["budgets", companyId] });
      setFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast.error(`Erro na análise: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const hash = await sha256File(file);
      const fileName = `${Date.now()}-${sanitizeStoragePath(file.name)}`;
      const filePath = `budgets/${companyId}/${fileName}`;


      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(60);
      const { data: { publicUrl } } = supabase.storage
        .from("project-files")
        .getPublicUrl(filePath);

      setUploadProgress(80);
      analyzeMutation.mutate({
        documentId: hash,
        fileUrl: publicUrl,
      });

      setUploadProgress(100);
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="border-2 border-dashed border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">
            Nova Estimativa por IA
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white p-8 transition-colors hover:border-blue-400"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) setFile(droppedFile);
          }}
        >
          <div className="rounded-full bg-slate-50 p-4">
            <Upload className="h-8 w-8 text-slate-400" />
          </div>
          <div className="mt-4 text-center">
            <Label htmlFor="budget-file" className="cursor-pointer font-bold text-blue-600 hover:underline">
              Selecione uma prancha ou PDF
            </Label>
            <p className="mt-1 text-[10px] uppercase text-slate-400">
              Arraste imagens de projetos, pranchas técnicas ou PDFs comerciais
            </p>
          </div>
          <Input 
            id="budget-file"
            type="file" 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {file && (
          <div className="flex items-center justify-between rounded border border-blue-100 bg-blue-50 p-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="truncate text-xs font-bold text-blue-900">{file.name}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] font-bold uppercase hover:bg-red-50 hover:text-red-600"
              onClick={() => setFile(null)}
            >
              Remover
            </Button>
          </div>
        )}

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
              <span>Processando Documento...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5 rounded-none bg-slate-200" />
          </div>
        )}

        <Button 
          className="w-full rounded-none bg-blue-600 font-black uppercase tracking-tight hover:bg-blue-700 disabled:bg-slate-300"
          disabled={!file || isUploading}
          onClick={handleUpload}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isUploading ? 'Analisando...' : 'Iniciar Análise IA'}
        </Button>

        <div className="rounded border border-amber-100 bg-amber-50/50 p-3">
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
            <p className="text-[9px] font-bold leading-tight text-amber-900 uppercase">
              IA não é fonte de verdade industrial. Todos os itens detectados devem ser revisados e confirmados por um projetista antes de gerar a proposta final.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
