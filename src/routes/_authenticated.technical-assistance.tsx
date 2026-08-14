import { createFileRoute, Link, useNavigate } from "@tanstack/react-query";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Camera, 
  History,
  FileText,
  Search,
  LayoutDashboard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/technical-assistance")({
  head: () => ({
    meta: [
      { title: "Assistência Técnica | Monta AI" },
      { name: "description", content: "Gestão de chamados e pós-venda." },
    ],
  }),
  component: TechnicalAssistancePage,
});

function TechnicalAssistancePage() {
  const { companyId, role, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["maintenance-requests", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(`
          *,
          projects(name, client_name),
          modules(name),
          parts(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(t => 
      t.description?.toLowerCase().includes(q) ||
      t.projects?.name?.toLowerCase().includes(q) ||
      t.projects?.client_name?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  return (
    <AppShell>
      <div className="space-y-16 p-8 md:p-16 max-w-[1800px] mx-auto animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate({ to: "/dashboard" })} 
              className="rounded-full px-4 text-slate-400 hover:text-blue-600 gap-2 mb-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
            </Button>
            <div className="flex items-center gap-4">
              <span className="h-2 w-10 bg-purple-600 rounded-full" />
              <p className="text-[12px] font-black uppercase tracking-[0.5em] text-purple-600">Gestão de Pós-Venda</p>
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-slate-900 uppercase leading-[0.8] mb-4">Assistência</h1>
            <p className="text-base font-black text-slate-500 uppercase tracking-[0.4em]">Controle de chamados técnicos e manutenções.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-80 hidden sm:block">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="Buscar chamado..." 
                className="h-16 pl-14 rounded-[1.25rem] border-none bg-white shadow-xl shadow-slate-900/5 text-sm font-black uppercase tracking-widest"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsNewTicketOpen(true)} className="h-20 px-12 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-slate-900/40 gap-6 transition-all duration-500 active:scale-95 group">
              <Plus className="h-8 w-8 text-blue-400 transition-transform group-hover:rotate-90" /> Novo Chamado
            </Button>
          </div>
        </header>

        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-3">
          {filteredTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          {filteredTickets.length === 0 && !isLoading && (
            <Card className="col-span-full border-[4px] border-dashed border-slate-200 rounded-[4rem] bg-slate-50/50">
              <CardContent className="flex flex-col items-center gap-6 py-32 text-center">
                <Wrench className="h-24 w-24 text-slate-200" />
                <p className="text-2xl font-black uppercase tracking-[0.4em] text-slate-400">Nenhum chamado aberto</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function TicketCard({ ticket }: { ticket: any }) {
  const statusColors: Record<string, string> = {
    open: "bg-red-50 text-red-700 border-red-100",
    in_progress: "bg-blue-50 text-blue-700 border-blue-100",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
    closed: "bg-slate-100 text-slate-500 border-slate-200"
  };

  const urgencyColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    critical: "bg-red-600 text-white animate-pulse"
  };

  return (
    <Card className="border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 rounded-[4rem] overflow-hidden group bg-white">
      <CardHeader className="pb-8 pt-12 px-12 bg-slate-50/30 border-b border-slate-100">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase group-hover:text-purple-600 transition-colors duration-500">
              {ticket.projects?.name || "Projeto não vinculado"}
            </CardTitle>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {ticket.projects?.client_name || "Cliente Final"}
            </p>
          </div>
          <Badge className={cn("px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] border-none rounded-full", statusColors[ticket.status] || "")}>
            {ticket.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 px-12 pb-12 pt-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md", urgencyColors[ticket.urgency])}>
               {ticket.urgency}
             </Badge>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Clock className="h-3 w-3" /> {new Date(ticket.created_at).toLocaleDateString()}
             </span>
          </div>
          <p className="text-sm font-medium text-slate-600 line-clamp-3 leading-relaxed">
            {ticket.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Módulo</p>
            <p className="text-xs font-bold text-slate-900 truncate">{ticket.modules?.name || "Geral"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peça</p>
            <p className="text-xs font-bold text-slate-900 truncate">{ticket.parts?.name || "Não informada"}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1 h-14 rounded-2xl border-2 border-slate-100 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50">
            Histórico
          </Button>
          <Button className="flex-1 h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-600/20">
            Tratar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
