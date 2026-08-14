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
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, companies(id, name)')
      .eq('user_id', session.user.id)
      .maybeSingle();

    return {
      session,
      userRole: (roleData?.role as any) || null,
      companyId: (roleData?.companies as any)?.id || null,
      companyName: (roleData?.companies as any)?.name || null,
    };
  },
});