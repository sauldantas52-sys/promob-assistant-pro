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
import { AUTH_CONFIG, isValidPasswordLength, isPasswordStrong, isNumeric } from "@/lib/auth-config";
import { ShieldAlert, InfoIcon } from "lucide-react";


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
    if (!isNumeric(password)) {
      toast.error("O PIN deve conter apenas números.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Os PINs informados não coincidem.");
      return;
    }

    if (!isValidPasswordLength(password)) {
      toast.error(`Use de ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} a ${AUTH_CONFIG.MAX_PASSWORD_LENGTH} números para o seu PIN.`);
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
        .eq("id", user?.id || "");

      if (profileError) throw profileError;

      // 3. Registrar no log
      const isWeak = !isPasswordStrong(password);
      await supabase.from("production_logs").insert({
        project_id: null, 
        step: "acesso_seguro",
        notes: `Troca de PIN concluída para ${user?.email ?? 'usuário'}.${isWeak ? ' [Nota: PIN com menos de 12 dígitos]' : ''}`,
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
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Segurança do PIN</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Troca de PIN Obrigatória</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="pb-6 pt-10 px-10 border-b border-slate-50">
            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Definir Novo PIN</CardTitle>
            <CardDescription>Para sua segurança, você deve escolher um PIN numérico forte antes de acessar o sistema.</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Novo PIN Numérico</Label>
                <Input
                  id="password"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={password}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || isNumeric(v)) setPassword(v);
                  }}
                  required
                  className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-black"
                  placeholder="00000000"
                />
                {password.length > 0 && !isValidPasswordLength(password) && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 border border-red-100">
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                      PIN Inválido: Use de 8 a 20 números.
                    </span>
                  </div>
                )}
                {password.length > 0 && !isNumeric(password) && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 border border-red-100">
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                      Use apenas números (0-9).
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 border border-blue-100">
                  <InfoIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Dica: Use um PIN de 12 dígitos para máxima segurança.
                  </span>
                </div>


              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Novo PIN</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPassword}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || isNumeric(v)) setConfirmPassword(v);
                  }}
                  required
                  className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-black"
                />
              </div>

              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Requisitos de Segurança
                </h4>
                <ul className="text-[11px] text-blue-700 space-y-1 font-medium">
                  <li>• Acesso bloqueado até a alteração</li>
                  <li>• Confirmação obrigatória</li>
                  <li>• PIN individual e intransferível</li>
                </ul>
              </div>

              <Button type="submit" className="h-14 w-full text-base font-black uppercase tracking-widest rounded-2xl bg-slate-900 hover:bg-black" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Atualizar PIN e Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
