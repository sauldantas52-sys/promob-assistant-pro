import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Building2, Plus, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/budgets/")({
  head: () => ({
    meta: [
      { title: "Orçamentos por IA | Monta AI" },
      { name: "description", content: "Orçamentos e estimativas comerciais via IA." },
    ],
  }),
  component: BudgetsListPage,
});

function BudgetsListPage() {
  const { companyId } = useAuth();

  const budgets = useQuery({
    queryKey: ["budgets", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, projects(name)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  return (
    <AppShell>
      <main className="min-h-full bg-slate-100/70 text-slate-950 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              <span className="h-1.5 w-6 bg-blue-600" /> Inteligência Comercial
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Orçamentos <span className="text-slate-500">IA</span>
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Análise visual de pranchas, PDFs e estimativas comerciais
            </p>
          </div>
          <Button className="h-12 gap-2 rounded-none bg-blue-600 px-6 font-bold uppercase tracking-tighter hover:bg-blue-700">
            <Plus className="h-5 w-5" />
            Novo Orçamento
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.isLoading ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </CardContent>
            </Card>
          ) : budgets.data?.length === 0 ? (
            <Card className="col-span-full border-dashed bg-white/50">
              <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-slate-100 p-4">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase">Nenhum orçamento encontrado</h3>
                  <p className="text-xs text-slate-500 mt-1">Carregue uma prancha ou imagem para começar.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            budgets.data?.map((budget) => (
              <Card key={budget.id} className="group border-slate-200 transition-all hover:border-blue-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="rounded-none text-[9px] uppercase tracking-tighter">
                      {budget.status || "Pendente"}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      {new Date(budget.created_at!).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="mt-2 text-lg font-black uppercase tracking-tight">
                    {budget.projects?.name || "Orçamento Avulso"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Total Estimado</div>
                    <div className="text-lg font-black tracking-tighter text-blue-600">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(budget.total_value || 0)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </AppShell>
  );
}
