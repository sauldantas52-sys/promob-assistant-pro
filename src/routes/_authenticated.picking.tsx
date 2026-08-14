import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  PackageCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Wrench,
  Boxes
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/picking")({
  head: () => ({
    meta: [
      { title: "Separação e Conferência | Monta AI" },
    ],
  }),
  component: PickingPage,
});

function PickingPage() {
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: ["picking-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, client_name, environment, status,
          parts(id, name, kind, quantity, unit, is_completed)
        `)
        .in("status", ["producao", "conferencia"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updatePart = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string, is_completed: boolean }) => {
      const { error } = await supabase
        .from("parts")
        .update({ is_completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["picking-projects"] });
    },
  });

  const list = projects.data ?? [];

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col gap-2">
          <Link to="/dashboard" className="text-sm font-bold text-slate-500 flex items-center gap-2 hover:text-blue-600 transition-colors uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                <PackageCheck className="h-8 w-8 text-blue-600" /> Separação e Conferência
              </h1>
              <p className="text-base text-slate-500 font-medium mt-1">Ferragens, acessórios e peças por grupos G1, G2 e G3.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6">
          {list.map((project) => {
            const pickingItems = project.parts.filter(p => 
              p.kind === 'ferragem' || p.kind === 'acessorio'
            );
            const total = pickingItems.length;
            const done = pickingItems.filter(i => i.is_completed).length;
            const progress = total > 0 ? (done / total) * 100 : 0;

            return (
              <Card key={project.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 pt-6 px-6 bg-slate-50 border-b border-slate-200">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900 tracking-tight uppercase">{project.name}</CardTitle>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">{project.client_name} · {project.environment}</p>
                    </div>
                    <Badge className={cn("px-4 py-1.5 text-xs font-black uppercase tracking-widest border shadow-sm", progress === 100 ? "bg-green-600 text-white border-green-500" : "bg-blue-600 text-white border-blue-500")}>
                      {done} / {total} ITENS
                    </Badge>
                  </div>
                  <div className="mt-6 w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-blue-600 transition-all shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {pickingItems.map(item => (
                      <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Button 
                            variant={item.is_completed ? "default" : "outline"}
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            onClick={() => updatePart.mutate({ id: item.id, is_completed: !item.is_completed })}
                          >
                            {item.is_completed ? <CheckCircle2 className="h-6 w-6" /> : <div className="h-6 w-6 rounded-full border-2" />}
                          </Button>
                          <div>
                            <p className={`font-medium ${item.is_completed ? "text-muted-foreground line-through" : ""}`}>
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">Quantidade: {item.quantity} {item.unit}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500" title="Marcar falta">
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Danificado">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {total === 0 && (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Nenhuma ferragem ou acessório identificado para este projeto.
                      </div>
                    )}
                  </div>
                </CardContent>
                {progress === 100 && (
                  <div className="p-4 bg-primary/5 border-t">
                    <Button className="w-full" variant="outline">
                      <Wrench className="mr-2 h-4 w-4" /> Liberar para Montagem
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}

          {list.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Boxes className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>Nenhum projeto em fase de separação no momento.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
