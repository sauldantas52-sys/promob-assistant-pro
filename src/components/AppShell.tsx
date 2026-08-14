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
import { Badge } from "@/components/ui/badge";
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
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border/30 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20 ring-4 ring-blue-600/10">
            <Boxes className="h-7 w-7 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-black tracking-tighter uppercase text-white">Monta AI</p>
            <p className="text-[10px] font-black text-sidebar-foreground/40 uppercase tracking-[0.2em]">Industrial v4.0</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1.5 p-4">
          {navItems.filter(item => !role || item.roles.includes(role)).map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold tracking-tight transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-sidebar-border/30 p-6 bg-sidebar/50 backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <p className="truncate text-sm font-black text-white">{fullName ?? user.email}</p>
            <Badge variant="outline" className="w-fit border-sidebar-border text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60">
              {role ? (roleLabels[role] || role) : "Sem perfil"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            className="mt-5 w-full justify-start rounded-xl px-4 py-6 text-sm font-bold text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-3 h-5 w-5" /> Sair do sistema
          </Button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-6 lg:hidden shadow-sm">
          <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-2 hover:bg-slate-100 rounded-lg">
            <Menu className="h-6 w-6 text-slate-600" />
          </button>
          <span className="font-black text-slate-900 uppercase tracking-tight">Monta AI</span>
        </header>
        <main className="min-w-0 flex-1 bg-slate-50/50">{children}</main>
      </div>
    </div>
  );
}
