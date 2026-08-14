import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Projector as Project, 
  Factory, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock 
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const stats = [
    { label: "Projetos Recentes", value: "12", icon: Project, color: "text-blue-500" },
    { label: "Em Produção", value: "8", icon: Factory, color: "text-orange-500" },
    { label: "Aguardando Conferência", value: "3", icon: Clock, color: "text-yellow-500" },
    { label: "Montagens em Andamento", value: "5", icon: Wrench, color: "text-green-500" },
    { label: "Chamados Abertos", value: "2", icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao Monta AI</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projetos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground italic">
              Nenhum projeto encontrado. Importe um arquivo Promob para começar.
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Alertas e Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">3 projetos com furação não confirmada.</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800">Produção do Projeto "Cozinha Planejada A" concluída.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
