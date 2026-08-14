import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
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
import { InfoIcon } from "lucide-react";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<AppRole>("escritorio");

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
      await signUp({ email, password, fullName, companyName, role });
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conta.");
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-blue-600 text-white shadow-2xl shadow-blue-600/30">
            <Boxes className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Monta AI</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Aprovado para piloto controlado</p>
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
          <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl">
            <CardHeader className="pb-6 pt-8 px-8">
              <CardTitle className="text-2xl font-black text-slate-900">Acesso ao sistema</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Lojas, fábricas e montadores.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="mb-8 grid w-full grid-cols-2 p-1 bg-slate-100 rounded-2xl h-14">
                  <TabsTrigger value="signin" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-sm">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-sm">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} />
                    <Field id="password" label="Senha" type="password" value={password} onChange={setPassword} />
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
                      label="Senha"
                      type="password"
                      value={password}
                      onChange={setPassword}
                    />
                    <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
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
        className="h-12"
      />
    </div>
  );
}
