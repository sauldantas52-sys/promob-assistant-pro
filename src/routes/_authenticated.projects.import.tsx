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
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Identificação</h2>
            <div className="grid gap-4">
              <Input placeholder="Nome do projeto" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} />
              <Input placeholder="Cliente" value={data.client} onChange={(e) => setData({...data, client: e.target.value})} />
              <Input placeholder="Ambiente" value={data.env} onChange={(e) => setData({...data, env: e.target.value})} />
            </div>
            <Button onClick={() => setStep(2)}>Próximo</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Arquivos</h2>
            <div className="grid gap-4 border p-4 rounded-xl">
              <Label>XML Promob (Obrigatório)</Label>
              <Input type="file" accept=".xml" onChange={(e) => setFiles({...files, xml: e.target.files?.[0] || null})} />
            </div>
            <Button onClick={() => setStep(3)} disabled={!files.xml}>Próximo</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
