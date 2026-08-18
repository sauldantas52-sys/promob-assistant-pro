import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log("[AuthGuard] Redirecionando para login. Path:", location.pathname);
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, must_change_password')
      .eq('id', session.user.id)
      .maybeSingle();

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const role = (roleData?.role as any) || null;
    const mustChangePassword = !!profile?.must_change_password;

    if (mustChangePassword && location.pathname !== '/force-password-change') {
      throw redirect({ to: '/force-password-change' });
    }

    console.log("Auth Guard Check:", { 
      path: location.pathname, 
      role: role, 
      companyId: profile?.company_id 
    });

    // Removido qualquer redirecionamento automático para o dashboard
    // para garantir que o usuário chegue na página que solicitou se estiver autenticado.
    
    return {
      session,
      userRole: role,
      companyId: profile?.company_id || null,
      role: role,
    };
  },
});