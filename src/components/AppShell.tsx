import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Factory,
  Wrench,
  LogOut,
  Menu,
  X,
  Boxes,
  Tv,
  PackageCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, roleLabels } from "@/lib/auth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "escritorio", "fabrica", "montador", "auditor"] },
  { to: "/projects", label: "Projetos", icon: FolderKanban, roles: ["admin", "escritorio", "auditor"] },
  { to: "/production", label: "Produção", icon: Factory, roles: ["admin", "fabrica", "auditor"] },
  { to: "/factory-wallboard", label: "Painel TV", icon: Tv, roles: ["admin", "fabrica", "auditor"] },
  { to: "/picking", label: "Separação", icon: PackageCheck, roles: ["admin", "fabrica", "montador", "auditor"] },
  { to: "/assembly", label: "Montagem", icon: Wrench, roles: ["admin", "montador", "auditor"] },
  { to: "/shipping", label: "Expedição", icon: Truck, roles: ["admin", "fabrica", "auditor"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut, fullName, role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <Boxes className="h-6 w-6 text-sidebar-primary" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Monta AI</p>
            <p className="text-[11px] text-sidebar-foreground/70">Promob Assistant Pro</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.filter(item => !role || item.roles.includes(role)).map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-medium">{fullName ?? user.email}</p>
          <p className="text-xs text-sidebar-foreground/70">
            {role ? (roleLabels[role] || role) : "Sem perfil definido"}
          </p>
          <Button
            variant="ghost"
            className="mt-3 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-semibold">Monta AI</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
