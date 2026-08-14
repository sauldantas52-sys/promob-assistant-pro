import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth"; // Assumindo que este hook existirá

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  // Placeholder temporário: vamos redirecionar para login ou dashboard
  useEffect(() => {
    navigate({ to: "/login" });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-bold text-primary">Monta AI — Promob Assistant Pro</h1>
    </div>
  );
}
