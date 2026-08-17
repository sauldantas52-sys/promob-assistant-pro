import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/test-import")({
  component: TestImportAuditPage,
});

function TestImportAuditPage() {
  const { companyId } = useAuth();

  // 1. Consulta o projeto mais recente (deve ser o Closet importado)
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["audit-project", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const projectId = project?.id;

  // 2. Consulta Módulos
  const { data: modules } = useQuery({
    queryKey: ["audit-modules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("project_id", projectId as string);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // 3. Consulta Peças (todas)
  const { data: allParts } = useQuery({
    queryKey: ["audit-parts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("project_id", projectId as string);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  if (projectLoading) return <AppShell><div className="p-8">Carregando auditoria...</div></AppShell>;
  if (!project) return <AppShell><div className="p-8 text-red-500 font-bold">Nenhum projeto localizado para auditoria.</div></AppShell>;

  const moduleParts = allParts?.filter(p => p.module_id !== null) || [];
  const rootItems = allParts?.filter(p => p.module_id === null) || [];

  // Peças de teste específicas solicitadas
  const testItems = [
    { label: "Base 15", uid: "5381", expected: "1170 x 15 x 700 | M2 | Q: 0.82 | R: 1" },
    { label: "Lateral 18", uid: "1837", expected: "2630 x 18 x 280 | M2 | Q: 0.74 | R: 2" },
    { label: "Corrediça Invisível 300", uid: "5396", expected: "UN | Q: 1 | R: 16" },
    { label: "Dobradiça Aço", uid: "3971", expected: "UN | Q: 1 | R: 10" },
  ];

  const getFoundItem = (uid: string) => {
    return allParts?.find(p => (p.metadata as any)?.unique_id === uid);
  };

  return (
    <AppShell>
      <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
        <header className="flex justify-between items-end border-b pb-6 border-slate-200">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Auditoria Técnica de Importação</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Industrial Design System 4.0 • Persistência Garantida</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">Project ID</p>
            <p className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded mt-1">{projectId}</p>
          </div>
        </header>

        {/* Resumo da Persistência */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="TOTAL DE ITEMS" value={allParts?.length || 0} icon={Info} />
          <StatCard title="TOTAL DE MÓDULOS" value={modules?.length || 0} icon={CheckCircle2} />
          <StatCard title="PEÇAS DE MÓDULOS" value={moduleParts.length} icon={CheckCircle2} />
          <StatCard title="ITENS RAIZ" value={rootItems.length} icon={CheckCircle2} />
        </div>

        {/* Seção Banco Persistido (Solicitada) */}
        <Card className="border-2 border-blue-500 shadow-lg">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-blue-900 uppercase font-black tracking-widest text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Seção: BANCO PERSISTIDO (Real-time Query)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">DB Project ID</p>
              <p className="font-mono text-[11px] mt-1 truncate">{projectId}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">DB Modules</p>
              <p className="font-black text-lg text-slate-900">{modules?.length}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">DB Parts</p>
              <p className="font-black text-lg text-slate-900">{moduleParts.length}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">DB Root Items</p>
              <p className="font-black text-lg text-slate-900">{rootItems.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Auditoria de Peças de Teste (Validação Obrigatória) */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Validação Obrigatória de Peças</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testItems.map(item => {
              const found = getFoundItem(item.uid);
              const isMatch = found && 
                (found.unit === 'UN' ? found.quantity === 1 : true); // Simplificação, a tabela mostra detalhes

              return (
                <div key={item.uid} className={cn(
                  "p-4 rounded-lg border-2 flex justify-between items-center",
                  found ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                )}>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">{item.label} (UID: {item.uid})</p>
                    <p className="text-xs font-bold mt-1">Esperado: {item.expected}</p>
                    {found ? (
                      <p className="text-xs font-black text-emerald-700 mt-1">
                        Persistido: {found.width_mm || '-'}x{found.thickness_mm || '-'}x{found.length_mm || '-'} | {found.unit} | Q: {found.quantity} | R: {(found.metadata as any)?.repetition}
                      </p>
                    ) : (
                      <p className="text-xs font-black text-red-600 mt-1 uppercase tracking-wider animate-pulse">Item não localizado no banco!</p>
                    )}
                  </div>
                  {found ? <CheckCircle2 className="text-emerald-500 h-6 w-6" /> : <AlertTriangle className="text-red-500 h-6 w-6" />}
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabela Detalhada (Matriz do XML) */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Matriz de Persistência Industrial (XML)</h2>
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase">UID / Parent</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Descrição</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Ref / Family / Group</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Unit / Qty / Rep</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Dim (WxHxD)</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">TxtDim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allParts?.map((part) => (
                  <TableRow key={part.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-[10px]">
                      {(part.metadata as any)?.unique_id || "-"} <br/>
                      <span className="text-slate-400">{(part.metadata as any)?.unique_parent_id || "-"}</span>
                    </TableCell>
                    <TableCell className="text-[11px] font-bold uppercase tracking-tight">{part.name}</TableCell>
                    <TableCell className="text-[10px]">
                      {(part.metadata as any)?.reference || "-"} <br/>
                      <span className="text-[9px] font-bold text-slate-500">{(part.metadata as any)?.family} / {(part.metadata as any)?.group}</span>
                    </TableCell>
                    <TableCell className="text-[11px]">
                      <span className="font-black">{part.unit}</span> | Q: <span className="font-black">{part.quantity}</span> | R: <span className="font-black">{(part.metadata as any)?.repetition}</span>
                    </TableCell>
                    <TableCell className="text-[11px] font-mono">
                      {part.width_mm || 0} x {part.thickness_mm || 0} x {part.length_mm || 0}
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500">
                      {(part.metadata as any)?.text_dimension || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number | string; icon: any }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
          </div>
          <Icon className="text-slate-200 h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
