import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Loader2, HardHat, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth, roleLabels, type AppRole } from "@/lib/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, ShieldAlert, KeyRound } from "lucide-react";
import { AUTH_CONFIG, isValidPasswordLength, isPasswordStrong, isNumeric } from "@/lib/auth-config";
import { authenticateOperator } from "@/lib/operator-auth.functions";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Monta AI — Promob Assistant Pro" },
      {
        name: "description",
        content:
          "Acesse o Monta AI para transformar arquivos do Promob em orçamento, produção, conferência e montagem confiáveis.",
      },
      { property: "og:title", content: "Entrar | Monta AI — Promob Assistant Pro" },
      {
        property: "og:description",
        content: "Acesso para lojas, escritórios de projeto, fábricas e montadores.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, signUp, resetPassword, role: userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [countdown, setCountdown] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<AppRole>("escritorio");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [countdown]);



  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("Bem-vindo de volta!");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!isNumeric(password)) {
        toast.error("O PIN deve conter apenas números.");
        setBusy(false);
        return;
      }
      if (!isValidPasswordLength(password)) {
        toast.error(`Use de ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} a ${AUTH_CONFIG.MAX_PASSWORD_LENGTH} números para o seu PIN.`);
        setBusy(false);
        return;
      }
      await signUp({ email, password, fullName, companyName, role });

      toast.success("Conta criada com sucesso!");
      navigate({ to: "/dashboard" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("rate limit") || msg.includes("too many requests") || (error as any)?.status === 429) {
        toast.error("Muitas tentativas. Aguarde alguns segundos antes de tentar novamente.");
        setCountdown(40);
      } else {
        toast.error(error instanceof Error ? error.message : "Não foi possível criar a conta.");
      }
    } finally {
      setBusy(false);
    }

  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(email);
      toast.success("E-mail de recuperação enviado!");
      setMode("signin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[3rem] bg-blue-600 text-white shadow-2xl shadow-blue-600/30 ring-8 ring-blue-600/5">
            <Boxes className="h-14 w-14" />
          </div>
          <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">Monta AI</h1>
          <p className="text-[12px] font-black text-blue-600 uppercase tracking-[0.5em]">Protocolo Piloto Ativo</p>
        </div>

        {mode === "forgot" ? (
          <Card className="border-primary/15 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recuperar senha</CardTitle>
              <CardDescription>Informe seu e-mail para receber o link de recuperação.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Field id="reset-email" label="E-mail" type="email" value={email} onChange={setEmail} />
                <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar link
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setMode("signin")}>
                  Voltar para o login
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-[0_60px_150px_-30px_rgba(0,0,0,0.15)] rounded-[4rem] bg-white overflow-hidden">
            <CardHeader className="pb-8 pt-16 px-16 border-b border-slate-50">
              <CardTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Acesso Restrito</CardTitle>
              <CardDescription className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Lojas, Fábricas e Engenharia</CardDescription>
            </CardHeader>
            <CardContent className="px-16 pb-16 pt-12">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="mb-12 grid w-full grid-cols-2 p-2 bg-slate-100 rounded-[2rem] h-20 border border-slate-200 shadow-sm">
                  <TabsTrigger value="signin" className="rounded-[1.6rem] data-[state=active]:bg-white data-[state=active]:shadow-2xl font-black text-[12px] uppercase tracking-[0.2em]">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-[1.6rem] data-[state=active]:bg-white data-[state=active]:shadow-2xl font-black text-[12px] uppercase tracking-[0.2em]">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} />
                    <Field 
                      id="password" 
                      label="PIN de Acesso" 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={password} 
                      onChange={(v) => {
                        if (v === "" || isNumeric(v)) setPassword(v);
                      }} 
                    />
                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                    <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <Field id="fullName" label="Seu nome" value={fullName} onChange={setFullName} />
                    <Field id="companyName" label="Empresa" value={companyName} onChange={setCompanyName} />
                    <div className="space-y-2">
                      <Label>Perfil de acesso</Label>
                      <Select value={role} onValueChange={(v) => {
                        console.log("Selected role:", v);
                        setRole(v as AppRole);
                      }}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(roleLabels) as AppRole[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {roleLabels[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {role === "auditor" && (
                        <Alert className="mt-2 py-2">
                          <InfoIcon className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Contas de auditor precisam ser validadas pelo administrador após o cadastro.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Field id="signup-email" label="E-mail" type="email" value={email} onChange={setEmail} />
                    <Field
                      id="signup-password"
                      label="PIN de Acesso"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={password}
                      onChange={(v) => {
                        if (v === "" || isNumeric(v)) setPassword(v);
                      }}
                    />
                    {password.length > 0 && !isValidPasswordLength(password) && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 border border-red-100 mt-2">
                        <ShieldAlert className="h-4 w-4 text-red-600" />
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                          PIN Inválido: Use de 8 a 20 números.
                        </span>
                      </div>
                    )}
                    {password.length > 0 && !isNumeric(password) && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 border border-red-100 mt-2">
                        <ShieldAlert className="h-4 w-4 text-red-600" />
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                          Use apenas números (0-9).
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 border border-blue-100 mt-2">
                      <InfoIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        Requisito: PIN numérico de 8 a 20 dígitos.
                      </span>
                    </div>

                    <Button 
                      type="submit" 
                      className="h-12 w-full text-base" 
                      disabled={busy || countdown > 0}
                    >
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                      {countdown > 0 ? `Aguarde ${countdown}s` : "Criar conta"}
                    </Button>

                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  pattern,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  pattern?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        inputMode={inputMode}
        pattern={pattern}
        className="h-12"
      />
    </div>
  );
}
