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
  Users,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Info,
  Briefcase,
  BadgeDollarSign,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth, roleLabels } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const navItems = [
  {
    to: "/dashboard",
    label: "Comando",
    icon: LayoutDashboard,
    roles: ["admin", "projetista", "comercial", "escritorio", "fabrica", "montador", "auditor"],
  },
  {
    to: "/projects",
    label: "Projetos",
    icon: FolderKanban,
    roles: ["admin", "projetista", "comercial", "escritorio", "auditor"],
  },
  {
    to: "/projects/import",
    label: "Abrir Minha Pasta Real (Módulos)",
    icon: Upload,
    roles: ["admin", "projetista", "escritorio"],
  },
  {
    to: "/business",
    label: "Comercial 360",
    icon: Briefcase,
    roles: ["admin", "projetista", "comercial", "escritorio", "auditor"],
  },
  {
    to: "/budgets",
    label: "Orçamentos IA",
    icon: BadgeDollarSign,
    roles: ["admin", "projetista", "comercial", "escritorio", "auditor"],
  },
  { to: "/production", label: "Produção", icon: Factory, roles: ["admin", "fabrica", "auditor"] },
  {
    to: "/factory-wallboard",
    label: "Painel TV",
    icon: Tv,
    roles: ["admin", "fabrica", "auditor"],
  },
  {
    to: "/picking",
    label: "Separação",
    icon: PackageCheck,
    roles: ["admin", "fabrica", "montador", "auditor"],
  },
  { to: "/assembly", label: "Montagem", icon: Wrench, roles: ["admin", "montador", "auditor"] },
  { to: "/shipping", label: "Expedição", icon: Truck, roles: ["admin", "fabrica", "auditor"] },
  {
    to: "/technical-assistance",
    label: "Assistência",
    icon: AlertTriangle,
    roles: ["admin", "projetista", "escritorio", "montador", "auditor"],
  },
  { to: "/settings/users", label: "Usuários", icon: Users, roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut, fullName, role, companyId } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!companyId) return;

    // Inscrição em tempo real para notificações
    const channel = supabase
      .channel("industrial-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);

          // Toast dinâmico baseado no tipo
          if (newNotif.type === "gate_completed") {
            toast.success(newNotif.title, {
              description: newNotif.message,
              icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            });
          } else if (newNotif.type === "exception") {
            toast.error(newNotif.title, {
              description: newNotif.message,
              icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
            });
          } else {
            toast.info(newNotif.title, {
              description: newNotif.message,
              icon: <Info className="h-4 w-4 text-blue-500" />,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  useEffect(() => {
    if (!loading && !user) {
      console.log("[AppShell] User not authenticated, redirecting to login");
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const visibleNavItems = role ? navItems.filter((item) => item.roles.includes(role)) : [];
  const activeNavPath = visibleNavItems
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((left, right) => right.to.length - left.to.length)[0]?.to;

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-slate-50 lg:flex-row">
      {/* Top Lime Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-[var(--lime-industrial)] z-50" />

      {/* Sidebar Industrial Drawer/Fixed */}
      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-40 h-dvh w-[min(16rem,calc(100vw-2rem))] shrink-0 transform overflow-hidden bg-[var(--sidebar-industrial)] text-white transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-4">
          {/* Logo Monta AI */}
          <div className="px-6 py-6 border-b border-white/5">
            <Link to="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="bg-[var(--lime-industrial)] p-2 rounded-lg">
                <Boxes className="h-5 w-5 text-slate-900" />
              </div>
              <span className="text-xl font-black tracking-tight uppercase">Monta AI</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1 custom-scrollbar">
            {visibleNavItems.map((item) => {
              const active = item.to === activeNavPath;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    active
                      ? "bg-white/10 text-[var(--lime-industrial)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${active ? "text-[var(--lime-industrial)]" : ""}`}
                  />
                  {item.label}
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--lime-industrial)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Footer */}
          <div className="p-4 bg-black/20 border-t border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                <span className="text-[10px] font-bold">
                  {fullName?.charAt(0) || user?.email?.charAt(0) || "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate uppercase">
                  {fullName?.split(" ")[0] || "User"}
                </p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                  {role ? roleLabels[role] || role : "Acesso não configurado"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-500 uppercase">
                Fábrica em Movimento
              </span>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start h-9 text-[10px] font-bold uppercase text-slate-500 hover:text-white hover:bg-white/5 px-3"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>

        {/* Mobile Close Button */}
        {open && (
          <button
            type="button"
            className="absolute right-3 top-4 rounded-lg bg-slate-900 p-2 text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pt-1.5">
        {/* Mobile Header */}
        <header className="sticky top-1.5 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg"
            aria-label="Abrir menu"
            aria-controls="app-navigation"
            aria-expanded={open}
          >
            <Menu className="h-6 w-6 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-[var(--lime-industrial)]" />
            <span className="font-black text-slate-900 uppercase tracking-tight">Monta AI</span>
          </div>
          <div className="w-10" /> {/* Spacer for symmetry */}
        </header>

        {/* Content */}
        <main className="min-w-0 w-full flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
