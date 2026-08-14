import { createFileRoute } from '@tanstack/react-router';
import { useAuth, roleLabels, type AppRole } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, Mail, Shield, UserCheck, Trash2, KeyRound, HardHat } from "lucide-react";
import { inviteUser } from "@/lib/user-management.functions";
import { setOperatorCredentials } from "@/lib/operator-auth.functions";
import { AUTH_CONFIG } from "@/lib/auth-config";

export const Route = createFileRoute('/_authenticated/settings/users')({

  component: UsersManagementPage,
});

interface UserProfile {
  id: string;
  full_name: string | null;
  must_change_password: boolean | null;
  user_roles: { role: string }[];
  email?: string;
}

function UsersManagementPage() {
  const { user: currentUser, role: currentRole, companyId } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [configuringOperator, setConfiguringOperator] = useState<UserProfile | null>(null);
  
  // Operator config state
  const [opCode, setOpCode] = useState("");
  const [opPin, setOpPin] = useState("");
  const [opRealPass, setOpRealPass] = useState("");
  const [settingOp, setSettingOp] = useState(false);
  
  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("escritorio");

  const fetchUsers = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          must_change_password,
          user_roles(role)
        `)
        .eq('company_id', companyId);

      if (error) throw error;
      setUsers(data as any || []);
    } catch (error) {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setInviting(true);
    
    try {
      await inviteUser({
        data: {
          email,
          fullName,
          role,
          companyId
        }
      });
      
      toast.success(`Convite registrado para ${email}`);
      setEmail("");
      setFullName("");
      fetchUsers();
    } catch (error) {
      toast.error("Erro ao registrar convite.");
    } finally {
      setInviting(false);
    }

  };

  const handleSetOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringOperator) return;
    setSettingOp(true);
    try {
      await setOperatorCredentials({
        data: {
          profileId: configuringOperator.id,
          operatorCode: opCode,
          pin: opPin,
          realPassword: opRealPass
        }
      });
      toast.success("Credenciais operacionais configuradas!");
      setConfiguringOperator(null);
      setOpCode("");
      setOpPin("");
      setOpRealPass("");
      fetchUsers();
    } catch (error) {
      toast.error("Erro ao configurar operador.");
    } finally {
      setSettingOp(false);
    }
  };

  if (currentRole !== 'admin' && currentRole !== 'escritorio') {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-black uppercase">Acesso Negado</h2>
        <p className="text-slate-500">Apenas administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Usuários</h1>
          <p className="text-sm font-bold text-blue-600 uppercase tracking-[0.3em] mt-2">Gestão de Acesso e Permissões</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] bg-slate-900 text-white overflow-hidden self-start">
          <CardHeader className="pt-10 px-10">
            <div className="flex items-center gap-3 mb-2">
              <UserPlus className="h-6 w-6 text-blue-400" />
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Novo Acesso</CardTitle>
            </div>
            <CardDescription className="text-slate-400">Envie um convite para novos colaboradores.</CardDescription>
          </CardHeader>
          <CardContent className="p-10">
            <form onSubmit={handleInvite} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="invite-name" className="text-slate-300">Nome Completo</Label>
                <Input 
                  id="invite-name" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  className="bg-slate-800 border-slate-700 text-white rounded-xl h-12" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-slate-300">E-mail</Label>
                <Input 
                  id="invite-email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="bg-slate-800 border-slate-700 text-white rounded-xl h-12" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Perfil Industrial</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest" disabled={inviting}>
                {inviting ? <Loader2 className="animate-spin" /> : "Enviar Convite"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="pt-10 px-10 border-b border-slate-50">
            <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Colaboradores Ativos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-slate-300" /></div>
            ) : (
              <div className="divide-y divide-slate-50">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-8 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <UserCheck className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{u.full_name || 'Sem Nome'}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                            {roleLabels[u.user_roles[0]?.role as AppRole] || u.user_roles[0]?.role}
                          </span>
                          {u.must_change_password && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                              Troca de PIN pendente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setConfiguringOperator(u);
                          setOpCode(`OP-${(u.full_name?.split(' ')[0] || 'USR').toUpperCase()}`);
                        }}
                      >
                        <KeyRound className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {configuringOperator && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="pt-10 px-10 border-b border-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <HardHat className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-2xl font-black uppercase tracking-tight">Configurar Operador</CardTitle>
              </div>
              <CardDescription>
                Defina as credenciais simplificadas para <strong>{configuringOperator.full_name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <form onSubmit={handleSetOperator} className="space-y-6">
                <div className="space-y-2">
                  <Label>Código do Operador</Label>
                  <Input 
                    value={opCode} 
                    onChange={(e) => setOpCode(e.target.value)} 
                    placeholder="Ex: OP-01" 
                    className="h-12 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>PIN Numérico (6-20 dígitos)</Label>
                  <Input 
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={opPin} 
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v)) setOpPin(v);
                    }} 
                    placeholder="Apenas números" 
                    className="h-12 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha Supabase (Interna)</Label>
                  <Input 
                    type="password"
                    value={opRealPass} 
                    onChange={(e) => setOpRealPass(e.target.value)} 
                    placeholder="Senha de 8+ caracteres" 
                    className="h-12 rounded-xl"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    Esta senha será usada automaticamente pelo sistema no login via PIN.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => setConfiguringOperator(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest" disabled={settingOp}>
                    {settingOp ? <Loader2 className="animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
