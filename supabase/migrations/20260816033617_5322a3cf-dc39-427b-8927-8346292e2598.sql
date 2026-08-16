-- Part 1.4: Commercial Helper Functions (excluding storage)
create or replace function public.prepare_store_credit_purchase(
  _account_id uuid,
  _document_id uuid,
  _amount numeric,
  _idempotency_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_record public.store_credit_accounts%rowtype;
  document_record public.financial_documents%rowtype;
  transaction_id uuid;
begin
  if auth.uid() is null or not public.can_manage_commercial() then
    raise exception 'commercial_access_required';
  end if;
  if _amount is null or _amount <= 0 then raise exception 'amount_must_be_positive'; end if;

  select * into account_record from public.store_credit_accounts
  where id = _account_id and company_id = public.current_company_id();
  if not found then raise exception 'credit_account_not_found'; end if;

  select * into document_record from public.financial_documents
  where id = _document_id and company_id = public.current_company_id();
  if not found then raise exception 'financial_document_not_found'; end if;
  if document_record.supplier_id is distinct from account_record.supplier_id then
    raise exception 'document_supplier_mismatch';
  end if;
  if document_record.status <> 'review' then raise exception 'document_not_in_review'; end if;
  if document_record.total_amount is null
    or abs(document_record.total_amount - _amount) > 0.01 then
    raise exception 'document_amount_mismatch';
  end if;

  insert into public.store_credit_transactions (
    account_id, company_id, document_id, kind, amount,
    previous_balance, new_balance, status, idempotency_key, created_by
  ) values (
    account_record.id, account_record.company_id, document_record.id, 'purchase', _amount,
    account_record.current_balance, account_record.current_balance - _amount,
    'pending', _idempotency_key, auth.uid()
  )
  on conflict (company_id, idempotency_key) do update
  set idempotency_key = excluded.idempotency_key
  returning id into transaction_id;

  return transaction_id;
end;
$$;

create or replace function public.confirm_store_credit_transaction(_transaction_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  transaction_record public.store_credit_transactions%rowtype;
  account_record public.store_credit_accounts%rowtype;
  resulting_balance numeric(14,2);
begin
  if auth.uid() is null or not public.can_manage_commercial() then
    raise exception 'commercial_access_required';
  end if;

  select * into transaction_record
  from public.store_credit_transactions
  where id = _transaction_id and company_id = public.current_company_id()
  for update;
  if not found then raise exception 'credit_transaction_not_found'; end if;
  if transaction_record.status <> 'pending' then raise exception 'credit_transaction_not_pending'; end if;

  select * into account_record
  from public.store_credit_accounts
  where id = transaction_record.account_id and company_id = transaction_record.company_id
  for update;
  if not found then raise exception 'credit_account_not_found'; end if;

  if transaction_record.kind = 'purchase' then
    resulting_balance := account_record.current_balance - transaction_record.amount;
  else
    resulting_balance := account_record.current_balance + transaction_record.amount;
  end if;
  if resulting_balance < 0 then raise exception 'insufficient_store_credit'; end if;

  update public.store_credit_accounts
  set current_balance = resulting_balance, updated_at = now()
  where id = account_record.id;

  update public.store_credit_transactions
  set previous_balance = account_record.current_balance,
      new_balance = resulting_balance,
      status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now()
  where id = transaction_record.id;

  if transaction_record.document_id is not null then
    update public.financial_documents
    set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
    where id = transaction_record.document_id;
  end if;

  return resulting_balance;
end;
$$;

create or replace function public.prevent_confirmed_credit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.status = 'confirmed' then
    raise exception 'confirmed_credit_entries_are_append_only';
  end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    raise exception 'confirmed_credit_entries_are_append_only';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists prevent_confirmed_credit_mutation_trigger on public.store_credit_transactions;
create trigger prevent_confirmed_credit_mutation_trigger
before update or delete on public.store_credit_transactions
for each row execute function public.prevent_confirmed_credit_mutation();

revoke all on function public.prepare_store_credit_purchase(uuid, uuid, numeric, uuid) from public, anon;
revoke all on function public.confirm_store_credit_transaction(uuid) from public, anon;
grant execute on function public.prepare_store_credit_purchase(uuid, uuid, numeric, uuid) to authenticated;
grant execute on function public.confirm_store_credit_transaction(uuid) to authenticated;

-- Storage policies for commercial-documents
create policy "Authorized roles read commercial documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'commercial-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (
    public.can_manage_commercial()
    or public.can_manage_projects()
    or public.has_role(auth.uid(), 'auditor'::public.app_role)
  )
);
create policy "Authorized roles upload commercial documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'commercial-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (public.can_manage_commercial() or public.can_manage_projects())
);
create policy "Authorized roles remove own pending commercial documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'commercial-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (public.can_manage_commercial() or public.can_manage_projects())
);
