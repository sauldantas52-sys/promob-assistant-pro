import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/debug/project-data")({
  component: DebugProjectData,
});

function DebugProjectData() {
  const { user, companyId, role } = useAuth();

  const allProjects = useQuery({
    queryKey: ["debug-all-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const amandaData = useQuery({
    queryKey: ["debug-amanda"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, modules(count), parts(count), project_files(count)")
        .ilike("name", "%amanda%")
        .order("created_at", { ascending: false });
      return data;
    },
  });

  const closetData = useQuery({
    queryKey: ["debug-closet"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, modules(count), parts(count), project_files(count)")
        .ilike("name", "%closet%")
        .order("created_at", { ascending: false });
      return data;
    },
  });

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen font-mono text-xs">
      <h1 className="text-2xl font-black uppercase">Auditoria Forense Industrial</h1>
      
      <Card>
        <CardHeader><CardTitle>Contexto do Usuário</CardTitle></CardHeader>
        <CardContent>
          <pre>{JSON.stringify({ user: user?.id, companyId, role }, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Projetos no Banco (Visíveis via RLS)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Teste?</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allProjects.data?.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold">{p.id}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell><Badge>{p.status}</Badge></TableCell>
                  <TableCell>{String(p.is_test)}</TableCell>
                  <TableCell>{p.created_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Foco: AMANDA 111</CardTitle></CardHeader>
          <CardContent>
            <pre>{JSON.stringify(amandaData.data || "NÃO ENCONTRADO", null, 2)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Foco: CLOSET</CardTitle></CardHeader>
          <CardContent>
            <pre>{JSON.stringify(closetData.data || "NÃO ENCONTRADO", null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
