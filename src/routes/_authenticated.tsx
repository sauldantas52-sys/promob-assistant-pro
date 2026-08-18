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

    return authContext;
  },
});