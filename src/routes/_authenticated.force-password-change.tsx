import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/force-password-change")({
  component: ForcePasswordChangePage,
});

function ForcePasswordChangePage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setBusy(true);
    try {
      // 1. Atualizar a senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError) throw authError;

      // 2. Atualizar o profile para indicar que a senha foi trocada
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          must_change_password: false,
          first_login_at: new Date().toISOString()
        })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      // 3. Registrar no log
      await supabase.from("production_logs").insert({
        project_id: "", 
        step: "acesso_seguro",
        notes: `Primeiro acesso e troca de senha concluída para ${user?.email ?? 'usuário'}`,
        status: "concluido"
      } as any); 



      toast.success("Senha atualizada com sucesso!");
      await refreshProfile();
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500 text-white shadow-xl shadow-amber-500/20">
            <Lock className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Segurança Obrigatória</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Troca de Senha de Primeiro Acesso</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="pb-6 pt-10 px-10 border-b border-slate-50">
            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Definir Nova Senha</CardTitle>
            <CardDescription>Para sua segurança, você deve escolher uma senha forte antes de acessar o sistema.</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Requisitos de Segurança
                </h4>
                <ul className="text-[11px] text-blue-700 space-y-1 font-medium">
                  <li>• Acesso bloqueado até a alteração</li>
                  <li>• E-mail de confirmação obrigatório</li>
                  <li>• Senha individual e intransferível</li>
                </ul>
              </div>

              <Button type="submit" className="h-14 w-full text-base font-black uppercase tracking-widest rounded-2xl bg-slate-900 hover:bg-black" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Atualizar e Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
