import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Ban, KeyRound, Loader2, Pencil, Shield, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  companyUserRoles,
  createCompanyUser,
  listCompanyUsers,
  updateCompanyUserAccess,
  type CompanyUserRole,
} from "@/lib/operator-auth.functions";

export const Route = createFileRoute("/_authenticated/settings/users")({
  component: UsersManagementPage,
});

type CompanyUser = Awaited<ReturnType<typeof listCompanyUsers>>[number];

const roleLabels: Record<CompanyUserRole, string> = {
  admin: "Administrador",
  projetista: "Projetista",
  comercial: "Comercial",
  escritorio: "Escritório",
  fabrica: "Fábrica",
  montador: "Montador",
  auditor: "Auditor",
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function PinInput({
  id,
  value,
  onChange,
  required = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <Input
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="new-password"
      minLength={8}
      maxLength={20}
      pattern="[0-9]{8,20}"
      placeholder="8 a 20 dígitos"
      value={value}
      onChange={(event) => {
        if (/^\d*$/.test(event.target.value)) onChange(event.target.value);
      }}
      required={required}
    />
  );
}

function UsersManagementPage() {
  const { user: currentUser, role: currentRole, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [operatorCode, setOperatorCode] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<CompanyUserRole>("projetista");
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editRole, setEditRole] = useState<CompanyUserRole>("projetista");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await listCompanyUsers());
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível carregar os usuários."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentRole === "admin") void loadUsers();
    if (!authLoading && currentRole !== "admin") setLoading(false);
  }, [authLoading, currentRole]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createCompanyUser({ data: { fullName, operatorCode, pin, role } });
      setFullName("");
      setOperatorCode("");
      setPin("");
      setRole("projetista");
      toast.success("Usuário criado com segurança.");
      await loadUsers();
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível criar o usuário."));
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (companyUser: CompanyUser) => {
    if (!companyUser.role) return;
    setEditing(companyUser);
    setEditName(companyUser.fullName);
    setEditCode(companyUser.operatorCode);
    setEditRole(companyUser.role);
    setEditPin("");
  };

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateCompanyUserAccess({
        data: {
          userId: editing.id,
          fullName: editName,
          operatorCode: editCode,
          role: editRole,
          ...(editPin ? { pin: editPin } : {}),
        },
      });
      setEditing(null);
      toast.success(editPin ? "Usuário e PIN atualizados." : "Usuário atualizado.");
      await loadUsers();
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível atualizar o usuário."));
    } finally {
      setSaving(false);
    }
  };

  const toggleBlocked = async (companyUser: CompanyUser) => {
    setBusyUserId(companyUser.id);
    try {
      await updateCompanyUserAccess({
        data: { userId: companyUser.id, blocked: !companyUser.blocked },
      });
      toast.success(companyUser.blocked ? "Usuário ativado." : "Usuário bloqueado.");
      await loadUsers();
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível alterar o acesso."));
    } finally {
      setBusyUserId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (currentRole !== "admin") {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 rounded-2xl bg-slate-100 p-4">
          <Shield className="h-9 w-9 text-slate-500" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
          Acesso restrito
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Somente administradores podem gerenciar usuários.
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl bg-slate-950 px-6 py-7 text-white sm:px-8 sm:py-9">
        <div className="flex items-center gap-3 text-blue-400">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.24em]">Administração</span>
        </div>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Usuários da empresa
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Crie acessos operacionais, defina funções e bloqueie contas sem expor credenciais
          internas.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Novo usuário
            </CardTitle>
            <CardDescription>Todos os campos são obrigatórios.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="new-name">Nome completo</Label>
                <Input
                  id="new-name"
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-code">Código / matrícula</Label>
                <Input
                  id="new-code"
                  maxLength={50}
                  value={operatorCode}
                  onChange={(event) => setOperatorCode(event.target.value)}
                  placeholder="Ex.: MAT-1042"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pin">PIN numérico</Label>
                <PinInput id="new-pin" value={pin} onChange={setPin} required />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={role} onValueChange={(value) => setRole(value as CompanyUserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companyUserRoles.map((value) => (
                      <SelectItem key={value} value={value}>
                        {roleLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="h-11 w-full bg-blue-600 font-bold hover:bg-blue-700"
                disabled={saving}
                type="submit"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar usuário"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-blue-600" />
              Equipe
            </CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "usuário" : "usuários"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-56 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Nenhum usuário cadastrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((companyUser) => (
                  <article
                    key={companyUser.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold text-slate-900">
                          {companyUser.fullName || "Sem nome"}
                        </h2>
                        <Badge variant={companyUser.blocked ? "destructive" : "secondary"}>
                          {companyUser.blocked ? "Bloqueado" : "Ativo"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {companyUser.operatorCode || "Sem matrícula"}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                        {companyUser.role ? roleLabels[companyUser.role] : "Sem função"}
                      </p>
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditor(companyUser)}
                        disabled={!companyUser.role}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant={companyUser.blocked ? "default" : "outline"}
                        size="sm"
                        onClick={() => void toggleBlocked(companyUser)}
                        disabled={
                          busyUserId === companyUser.id || currentUser?.id === companyUser.id
                        }
                      >
                        {busyUserId === companyUser.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="mr-2 h-4 w-4" />
                        )}
                        {companyUser.blocked ? "Ativar" : "Bloquear"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              Altere dados, função ou informe um novo PIN para redefini-lo.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                maxLength={120}
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Código / matrícula</Label>
              <Input
                id="edit-code"
                maxLength={50}
                value={editCode}
                onChange={(event) => setEditCode(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pin" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Novo PIN (opcional)
              </Label>
              <PinInput id="edit-pin" value={editPin} onChange={setEditPin} />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={editRole}
                onValueChange={(value) => setEditRole(value as CompanyUserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companyUserRoles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {roleLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
