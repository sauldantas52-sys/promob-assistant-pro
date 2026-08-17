import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/projects/test-import")({
  component: TestImportPage,
});

function TestImportPage() {
  const latestProject = useQuery({
    queryKey: ["latest_project_test"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const modulesCount = useQuery({
    queryKey: ["modules_count_test", latestProject.data?.id],
    enabled: !!latestProject.data?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("modules")
        .select("*", { count: "exact", head: true })
        .eq("project_id", latestProject.data!.id);
      if (error) throw error;
      return count || 0;
    },
  });

  const partsQuery = useQuery({
    queryKey: ["parts_test", latestProject.data?.id],
    enabled: !!latestProject.data?.id,
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("parts")
        .select("*", { count: "exact" })
        .eq("project_id", latestProject.data!.id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return { data, count: count || 0 };
    },
  });

  const hardwareCount = useQuery({
    queryKey: ["hardware_count_test", latestProject.data?.id],
    enabled: !!latestProject.data?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("parts")
        .select("*", { count: "exact", head: true })
        .eq("project_id", latestProject.data!.id)
        .in("kind", ["ferragem", "acessorio"]);
      if (error) throw error;
      return count || 0;
    },
  });

  const persisted = latestProject.data && (partsQuery.data?.count || 0) > 0;

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">Auditoria de Persistência Industrial</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status do Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-slate-900">{latestProject.data?.name || "Nenhum"}</p>
              <Badge className="mt-2">{latestProject.data?.status || "N/A"}</Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Módulos / Peças</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-slate-900">{modulesCount.data || 0} / {partsQuery.data?.count || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Ferragens/Acessórios: {hardwareCount.data || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Banco Persistido</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={persisted ? "bg-emerald-500" : "bg-red-500"}>
                {persisted ? "SIM" : "NÃO"}
              </Badge>
              <p className="text-[10px] text-slate-500 mt-2 font-mono truncate">{latestProject.data?.id}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase">Primeiras 20 Peças (Amostra Real do Banco)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase">Peça</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">UID XML</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Material</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Espessura</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Dimensões</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-right">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partsQuery.data?.data?.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="text-[11px] font-bold uppercase">{part.name}</TableCell>
                    <TableCell className="text-[10px] font-mono">{(part.metadata as any)?.id_xml || '-'}</TableCell>
                    <TableCell className="text-[11px]">{part.material || "Não informado no XML"}</TableCell>
                    <TableCell className="text-[11px]">{part.thickness_mm ? `${part.thickness_mm} mm` : "Não informado no XML"}</TableCell>
                    <TableCell className="text-[11px] font-mono">{part.width_mm || 'N/I'}x{part.length_mm || 'N/I'}</TableCell>
                    <TableCell className="text-[11px] font-bold text-right">{part.quantity}</TableCell>
                  </TableRow>
                ))}
                {(!partsQuery.data?.data || partsQuery.data.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">
                      Nenhuma peça persistida no banco.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
