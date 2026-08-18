import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log("[AuthGuard] No session found, redirecting to login:", sessionError?.message);
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
    if (!role) {
      console.warn("[AuthGuard] User has no role assigned");
    }
    const mustChangePassword = !!profile?.must_change_password;

    // Bloqueio operacional se troca de senha for obrigatória
    if (mustChangePassword && location.pathname !== '/force-password-change') {
      throw redirect({
        to: '/force-password-change',
      });
    }

    const authContext = {
      session,
      userRole: role,
      companyId: profile?.company_id || null,
      companyName: profile?.companies ? (profile.companies as any).name : null,
      role: role,
      fullName: profile?.full_name || session.user.email,
    };
    
    console.log("Auth Guard Data:", { 
      path: location.pathname, 
      role: role, 
      companyId: profile?.company_id 
    });

    if (!role || !profile?.company_id) {
      if (location.pathname !== '/dashboard' && location.pathname !== '/projects/import' && !location.pathname.startsWith('/projects/')) {
        console.log("Auth Guard: Missing role or company, redirecting to dashboard");
        throw redirect({ to: '/dashboard' });
      }
    }

    return authContext;
  },
});