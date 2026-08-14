create or replace function public.current_company_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() $$;