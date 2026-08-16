create or replace function public.import_legacy_store_credits(_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company uuid := public.current_company_id();
  store jsonb;
  entry jsonb;
  supplier uuid;
  account uuid;
  document uuid;
  document_record public.financial_documents%rowtype;
  existing_transaction record;
  legacy_opening_balance numeric(14,2);
  declared_balance numeric(14,2);
  calculated_balance numeric(14,2);
  existing_opening_balance numeric(14,2);
  running_balance numeric(14,2);
  previous_balance numeric(14,2);
  next_balance numeric(14,2);
  amount numeric(14,2);
  imported_stores integer := 0;
  imported_transactions integer := 0;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'legacy_credit_import_forbidden';
  end if;
  if company is null or jsonb_typeof(_payload -> 'lojas') <> 'array'
    or jsonb_typeof(_payload -> 'lancamentos') <> 'array' then
    raise exception 'legacy_credit_payload_invalid';
  end if;
  if exists (
    select 1 from jsonb_array_elements(_payload -> 'lojas') item
    group by item ->> 'id' having count(*) > 1
  ) then
    raise exception 'legacy_credit_duplicate_store';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(_payload -> 'lancamentos') payload_entry
    where lower(payload_entry ->> 'status') = 'confirmado'
      and not exists (
        select 1 from jsonb_array_elements(_payload -> 'lojas') payload_store
        where payload_store ->> 'id' = payload_entry ->> 'lojaId'
      )
  ) then
    raise exception 'legacy_credit_unknown_store';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(_payload -> 'lancamentos') item
    where lower(item ->> 'status') = 'confirmado'
    group by lower(item ->> 'fileHash')
    having count(*) > 1
  ) then
    raise exception 'legacy_credit_duplicate_hash';
  end if;

  for store in select value from jsonb_array_elements(_payload -> 'lojas') loop
    if nullif(trim(store ->> 'id'), '') is null or nullif(trim(store ->> 'nome'), '') is null then
      raise exception 'legacy_credit_store_invalid';
    end if;
    legacy_opening_balance := (store ->> 'creditoInicial')::numeric;
    declared_balance := (store ->> 'saldo')::numeric;
    if legacy_opening_balance < 0 or declared_balance < 0 then
      raise exception 'legacy_credit_balance_invalid';
    end if;

    select legacy_opening_balance - coalesce(sum((item ->> 'valor')::numeric), 0)
    into calculated_balance
    from jsonb_array_elements(_payload -> 'lancamentos') item
    where item ->> 'lojaId' = store ->> 'id'
      and lower(item ->> 'status') = 'confirmado';
    if abs(calculated_balance - declared_balance) > 0.01 then
      raise exception 'legacy_credit_balance_mismatch:%', store ->> 'nome';
    end if;

    insert into public.suppliers (company_id, name, active, created_by)
    values (company, trim(store ->> 'nome'), true, auth.uid())
    on conflict (company_id, name) do update set active = true
    returning id into supplier;

    select id, store_credit_accounts.opening_balance
    into account, existing_opening_balance
    from public.store_credit_accounts
    where company_id = company and supplier_id = supplier;
    if found then
      if exists (
        select 1 from public.store_credit_transactions where account_id = account
      ) and abs(existing_opening_balance - legacy_opening_balance) > 0.01 then
        raise exception 'legacy_credit_opening_balance_changed:%', store ->> 'nome';
      end if;
      update public.store_credit_accounts
      set opening_balance = legacy_opening_balance
      where id = account;
    else
      insert into public.store_credit_accounts (
        company_id, supplier_id, opening_balance, current_balance, created_by
      ) values (company, supplier, legacy_opening_balance, legacy_opening_balance, auth.uid())
      returning id into account;
    end if;

    if exists (
      select 1
      from public.store_credit_transactions credit_transaction
      left join public.financial_documents financial_document
        on financial_document.id = credit_transaction.document_id
      where credit_transaction.account_id = account
        and not exists (
          select 1
          from jsonb_array_elements(_payload -> 'lancamentos') item
          where item ->> 'lojaId' = store ->> 'id'
            and lower(item ->> 'status') = 'confirmado'
            and lower(item ->> 'fileHash') = financial_document.document_hash
        )
    ) then
      raise exception 'legacy_credit_account_has_other_transactions:%', store ->> 'nome';
    end if;

    running_balance := legacy_opening_balance;
    for entry in
      select value
      from jsonb_array_elements(_payload -> 'lancamentos') item
      where item ->> 'lojaId' = store ->> 'id'
        and lower(item ->> 'status') = 'confirmado'
      order by coalesce(item ->> 'data', left(item ->> 'criadoEm', 10)), item ->> 'criadoEm'
    loop
      amount := (entry ->> 'valor')::numeric;
      if amount <= 0 or (entry ->> 'fileHash') !~ '^[A-Fa-f0-9]{64}$' then
        raise exception 'legacy_credit_transaction_invalid';
      end if;
      previous_balance := running_balance;
      next_balance := round(running_balance - amount, 2);
      if entry ? 'saldoAnterior'
        and abs((entry ->> 'saldoAnterior')::numeric - previous_balance) > 0.01 then
        raise exception 'legacy_credit_previous_balance_mismatch:%', entry ->> 'numeroNota';
      end if;
      if entry ? 'saldoPosterior'
        and abs((entry ->> 'saldoPosterior')::numeric - next_balance) > 0.01 then
        raise exception 'legacy_credit_next_balance_mismatch:%', entry ->> 'numeroNota';
      end if;
      running_balance := next_balance;

      select * into document_record
      from public.financial_documents
      where company_id = company and document_hash = lower(entry ->> 'fileHash');
      if found then
        if document_record.supplier_id is distinct from supplier
          or document_record.total_amount is null
          or abs(document_record.total_amount - amount) > 0.01
          or document_record.status = 'rejected' then
          raise exception 'legacy_credit_document_conflict:%', entry ->> 'numeroNota';
        end if;
        document := document_record.id;
      else
        insert into public.financial_documents (
          company_id, supplier_id, file_name, storage_path, document_hash,
          document_number, document_date, total_amount, ocr_text, status,
          created_by, confirmed_by, confirmed_at, created_at
        ) values (
          company,
          supplier,
          'Nota ' || coalesce(nullif(entry ->> 'numeroNota', ''), 'legada'),
          'legacy://store-credit/' || lower(entry ->> 'fileHash'),
          lower(entry ->> 'fileHash'),
          nullif(entry ->> 'numeroNota', ''),
          nullif(entry ->> 'data', '')::date,
          amount,
          nullif(entry ->> 'descricao', ''),
          'confirmed',
          auth.uid(),
          auth.uid(),
          coalesce(nullif(entry ->> 'criadoEm', '')::timestamptz, now()),
          coalesce(nullif(entry ->> 'criadoEm', '')::timestamptz, now())
        ) returning id into document;
      end if;

      select credit_transaction.id, credit_transaction.account_id, credit_transaction.amount,
        credit_transaction.previous_balance, credit_transaction.new_balance
      into existing_transaction
      from public.store_credit_transactions credit_transaction
      where credit_transaction.company_id = company
        and credit_transaction.document_id = document
        and credit_transaction.kind = 'purchase'
        and credit_transaction.status <> 'reversed';
      if found then
        if existing_transaction.account_id <> account
          or abs(existing_transaction.amount - amount) > 0.01
          or abs(existing_transaction.previous_balance - previous_balance) > 0.01
          or abs(existing_transaction.new_balance - next_balance) > 0.01 then
          raise exception 'legacy_credit_duplicate_conflict:%', entry ->> 'numeroNota';
        end if;
      else
        update public.financial_documents
        set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
        where id = document and status = 'review';
        insert into public.store_credit_transactions (
          account_id, company_id, document_id, kind, amount, previous_balance,
          new_balance, status, notes, created_by, confirmed_by, confirmed_at, created_at
        ) values (
          account, company, document, 'purchase', amount, previous_balance,
          next_balance, 'confirmed', 'Importado do Monta AI Beta Oficial',
          auth.uid(), auth.uid(),
          coalesce(nullif(entry ->> 'criadoEm', '')::timestamptz, now()),
          coalesce(nullif(entry ->> 'criadoEm', '')::timestamptz, now())
        );
        imported_transactions := imported_transactions + 1;
      end if;
    end loop;

    if abs(running_balance - declared_balance) > 0.01 then
      raise exception 'legacy_credit_final_balance_mismatch:%', store ->> 'nome';
    end if;
    update public.store_credit_accounts
    set current_balance = declared_balance, updated_at = now()
    where id = account;
    imported_stores := imported_stores + 1;
  end loop;

  return jsonb_build_object(
    'importedStores', imported_stores,
    'importedTransactions', imported_transactions
  );
end;
$$;

revoke all on function public.import_legacy_store_credits(jsonb) from public, anon;
grant execute on function public.import_legacy_store_credits(jsonb) to authenticated;
