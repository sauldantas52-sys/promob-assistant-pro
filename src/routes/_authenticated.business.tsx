import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CommercialDashboard } from "@/components/commercial/CommercialDashboard";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({
    meta: [
      { title: "Comercial 360 | Monta AI" },
      {
        name: "description",
        content: "Créditos, documentos, fornecedores e decisões de compra.",
      },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { companyId, role, user } = useAuth();
  const canView =
    role === "admin" ||
    role === "projetista" ||
    role === "comercial" ||
    role === "escritorio" ||
    role === "auditor";

  return (
    <AppShell>
      {!canView || !companyId || !user ? (
        <main className="min-h-full bg-slate-100 p-5 sm:p-8">
          <div className="mx-auto flex max-w-xl items-start gap-3 border border-red-200 bg-red-50 p-5 text-red-950">
            <Lock className="h-5 w-5 shrink-0" />
            <div>
              <h1 className="text-sm font-black uppercase">Acesso comercial restrito</h1>
              <p className="mt-1 text-xs">
                Seu perfil ou vínculo de empresa não permite visualizar o Comercial 360.
              </p>
            </div>
          </div>
        </main>
      ) : (
        <CommercialDashboard companyId={companyId} userId={user.id} role={role} />
      )}
    </AppShell>
  );
}
