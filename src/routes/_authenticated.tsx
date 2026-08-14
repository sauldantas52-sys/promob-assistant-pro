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
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, companies(id, name)')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (roleError) console.error("RBAC Fetch Error:", roleError);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, must_change_password')
      .eq('id', session.user.id)
      .maybeSingle();

    // Bloqueio operacional se troca de senha for obrigatória
    if (profile?.must_change_password && location.pathname !== '/force-password-change') {
      throw redirect({
        to: '/force-password-change',
      });
    }


    return {
      session,
      userRole: (roleData?.role as any) || null,
      companyId: (roleData?.companies as any)?.id || null,
      companyName: (roleData?.companies as any)?.name || null,
      role: (roleData?.role as any) || null,
      fullName: profile?.full_name || session.user.email,
    };
  },
});