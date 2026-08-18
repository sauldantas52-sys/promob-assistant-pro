import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log("[AuthGuard] No session found, redirecting to /login");
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, must_change_password, company_id, companies(id, name)')
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
      const allowedPaths = ['/dashboard', '/projects/import', '/force-password-change'];
      const isProjectDetail = location.pathname.startsWith('/projects/') && location.pathname.split('/').length === 3;
      
      if (!allowedPaths.includes(location.pathname) && !isProjectDetail) {
         console.log("Auth Guard: Incomplete profile, redirecting to dashboard");
         throw redirect({ to: '/dashboard' });
      }
    }

    return authContext;
  },
});