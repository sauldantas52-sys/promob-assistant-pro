import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Building2, Plus, FileText, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AIQuoteWizard } from "@/components/budget/AIQuoteWizard";
import { RevisionPanel } from "@/components/budget/RevisionPanel";
import { z } from "zod";

const budgetsSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/budgets/")({
  validateSearch: (search) => budgetsSearchSchema.parse(search),
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
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/budgets/" });
  const selectedBudgetId = search.id;

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

  if (selectedBudgetId && companyId) {
    return (
      <AppShell>
        <main className="min-h-full bg-slate-100/70 text-slate-950 p-4 sm:p-6 lg:p-8">
          <Button 
            variant="ghost" 
            className="mb-6 gap-2 rounded-none text-xs font-black uppercase tracking-tight text-slate-500 hover:text-blue-600"
            onClick={() => navigate({ to: "/budgets", search: { id: undefined } })}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para listagem
          </Button>
          <RevisionPanel budgetId={selectedBudgetId} companyId={companyId} />
        </main>
      </AppShell>
    );
  }

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
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="h-full border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-50 py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Histórico de Estimativas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-px bg-slate-100">
                  {budgets.isLoading ? (
                    <div className="flex h-32 items-center justify-center bg-white">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                  ) : budgets.data?.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-4 bg-white text-center">
                      <div className="rounded-full bg-slate-50 p-4">
                        <FileText className="h-8 w-8 text-slate-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase">Nenhum orçamento encontrado</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Carregue uma prancha no painel ao lado para começar.</p>
                      </div>
                    </div>
                  ) : (
                    budgets.data?.map((budget) => (
                      <div 
                        key={budget.id} 
                        className="flex cursor-pointer items-center justify-between bg-white p-4 transition-colors hover:bg-slate-50"
                        onClick={() => navigate({ to: "/budgets", search: { id: budget.id } })}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black uppercase tracking-tight">
                              {budget.projects?.name || "Orçamento Avulso"}
                            </span>
                            <Badge variant="outline" className="rounded-none text-[8px] uppercase tracking-tighter">
                              {budget.status || "Pendente"}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            CRIADO EM {new Date(budget.created_at!).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black tracking-tighter text-blue-600">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(budget.total_value || 0)}
                          </div>
                          <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase text-slate-500 hover:text-blue-600">
                            Revisar Detalhes →
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <AIQuoteWizard companyId={companyId || ""} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
