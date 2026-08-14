import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "escritorio" | "fabrica" | "montador";

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
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const loadProfile = async (userId: string) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("company_id, full_name").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setCompanyId(profile?.company_id ?? null);
    setFullName(profile?.full_name ?? null);
    setRole((roles?.[0]?.role as AppRole) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        setCompanyId(null);
        setFullName(null);
        setRole(null);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp: AuthState["signUp"] = async ({ email, password, fullName: name, companyName, role: r }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: name } },
    });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId || !data.session) return;

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: companyName })
      .select("id")
      .single();
    if (companyError) throw companyError;

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: userId, company_id: company.id, full_name: name });
    if (profileError) throw profileError;

    await supabase.from("user_roles").insert({ user_id: userId, role: r });
    await loadProfile(userId);
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
          if (session?.user) await loadProfile(session.user.id);
        },
        signIn,
        signUp,
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
  escritorio: "Escritório / Projetos",
  fabrica: "Fábrica / Produção",
  montador: "Montador",
};
