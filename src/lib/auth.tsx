import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  "admin" | "projetista" | "comercial" | "escritorio" | "fabrica" | "montador" | "auditor";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  companyId: string | null;
  fullName: string | null;
  role: AppRole | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (args: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    role: AppRole;
  }) => Promise<"active" | "confirmation_required">;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const loadProfile = async (currentUser: User) => {
    let [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("company_id, full_name, must_change_password")
        .eq("id", currentUser.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
    ]);

    const pendingCompanyName = currentUser.user_metadata["company_name"];
    const pendingFullName = currentUser.user_metadata["full_name"];
    if (
      !profile?.company_id &&
      typeof pendingCompanyName === "string" &&
      typeof pendingFullName === "string"
    ) {
      const { error: bootstrapError } = await supabase.rpc("bootstrap_company", {
        _company_name: pendingCompanyName,
        _full_name: pendingFullName,
      });
      [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("company_id, full_name, must_change_password")
          .eq("id", currentUser.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
      ]);
      if (bootstrapError && !profile?.company_id) throw bootstrapError;
    }
    setCompanyId(profile?.company_id ?? null);
    setFullName(profile?.full_name ?? null);
    setRole((roles?.[0]?.role as AppRole) ?? null);

    // Se logado e precisa trocar senha, mas não está na página de troca, redirecionar via router
    // (A lógica principal de redirecionamento está em _authenticated.tsx)
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProfile(nextSession.user).catch(() => {
          setCompanyId(null);
          setFullName(null);
          setRole(null);
        });
      } else {
        setCompanyId(null);
        setFullName(null);
        setRole(null);
      }
    });

    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        if (data.session?.user) await loadProfile(data.session.user);
      })
      .finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp: AuthState["signUp"] = async ({ email, password, fullName: name, companyName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          company_name: companyName,
        },
      },
    });
    if (error) throw error;

    if (data.session) {
      await loadProfile(data.session.user);
      return "active";
    }
    return "confirmation_required";
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?mode=reset`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        companyId,
        fullName,
        role,
        refreshProfile: async () => {
          if (session?.user) await loadProfile(session.user);
        },
        signIn,
        signUp,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  projetista: "Projetista",
  comercial: "Comercial",
  escritorio: "Escritório / Projetos",
  fabrica: "Fábrica / Produção",
  montador: "Montador",
  auditor: "Auditor",
};
