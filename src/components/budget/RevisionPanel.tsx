import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Save, 
  Loader2, 
  BadgeDollarSign,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmBudgetItem, getConfidenceLevel } from "@/lib/budget/budget.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BudgetItem {
  id: string;
  name: string | null;
  category: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  confidence: number | null;
  is_confirmed: boolean | null;
  source: string | null;
}

export function RevisionPanel({ budgetId, companyId }: { budgetId: string; companyId: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["budget-items", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budgetId)
        .order("is_confirmed", { ascending: true });
      if (error) throw error;
      return data as BudgetItem[];
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      await confirmBudgetItem({ data: { itemId, data } });
    },
    onSuccess: () => {
      toast.success("Item confirmado com sucesso.");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["budget-items", budgetId] });
      queryClient.invalidateQueries({ queryKey: ["budgets", companyId] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao confirmar: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const confirmedCount = items?.filter(i => i.is_confirmed).length || 0;
  const totalCount = items?.length || 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Revisão Humana Obrigatória</h2>
          <p className="text-[10px] font-bold uppercase text-slate-500">
            Confirme as detecções da IA antes de gerar a proposta comercial
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[9px] font-black uppercase text-slate-400">Progresso</div>
            <div className="text-sm font-black text-blue-600">{confirmedCount} / {totalCount} ITENS</div>
          </div>
          <Badge className="rounded-none bg-blue-600 px-3 py-1 text-[10px] font-black uppercase">
            {totalCount > 0 && confirmedCount === totalCount ? "Revisão Concluída" : "Revisão Pendente"}
          </Badge>
        </div>
      </header>

      <div className="grid gap-px bg-slate-200 border border-slate-200">
        {items?.map((item) => {
          const confidence = getConfidenceLevel(item.confidence || 0);
          const isEditing = editingId === item.id;
          
          return (
            <div 
              key={item.id} 
              className={`bg-white p-4 transition-colors ${item.is_confirmed ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {item.is_confirmed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : confidence === 'ALTA' ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-400 opacity-50" />
                    ) : confidence === 'MÉDIA' ? (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    
                    <div className="flex-1">
                      {isEditing ? (
                        <Input 
                          defaultValue={item.name || ""} 
                          className="h-8 rounded-none font-bold uppercase"
                          autoFocus
                          onBlur={(e) => {
                            if (e.target.value !== item.name) {
                              confirmMutation.mutate({ 
                                itemId: item.id, 
                                data: { name: e.target.value } 
                              });
                            }
                          }}
                        />
                      ) : (
                        <h3 
                          className="cursor-pointer text-sm font-black uppercase tracking-tight hover:text-blue-600"
                          onClick={() => setEditingId(item.id)}
                        >
                          {item.name || "ITEM NÃO IDENTIFICADO"}
                        </h3>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="rounded-none text-[8px] uppercase tracking-tighter h-4">
                          {item.category || "Sem Categoria"}
                        </Badge>
                        <span className={`text-[8px] font-black uppercase ${
                          confidence === 'ALTA' ? 'text-blue-600' : 
                          confidence === 'MÉDIA' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          Confiança {confidence} ({( (item.confidence || 0) * 100 ).toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:items-center">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Qtd</label>
                    <Input 
                      type="number" 
                      defaultValue={item.quantity || 0}
                      className="h-8 w-16 rounded-none text-center font-bold"
                      onChange={(e) => confirmMutation.mutate({ 
                        itemId: item.id, 
                        data: { quantity: Number(e.target.value) } 
                      })}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Preço Unit.</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">R$</span>
                      <Input 
                        type="number" 
                        defaultValue={item.unit_price || 0}
                        className="h-8 w-24 rounded-none pl-7 font-bold"
                        onChange={(e) => confirmMutation.mutate({ 
                          itemId: item.id, 
                          data: { unit_price: Number(e.target.value) } 
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[8px] font-black uppercase text-slate-400">Total</label>
                    <div className="text-sm font-black tracking-tighter text-blue-600">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.total_price || 0)}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 md:pt-0">
                    <Button
                      size="sm"
                      variant={item.is_confirmed ? "ghost" : "default"}
                      className={`h-8 rounded-none px-4 text-[10px] font-black uppercase tracking-tight ${
                        item.is_confirmed 
                          ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      onClick={() => confirmMutation.mutate({ 
                        itemId: item.id, 
                        data: { is_confirmed: !item.is_confirmed } 
                      })}
                      disabled={confirmMutation.isPending && confirmMutation.variables?.itemId === item.id}
                    >
                      {confirmMutation.isPending && confirmMutation.variables?.itemId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : item.is_confirmed ? (
                        <>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Confirmado
                        </>
                      ) : (
                        "Confirmar"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <BadgeDollarSign className="h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-tight text-blue-900">Resumo do Orçamento IA</h4>
            <p className="mt-1 text-[10px] font-medium leading-relaxed text-blue-800 uppercase">
              O valor total é a soma de todos os itens confirmados. 
              Itens com baixa confiança podem exigir medição técnica no local (ESTIMATIVA VISUAL).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
