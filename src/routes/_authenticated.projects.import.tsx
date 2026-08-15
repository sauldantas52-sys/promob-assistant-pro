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
import { Loader2, Upload, FileUp, CheckCircle2, ChevronRight } from "lucide-react";
import { parseProjectFile } from "@/lib/promob-import";

export const Route = createFileRoute("/_authenticated/projects/import")({
  component: ImportPage,
});

function ImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ name: "", client: "", env: "", notes: "" });
  const [files, setFiles] = useState<{ xml: File | null; dxf: File | null; pdf: File | null }>({ xml: null, dxf: null, pdf: null });

  return (
    <AppShell>
      <div className="p-8 md:p-16 max-w-4xl mx-auto space-y-12">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-slate-900">Nova Importação</h1>
        
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black uppercase tracking-tight">Etapa 1 — Identificação</h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label>Nome do projeto</Label>
                <Input className="h-14" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input className="h-14" value={data.client} onChange={(e) => setData({...data, client: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Input className="h-14" value={data.env} onChange={(e) => setData({...data, env: e.target.value})} />
              </div>
            </div>
            <Button className="h-14 w-full" onClick={() => setStep(2)}>Próximo</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black uppercase tracking-tight">Etapa 2 — Arquivos do Promob</h2>
            <div className="grid gap-6 border-2 border-slate-100 p-8 rounded-3xl bg-white shadow-sm">
              <div className="space-y-2">
                <Label className="font-black text-blue-600">XML PROMOB (OBRIGATÓRIO)</Label>
                <Input type="file" accept=".xml" className="h-14" onChange={(e) => setFiles({...files, xml: e.target.files?.[0] || null})} />
              </div>
              <div className="space-y-2">
                <Label>DXF (OPCIONAL)</Label>
                <Input type="file" accept=".dxf" className="h-14" onChange={(e) => setFiles({...files, dxf: e.target.files?.[0] || null})} />
              </div>
              <div className="space-y-2">
                <Label>PDF TÉCNICO (OPCIONAL)</Label>
                <Input type="file" accept=".pdf" className="h-14" onChange={(e) => setFiles({...files, pdf: e.target.files?.[0] || null})} />
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="h-14 flex-1" onClick={() => setStep(1)}>Voltar</Button>
              <Button className="h-14 flex-1" onClick={() => setStep(3)} disabled={!files.xml}>Próximo</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black uppercase tracking-tight">Etapa 3 — Conferência</h2>
            <Card>
              <CardContent className="p-8">
                <p>Resumo técnico: {data.name} / {data.client}</p>
                <p>XML: {files.xml?.name}</p>
              </CardContent>
            </Card>
            <div className="flex gap-4">
              <Button variant="outline" className="h-14 flex-1" onClick={() => setStep(2)}>Voltar</Button>
              <Button className="h-14 flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success("Projeto criado!")}>Criar Projeto</Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
