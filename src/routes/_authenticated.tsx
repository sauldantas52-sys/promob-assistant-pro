import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
    
    // Obter dados do perfil e função
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, must_change_password, company_id, companies(id, name)')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) console.error("Profile Fetch Error:", profileError);

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (roleError) console.error("RBAC Fetch Error:", roleError);

    const role = (roleData?.role as any) || null;

    // Bloqueio operacional se troca de senha for obrigatória
    if (profile?.must_change_password && location.pathname !== '/force-password-change') {
      console.log("[Auth] Senha precisa ser trocada. Redirecionando.");
      throw redirect({
        to: '/force-password-change',
      });
    }

    // Redirecionamento de segurança: se o usuário tentar acessar importação mas não for admin/escritorio/projetista, 
    // ou se o sistema detectar uma tentativa de acesso a rota protegida sem a role carregada no context
    if (location.pathname.startsWith('/projects/import')) {
      const allowedRoles = ['admin', 'escritorio', 'projetista'];
      if (!role || !allowedRoles.includes(role)) {
        console.warn(`[Security] Usuário ${session.user.id} com role ${role} tentou acessar importação.`);
        throw redirect({ to: '/dashboard' });
      }
    }

    return {
      session,
      userRole: role,
      companyId: profile?.company_id || null,
      companyName: (profile?.companies as any)?.name || null,
      role: role,
      fullName: profile?.full_name || session.user.email,
    };

  },
});