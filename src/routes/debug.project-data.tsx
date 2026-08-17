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
      const { data: project } = await supabase
        .from("projects")
        .select("*, modules(count), parts(count), project_files(count)")
        .ilike("name", "%amanda%")
        .single();
      return project;
    },
  });

  const closetData = useQuery({
    queryKey: ["debug-closet"],
    queryFn: async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("*, modules(count), parts(count), project_files(count)")
        .ilike("name", "%closet%")
        .single();
      return project;
    },
  });

  const importSessions = useQuery({
    queryKey: ["debug-import-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_import_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
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
        <CardHeader><CardTitle>Todos os Projetos Visíveis (RLS Check)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Company</TableHead>
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
                  <TableCell>{p.company_id}</TableCell>
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
            <pre>{JSON.stringify(closetData.data || "NÃO ENCONTRADO NO BANCO", null, 2)}</pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Sessões de Importação (Reconciliação)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Caminhos Planejados</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importSessions.data?.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell><Badge>{s.status}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{JSON.stringify(s.planned_paths)}</TableCell>
                  <TableCell>{s.created_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
