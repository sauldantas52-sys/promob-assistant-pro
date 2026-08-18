import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Building2,
  Check,
  FileScan,
  FileText,
  LayoutDashboard,
  Loader2,
  PackageSearch,
  PanelsTopLeft,
  Plus,
  Scale,
  Send,
  ShieldAlert,
  Truck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";
import { commercialSupabase } from "@/lib/commercial/client";
import { importLegacyStoreCredits } from "@/lib/commercial/legacy-credit.functions";
import { sendOutsourcingOrderWhatsApp } from "@/lib/commercial/whatsapp.functions";
import {
  extractDocumentText,
  parseCommercialDocument,
  safeStorageName,
  sha256File,
  type ParsedCommercialDocument,
} from "@/lib/commercial/documents";
import type {
  CommercialProject,
  FinancialDocument,
  OutsourcingOrder,
  ProjectXmlFile,
  StoreCreditAccount,
  StoreCreditTransaction,
  Supplier,
  SupplierOffer,
  VisualAnalysisSession,
} from "@/lib/commercial/types";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

type LegacyCreditPayload = {
  lojas: Array<{ id: string; nome: string; creditoInicial: number; saldo: number }>;
  lancamentos: Array<{
    lojaId: string;
    status: string;
    data?: string;
    numeroNota?: string;
    descricao?: string;
    valor: number;
    fileHash: string;
    criadoEm?: string;
    saldoAnterior?: number;
    saldoPosterior?: number;
  }>;
};

function message(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Erro desconhecido";
}

function formatDate(value: string | null) {
  return value ? date.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "Sem data";
}

export function CommercialDashboard({
  companyId,
  userId,
  role,
}: {
  companyId: string;
  userId: string;
  role: AppRole;
}) {
  const canManageFinancial = role === "admin" || role === "comercial";
  const canCreateOperational = role !== "auditor";
  const canSendWhatsApp = ["admin", "comercial", "projetista", "escritorio"].includes(role);
  const suppliers = useQuery({
    queryKey: ["commercial-suppliers", companyId],
    queryFn: async () => {
      const { data, error } = await commercialSupabase
        .from("suppliers")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });
  const accounts = useCommercialQuery<StoreCreditAccount>(
    "store_credit_accounts",
    "commercial-credit-accounts",
    companyId,
  );
  const documents = useCommercialQuery<FinancialDocument>(
    "financial_documents",
    "commercial-documents",
    companyId,
    "document_date",
  );
  const transactions = useCommercialQuery<StoreCreditTransaction>(
    "store_credit_transactions",
    "commercial-credit-transactions",
    companyId,
    "created_at",
  );
  const offers = useCommercialQuery<SupplierOffer>(
    "supplier_offers",
    "commercial-offers",
    companyId,
    "valid_until",
  );
  const orders = useCommercialQuery<OutsourcingOrder>(
    "outsourcing_orders",
    "commercial-outsourcing",
    companyId,
    "requested_due_date",
  );
  const sessions = useCommercialQuery<VisualAnalysisSession>(
    "visual_analysis_sessions",
    "commercial-visual-sessions",
    companyId,
    "created_at",
  );
  const projects = useQuery({
    queryKey: ["commercial-projects", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data as CommercialProject[];
    },
  });
  const xmlFiles = useQuery({
    queryKey: ["commercial-project-xml-files", companyId, projects.data?.map(({ id }) => id)],
    enabled: Boolean(projects.data?.length),
    queryFn: async () => {
      const projectIds = (projects.data ?? []).map(({ id }) => id);
      const { data, error } = await supabase
        .from("project_files")
        .select("id, project_id, file_name")
        .in("project_id", projectIds)
        .eq("file_type", "xml")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectXmlFile[];
    },
  });

  const supplierMap = new Map((suppliers.data ?? []).map((supplier) => [supplier.id, supplier]));
  const accountMap = new Map((accounts.data ?? []).map((account) => [account.id, account]));
  const projectMap = new Map((projects.data ?? []).map((project) => [project.id, project]));
  const totalCredit = (accounts.data ?? []).reduce(
    (total, account) => total + Number(account.current_balance),
    0,
  );
  const pendingTransactions = (transactions.data ?? []).filter(
    (transaction) => transaction.status === "pending" || transaction.status === "pendente",
  );
  const validOffers = (offers.data ?? []).filter(
    (offer) => !offer.valid_until || new Date(`${offer.valid_until}T23:59:59`) >= new Date(),
  );
  const errors = [suppliers, accounts, documents, transactions, offers, orders, sessions].filter(
    (query) => query.isError,
  ).length;

  return (
    <main className="min-h-full bg-slate-100/70 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-lime-400">
              <span className="h-1.5 w-8 bg-lime-400" /> Comando Comercial Avançado
            </div>
            <h1 className="text-3xl font-black uppercase tracking-[-0.05em] sm:text-5xl">
              Comercial <span className="text-slate-500">360</span>
            </h1>
            <p className="mt-2 max-w-2xl text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Documentos, fornecedores, crédito em loja e decisões de compra em uma única operação.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-700 sm:grid-cols-4">
            <HeaderMetric label="Crédito disponível" value={money.format(totalCredit)} />
            <HeaderMetric label="Baixas pendentes" value={String(pendingTransactions.length)} />
            <HeaderMetric label="Ofertas válidas" value={String(validOffers.length)} />
            <HeaderMetric label="Fontes indisponíveis" value={String(errors)} alert={errors > 0} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-3 sm:p-5 lg:p-8">
        {errors > 0 && (
          <div className="mb-4 flex items-start gap-3 border border-amber-300 bg-amber-50 p-3 text-amber-950">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              {errors} fonte(s) comercial(is) ainda não responderam. Os números afetados permanecem
              vazios; nenhum valor foi estimado.
            </p>
          </div>
        )}

        <Tabs defaultValue="overview">
          <div className="overflow-x-auto border border-slate-200 bg-white p-1">
            <TabsList className="h-auto min-w-max justify-start gap-1 rounded-none bg-transparent p-0">
              <Tab value="overview" icon={LayoutDashboard} label="Visão Geral" />
              <Tab value="credits" icon={BadgeDollarSign} label="Créditos" />
              <Tab value="documents" icon={FileScan} label="Notas/OCR" />
              <Tab value="comparison" icon={Scale} label="Comparativo" />
              <Tab value="suppliers" icon={Building2} label="Fornecedores" />
              <Tab value="outsourcing" icon={Truck} label="Terceirização" />
              <Tab value="boards" icon={PanelsTopLeft} label="Pranchas" />
              <Tab value="ai_quotes" icon={BadgeDollarSign} label="Orçamentos IA" />
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={Building2}
                label="Fornecedores ativos"
                value={(suppliers.data ?? []).filter((item) => item.active).length}
                loading={suppliers.isLoading}
              />
              <SummaryCard
                icon={BadgeDollarSign}
                label="Contas de crédito"
                value={(accounts.data ?? []).length}
                loading={accounts.isLoading}
              />
              <SummaryCard
                icon={FileText}
                label="Documentos"
                value={(documents.data ?? []).length}
                loading={documents.isLoading}
              />
              <SummaryCard
                icon={Truck}
                label="Ordens terceirizadas"
                value={(orders.data ?? []).length}
                loading={orders.isLoading}
              />
            </div>
            <Panel title="Atenção operacional" icon={ShieldAlert}>
              <div className="grid gap-2 md:grid-cols-3">
                <Signal label="Baixas aguardando confirmação" value={pendingTransactions.length} />
                <Signal
                  label="Ofertas vencidas"
                  value={(offers.data ?? []).length - validOffers.length}
                />
                <Signal
                  label="Documentos para revisão"
                  value={
                    (documents.data ?? []).filter(
                      (item) => item.status === "review" || item.status === "pending",
                    ).length
                  }
                />
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="credits" className="mt-4">
            <CreditsPanel
              companyId={companyId}
              accounts={accounts.data ?? []}
              transactions={transactions.data ?? []}
              suppliers={supplierMap}
              loading={accounts.isLoading || transactions.isLoading}
              error={accounts.error ?? transactions.error}
              canManageFinancial={canManageFinancial}
              isAdmin={role === "admin"}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <DocumentsPanel
              companyId={companyId}
              suppliers={suppliers.data ?? []}
              documents={documents.data ?? []}
              transactions={transactions.data ?? []}
              loading={documents.isLoading}
              error={documents.error}
              accounts={accounts.data ?? []}
              canManageFinancial={canManageFinancial}
            />
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <ComparisonPanel
              offers={offers.data ?? []}
              suppliers={supplierMap}
              documents={documents.data ?? []}
              loading={offers.isLoading}
              error={offers.error}
              companyId={companyId}
              supplierList={suppliers.data ?? []}
              canManageFinancial={canManageFinancial}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <SuppliersPanel
              companyId={companyId}
              suppliers={suppliers.data ?? []}
              loading={suppliers.isLoading}
              error={suppliers.error}
              canManageFinancial={canManageFinancial}
            />
          </TabsContent>

          <TabsContent value="outsourcing" className="mt-4">
            <OutsourcingPanel
              orders={orders.data ?? []}
              suppliers={supplierMap}
              projects={projectMap}
              projectList={projects.data ?? []}
              xmlFiles={xmlFiles.data ?? []}
              companyId={companyId}
              userId={userId}
              canCreate={canCreateOperational}
              canSendWhatsApp={canSendWhatsApp}
              loading={orders.isLoading || projects.isLoading || xmlFiles.isLoading}
              error={orders.error ?? projects.error ?? xmlFiles.error}
            />
          </TabsContent>

          <TabsContent value="boards" className="mt-4">
            <BoardsPanel
              companyId={companyId}
              projects={projects.data ?? []}
              sessions={sessions.data ?? []}
              loading={sessions.isLoading}
              error={sessions.error}
              canCreate={canCreateOperational}
            />
          </TabsContent>
          <TabsContent value="ai_quotes" className="mt-4">
            <div className="mx-auto max-w-5xl">
              <AIQuoteWizard companyId={companyId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function useCommercialQuery<T>(
  table:
    | "store_credit_accounts"
    | "financial_documents"
    | "store_credit_transactions"
    | "supplier_offers"
    | "outsourcing_orders"
    | "visual_analysis_sessions",
  key: string,
  companyId: string,
  order?: string,
) {
  return useQuery({
    queryKey: [key, companyId],
    queryFn: async () => {
      let query = commercialSupabase.from(table).select("*").eq("company_id", companyId);
      if (order) query = query.order(order, { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
  });
}

function CreditsPanel({
  companyId,
  accounts,
  transactions,
  suppliers,
  loading,
  error,
  canManageFinancial,
  isAdmin,
}: {
  companyId: string;
  accounts: StoreCreditAccount[];
  transactions: StoreCreditTransaction[];
  suppliers: Map<string, Supplier>;
  loading: boolean;
  error: unknown;
  canManageFinancial: boolean;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [newAccount, setNewAccount] = useState({ supplierId: "", openingBalance: "" });
  const [legacyFile, setLegacyFile] = useState<File | null>(null);
  const [legacyResult, setLegacyResult] = useState<{
    importedStores: number;
    importedTransactions: number;
  } | null>(null);
  const createAccount = useMutation({
    mutationFn: async () => {
      const openingBalance = Number(newAccount.openingBalance);
      if (!newAccount.supplierId) throw new Error("Selecione um fornecedor.");
      if (!Number.isFinite(openingBalance) || openingBalance < 0) {
        throw new Error("Informe um saldo inicial válido.");
      }
      const { error: insertError } = await commercialSupabase.from("store_credit_accounts").insert({
        company_id: companyId,
        supplier_id: newAccount.supplierId,
        opening_balance: openingBalance,
        current_balance: openingBalance,
      });
      if (insertError) throw insertError;
    },
    onSuccess: async () => {
      setNewAccount({ supplierId: "", openingBalance: "" });
      toast.success("Conta de crédito criada.");
      await queryClient.invalidateQueries({
        queryKey: ["commercial-credit-accounts", companyId],
      });
    },
    onError: (cause) => toast.error(message(cause)),
  });
  const confirm = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error: rpcError } = await commercialSupabase.rpc("confirm_store_credit_transaction", {
        _transaction_id: transactionId,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: async () => {
      toast.success("Baixa confirmada e saldo atualizado pela operação transacional.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["commercial-credit-accounts", companyId] }),
        queryClient.invalidateQueries({ queryKey: ["commercial-credit-transactions", companyId] }),
      ]);
    },
    onError: (cause) => toast.error(`Não foi possível confirmar a baixa: ${message(cause)}`),
  });
  const importLegacy = useMutation({
    mutationFn: async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Selecione um arquivo com extensão .json.");
      }
      let parsedJson: LegacyCreditPayload;
      try {
        parsedJson = JSON.parse(await file.text()) as typeof parsedJson;
      } catch {
        throw new Error("JSON inválido. Verifique a sintaxe do arquivo selecionado.");
      }
      return importLegacyStoreCredits({ data: parsedJson });
    },
    onSuccess: async (result) => {
      setLegacyResult(result);
      setLegacyFile(null);
      toast.success(
        `Importação concluída: ${result.importedStores} loja(s) e ${result.importedTransactions} lançamento(s). Duplicados foram ignorados por hash.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["commercial-suppliers", companyId] }),
        queryClient.invalidateQueries({ queryKey: ["commercial-credit-accounts", companyId] }),
        queryClient.invalidateQueries({ queryKey: ["commercial-documents", companyId] }),
        queryClient.invalidateQueries({
          queryKey: ["commercial-credit-transactions", companyId],
        }),
      ]);
    },
    onError: (cause) => {
      setLegacyResult(null);
      toast.error(message(cause));
    },
  });

  return (
    <Panel title="Crédito em loja" icon={BadgeDollarSign}>
      {isAdmin && (
        <div className="space-y-3 border border-blue-200 bg-blue-50 p-3 text-blue-950">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider">
              Importar créditos do Monta AI Beta
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Selecione manualmente o JSON exportado. Lojas e lançamentos já existentes são
              ignorados pelo hash do documento.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="file"
              accept="application/json,.json"
              className="bg-white"
              onChange={(event) => {
                setLegacyResult(null);
                setLegacyFile(event.target.files?.[0] ?? null);
              }}
            />
            <Button
              type="button"
              className="shrink-0 bg-blue-700 text-white hover:bg-blue-800"
              disabled={!legacyFile || importLegacy.isPending}
              onClick={() => legacyFile && importLegacy.mutate(legacyFile)}
            >
              {importLegacy.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar créditos
            </Button>
          </div>
          {legacyResult && (
            <div role="status" className="grid gap-2 sm:grid-cols-2">
              <Signal label="Lojas importadas" value={legacyResult.importedStores} />
              <Signal label="Lançamentos importados" value={legacyResult.importedTransactions} />
            </div>
          )}
        </div>
      )}
      {canManageFinancial && (
        <form
          className="grid gap-3 border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            createAccount.mutate();
          }}
        >
          <Field label="Fornecedor sem conta">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={newAccount.supplierId}
              onChange={(event) => setNewAccount({ ...newAccount, supplierId: event.target.value })}
            >
              <option value="">Selecione</option>
              {[...suppliers.values()]
                .filter(
                  (supplier) =>
                    supplier.active &&
                    !accounts.some((account) => account.supplier_id === supplier.id),
                )
                .map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Saldo inicial">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newAccount.openingBalance}
              onChange={(event) =>
                setNewAccount({ ...newAccount, openingBalance: event.target.value })
              }
              placeholder="0,00"
            />
          </Field>
          <Button type="submit" className="bg-slate-950" disabled={createAccount.isPending}>
            {createAccount.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Criar conta
          </Button>
        </form>
      )}
      <QueryBoundary
        loading={loading}
        error={error}
        empty={!accounts.length && !transactions.length}
        emptyText="Nenhuma conta de crédito ou movimentação cadastrada."
      >
        <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.id} className="border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {suppliers.get(account.supplier_id)?.name ?? "Fornecedor não identificado"}
                </p>
                <p className="mt-2 text-2xl font-black">{money.format(account.current_balance)}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Abertura: {money.format(account.opening_balance)}
                </p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-950 text-[9px] uppercase tracking-wider text-white">
                <tr>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Saldo projetado</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const account = accounts.find((item) => item.id === transaction.account_id);
                  const pending =
                    transaction.status === "pending" || transaction.status === "pendente";
                  return (
                    <tr key={transaction.id} className="border-t border-slate-200">
                      <td className="p-3 font-bold">
                        {account
                          ? (suppliers.get(account.supplier_id)?.name ?? "Sem fornecedor")
                          : "Conta não localizada"}
                      </td>
                      <td className="p-3 uppercase">{transaction.kind}</td>
                      <td className="p-3 font-black">{money.format(transaction.amount)}</td>
                      <td className="p-3">{money.format(transaction.new_balance)}</td>
                      <td className="p-3">
                        <Status value={transaction.status} />
                      </td>
                      <td className="p-3 text-right">
                        {pending && canManageFinancial ? (
                          <Button
                            size="sm"
                            onClick={() => confirm.mutate(transaction.id)}
                            disabled={confirm.isPending}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Confirmar baixa
                          </Button>
                        ) : pending ? (
                          <span className="text-[10px] text-slate-400">Aguardando gestor</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Concluída</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </QueryBoundary>
    </Panel>
  );
}

function DocumentsPanel({
  companyId,
  suppliers,
  documents,
  transactions,
  accounts,
  loading,
  error,
  canManageFinancial,
}: {
  companyId: string;
  suppliers: Supplier[];
  documents: FinancialDocument[];
  transactions: StoreCreditTransaction[];
  accounts: StoreCreditAccount[];
  loading: boolean;
  error: unknown;
  canManageFinancial: boolean;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const currentFileRef = useRef<File | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState<number | null>(null);
  const [parsed, setParsed] = useState<ParsedCommercialDocument>({
    store: null,
    documentNumber: null,
    documentDate: null,
    totalAmount: null,
  });
  const [accountByDocument, setAccountByDocument] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo.");
      const hash = await sha256File(file);
      const path = `${companyId}/financial/${Date.now()}-${safeStorageName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("commercial-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await commercialSupabase.from("financial_documents").insert({
        company_id: companyId,
        supplier_id: supplierId || null,
        file_name: file.name,
        storage_path: path,
        document_hash: hash,
        document_number: parsed.documentNumber,
        document_date: parsed.documentDate,
        total_amount: parsed.totalAmount,
        ocr_text: ocrText || null,
        ocr_confidence: ocrConfidence,
        status: "review",
      });
      if (insertError) {
        await supabase.storage.from("commercial-documents").remove([path]);
        throw insertError;
      }
    },
    onSuccess: async () => {
      toast.success("Documento armazenado com hash SHA-256 e enviado para revisão.");
      currentFileRef.current = null;
      setFile(null);
      setOcrText("");
      setOcrConfidence(null);
      setParsed({ store: null, documentNumber: null, documentDate: null, totalAmount: null });
      await queryClient.invalidateQueries({ queryKey: ["commercial-documents", companyId] });
    },
    onError: (cause) => toast.error(message(cause)),
  });
  const readDocument = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um PDF ou uma imagem.");
      const sourceFile = file;
      setReadingProgress(0);
      const result = await extractDocumentText(sourceFile, setReadingProgress);
      return { result, sourceFile };
    },
    onSuccess: ({ result, sourceFile }) => {
      if (currentFileRef.current !== sourceFile) return;
      setOcrText(result.text);
      setOcrConfidence(result.confidence);
      setParsed(parseCommercialDocument(result.text));
      toast.success(
        result.method === "local_ocr"
          ? "OCR local concluído. Confira todos os campos."
          : "Texto do PDF extraído. Confira todos os campos.",
      );
      setReadingProgress(null);
    },
    onError: (cause) => {
      setReadingProgress(null);
      toast.error(message(cause));
    },
  });
  const preparePurchase = useMutation({
    mutationFn: async ({
      document,
      accountId,
    }: {
      document: FinancialDocument;
      accountId: string;
    }) => {
      if (document.status !== "review") throw new Error("O documento não está em revisão.");
      if (!document.supplier_id || document.total_amount == null || document.total_amount <= 0) {
        throw new Error("O documento precisa de fornecedor e valor positivo.");
      }
      if (!accountId) throw new Error("Selecione a conta de crédito.");
      const { error: rpcError } = await commercialSupabase.rpc("prepare_store_credit_purchase", {
        _account_id: accountId,
        _document_id: document.id,
        _amount: document.total_amount,
        _idempotency_key: document.id,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: async () => {
      toast.success("Baixa preparada. A confirmação final permanece pendente.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["commercial-documents", companyId] }),
        queryClient.invalidateQueries({
          queryKey: ["commercial-credit-transactions", companyId],
        }),
      ]);
    },
    onError: (cause) => toast.error(`Não foi possível preparar a baixa: ${message(cause)}`),
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      {canManageFinancial && (
        <Panel title="Importar nota" icon={Upload}>
          <p className="border-l-2 border-blue-500 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950">
            PDF textual é lido no navegador. Imagens usam OCR local em português. Nenhuma leitura
            movimenta crédito sem preparação e confirmação humana.
          </p>
          <Field label="Arquivo privado (PDF ou imagem)">
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                currentFileRef.current = nextFile;
                setFile(nextFile);
                setSupplierId("");
                setOcrText("");
                setOcrConfidence(null);
                setReadingProgress(null);
                setParsed({
                  store: null,
                  documentNumber: null,
                  documentDate: null,
                  totalAmount: null,
                });
              }}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!file || readDocument.isPending}
            onClick={() => readDocument.mutate()}
          >
            {readDocument.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileScan className="mr-2 h-4 w-4" />
            )}
            {readingProgress == null
              ? "Ler documento"
              : `Lendo ${Math.round(readingProgress * 100)}%`}
          </Button>
          <Field label="Fornecedor">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value="">Não identificado</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Texto OCR / extraído">
            <Textarea
              rows={7}
              value={ocrText}
              onChange={(event) => setOcrText(event.target.value)}
              placeholder="Cole o texto integral da nota..."
            />
          </Field>
          <Button
            variant="outline"
            className="w-full"
            disabled={!ocrText.trim()}
            onClick={() => setParsed(parseCommercialDocument(ocrText))}
          >
            <FileScan className="mr-2 h-4 w-4" />
            Identificar campos no texto
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Loja detectada">
              <Input
                value={parsed.store ?? ""}
                onChange={(event) => setParsed({ ...parsed, store: event.target.value || null })}
              />
            </Field>
            <Field label="Número">
              <Input
                value={parsed.documentNumber ?? ""}
                onChange={(event) =>
                  setParsed({ ...parsed, documentNumber: event.target.value || null })
                }
              />
            </Field>
            <Field label="Data">
              <Input
                type="date"
                value={parsed.documentDate ?? ""}
                onChange={(event) =>
                  setParsed({ ...parsed, documentDate: event.target.value || null })
                }
              />
            </Field>
            <Field label="Valor total">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={parsed.totalAmount ?? ""}
                onChange={(event) =>
                  setParsed({
                    ...parsed,
                    totalAmount: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </Field>
          </div>
          <Button
            className="w-full bg-slate-950"
            disabled={!file || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Enviar e registrar para revisão
          </Button>
        </Panel>
      )}
      <Panel title="Documentos registrados" icon={FileText}>
        <QueryBoundary
          loading={loading}
          error={error}
          empty={!documents.length}
          emptyText="Nenhuma nota ou documento registrado."
        >
          <div className="divide-y divide-slate-200 border border-slate-200">
            {documents.map((document) => (
              <div
                key={document.id}
                className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{document.file_name}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Nota {document.document_number ?? "sem número"} ·{" "}
                    {formatDate(document.document_date)} · SHA-256{" "}
                    {document.document_hash.slice(0, 12)}...
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="font-black">
                    {document.total_amount == null
                      ? "Valor não lido"
                      : money.format(document.total_amount)}
                  </span>
                  <Status value={document.status} />
                  {transactions.some((transaction) => transaction.document_id === document.id) ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      Baixa preparada
                    </Badge>
                  ) : (
                    canManageFinancial &&
                    document.status === "review" &&
                    document.supplier_id &&
                    document.total_amount != null &&
                    document.total_amount > 0 &&
                    (() => {
                      const compatibleAccounts = accounts.filter(
                        (account) => account.supplier_id === document.supplier_id,
                      );
                      const accountId =
                        accountByDocument[document.id] ??
                        (compatibleAccounts.length === 1 ? compatibleAccounts[0]?.id : "") ??
                        "";
                      return (
                        <>
                          <select
                            aria-label={`Conta para ${document.file_name}`}
                            className="h-8 max-w-48 rounded-md border border-slate-200 bg-white px-2 text-xs"
                            value={accountId}
                            onChange={(event) =>
                              setAccountByDocument({
                                ...accountByDocument,
                                [document.id]: event.target.value,
                              })
                            }
                          >
                            <option value="">Selecione a conta</option>
                            {compatibleAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                Saldo {money.format(account.current_balance)}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={!accountId || preparePurchase.isPending}
                            onClick={() => preparePurchase.mutate({ document, accountId })}
                          >
                            Preparar baixa
                          </Button>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            ))}
          </div>
        </QueryBoundary>
      </Panel>
    </div>
  );
}

function ComparisonPanel({
  companyId,
  offers,
  suppliers,
  supplierList,
  documents,
  loading,
  error,
  canManageFinancial,
}: {
  companyId: string;
  offers: SupplierOffer[];
  suppliers: Map<string, Supplier>;
  supplierList: Supplier[];
  documents: FinancialDocument[];
  loading: boolean;
  error: unknown;
  canManageFinancial: boolean;
}) {
  const queryClient = useQueryClient();
  const [demand, setDemand] = useState("1");
  const [offerForm, setOfferForm] = useState({
    supplierId: "",
    documentId: "",
    product: "",
    brand: "",
    unit: "un",
    packageQuantity: "1",
    unitPrice: "",
    shippingCost: "0",
    validUntil: "",
  });
  const createOffer = useMutation({
    mutationFn: async () => {
      const packageQuantity = Number(offerForm.packageQuantity);
      const unitPrice = Number(offerForm.unitPrice);
      const shippingCost = Number(offerForm.shippingCost);
      if (!offerForm.supplierId || !offerForm.product.trim() || !offerForm.unit.trim()) {
        throw new Error("Informe fornecedor, produto e unidade.");
      }
      if (packageQuantity <= 0 || unitPrice < 0 || shippingCost < 0) {
        throw new Error("Revise quantidade, preço e frete.");
      }
      const { error: insertError } = await commercialSupabase.from("supplier_offers").insert({
        company_id: companyId,
        supplier_id: offerForm.supplierId,
        product_name: offerForm.product.trim(),
        normalized_product: offerForm.product.trim().toLocaleLowerCase("pt-BR"),
        brand: offerForm.brand.trim() || null,
        unit: offerForm.unit.trim(),
        package_quantity: packageQuantity,
        unit_price: unitPrice,
        shipping_cost: shippingCost,
        valid_until: offerForm.validUntil || null,
        source_document_id: offerForm.documentId || null,
      });
      if (insertError) throw insertError;
    },
    onSuccess: async () => {
      setOfferForm({
        supplierId: "",
        documentId: "",
        product: "",
        brand: "",
        unit: "un",
        packageQuantity: "1",
        unitPrice: "",
        shippingCost: "0",
        validUntil: "",
      });
      toast.success("Oferta manual cadastrada.");
      await queryClient.invalidateQueries({ queryKey: ["commercial-offers", companyId] });
    },
    onError: (cause) => toast.error(message(cause)),
  });
  const quantity = Math.max(0, Number(demand) || 0);
  const sorted = offers
    .map((offer) => ({
      offer,
      total: Number(offer.unit_price) * quantity + Number(offer.shipping_cost || 0),
    }))
    .sort((a, b) => a.total - b.total);
  return (
    <Panel title="Comparativo por custo atendido" icon={Scale}>
      {canManageFinancial && (
        <form
          className="grid gap-3 border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            createOffer.mutate();
          }}
        >
          <Field label="Fornecedor">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              required
              value={offerForm.supplierId}
              onChange={(event) => setOfferForm({ ...offerForm, supplierId: event.target.value })}
            >
              <option value="">Selecione</option>
              {supplierList
                .filter((item) => item.active)
                .map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Documento fonte opcional">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={offerForm.documentId}
              onChange={(event) => setOfferForm({ ...offerForm, documentId: event.target.value })}
            >
              <option value="">Cadastro manual</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.file_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Produto">
            <Input
              required
              value={offerForm.product}
              onChange={(event) => setOfferForm({ ...offerForm, product: event.target.value })}
            />
          </Field>
          <Field label="Marca">
            <Input
              value={offerForm.brand}
              onChange={(event) => setOfferForm({ ...offerForm, brand: event.target.value })}
            />
          </Field>
          <Field label="Unidade">
            <Input
              required
              value={offerForm.unit}
              onChange={(event) => setOfferForm({ ...offerForm, unit: event.target.value })}
            />
          </Field>
          <Field label="Qtd. por embalagem">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={offerForm.packageQuantity}
              onChange={(event) =>
                setOfferForm({ ...offerForm, packageQuantity: event.target.value })
              }
            />
          </Field>
          <Field label="Preço unitário">
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={offerForm.unitPrice}
              onChange={(event) => setOfferForm({ ...offerForm, unitPrice: event.target.value })}
            />
          </Field>
          <Field label="Frete">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={offerForm.shippingCost}
              onChange={(event) => setOfferForm({ ...offerForm, shippingCost: event.target.value })}
            />
          </Field>
          <Field label="Validade">
            <Input
              type="date"
              value={offerForm.validUntil}
              onChange={(event) => setOfferForm({ ...offerForm, validUntil: event.target.value })}
            />
          </Field>
          <Button type="submit" className="self-end bg-slate-950" disabled={createOffer.isPending}>
            {createOffer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar oferta
          </Button>
        </form>
      )}
      <div className="flex flex-col gap-2 border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase">Cálculo transparente</p>
          <p className="mt-1 text-xs text-slate-500">
            Preço unitário × demanda + frete. Embalagens não são arredondadas automaticamente.
          </p>
        </div>
        <Field label="Demanda">
          <Input
            className="w-full sm:w-40"
            type="number"
            min="0"
            step="1"
            value={demand}
            onChange={(event) => setDemand(event.target.value)}
          />
        </Field>
      </div>
      <QueryBoundary
        loading={loading}
        error={error}
        empty={!offers.length}
        emptyText="Nenhuma oferta de fornecedor disponível para comparação."
      >
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-950 text-[9px] uppercase tracking-wider text-white">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Preço / unidade</th>
                <th className="p-3">Frete</th>
                <th className="p-3">Total</th>
                <th className="p-3">Fonte</th>
                <th className="p-3">Validade</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ offer, total }, index) => (
                <tr key={offer.id} className="border-t border-slate-200">
                  <td className="p-3 font-black">
                    {offer.product_name}
                    <span className="block text-[10px] font-normal text-slate-500">
                      {offer.brand ?? "Sem marca"} · {offer.unit}
                    </span>
                  </td>
                  <td className="p-3">
                    {suppliers.get(offer.supplier_id)?.name ?? "Não identificado"}
                  </td>
                  <td className="p-3">{money.format(offer.unit_price)}</td>
                  <td className="p-3">{money.format(offer.shipping_cost)}</td>
                  <td className="p-3 font-black">
                    {money.format(total)}
                    {index === 0 && (
                      <Badge className="ml-2 bg-lime-200 text-slate-950">Menor</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    {documents.find((item) => item.id === offer.source_document_id)?.file_name ??
                      "Cadastro manual / sem documento"}
                  </td>
                  <td className="p-3">{formatDate(offer.valid_until)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryBoundary>
    </Panel>
  );
}

function SuppliersPanel({
  companyId,
  suppliers,
  loading,
  error,
  canManageFinancial,
}: {
  companyId: string;
  suppliers: Supplier[];
  loading: boolean;
  error: unknown;
  canManageFinancial: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", contact: "", whatsapp: "" });
  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe a razão ou nome do fornecedor.");
      const { error: insertError } = await commercialSupabase.from("suppliers").insert({
        company_id: companyId,
        name: form.name.trim(),
        contact_name: form.contact.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        active: true,
      });
      if (insertError) throw insertError;
    },
    onSuccess: async () => {
      setForm({ name: "", contact: "", whatsapp: "" });
      toast.success("Fornecedor cadastrado.");
      await queryClient.invalidateQueries({ queryKey: ["commercial-suppliers", companyId] });
    },
    onError: (cause) => toast.error(message(cause)),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      {canManageFinancial && (
        <Panel title="Novo fornecedor" icon={Plus}>
          <form className="space-y-3" onSubmit={submit}>
            <Field label="Nome">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Contato">
              <Input
                value={form.contact}
                onChange={(event) => setForm({ ...form, contact: event.target.value })}
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                type="tel"
                value={form.whatsapp}
                onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                placeholder="Somente cadastro, sem disparo"
              />
            </Field>
            <Button className="w-full bg-slate-950" disabled={add.isPending}>
              {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar
            </Button>
          </form>
        </Panel>
      )}
      <Panel title="Rede de fornecedores" icon={Building2}>
        <QueryBoundary
          loading={loading}
          error={error}
          empty={!suppliers.length}
          emptyText="Nenhum fornecedor cadastrado."
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} className="rounded-none shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black">{supplier.name}</p>
                    <Status value={supplier.active ? "ativo" : "inativo"} />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {supplier.contact_name ?? "Contato não informado"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {supplier.whatsapp ?? "WhatsApp não informado"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </QueryBoundary>
      </Panel>
    </div>
  );
}

function OutsourcingPanel({
  companyId,
  userId,
  orders,
  suppliers,
  projects,
  projectList,
  xmlFiles,
  canCreate,
  canSendWhatsApp,
  loading,
  error,
}: {
  companyId: string;
  userId: string;
  orders: OutsourcingOrder[];
  suppliers: Map<string, Supplier>;
  projects: Map<string, CommercialProject>;
  projectList: CommercialProject[];
  xmlFiles: ProjectXmlFile[];
  canCreate: boolean;
  canSendWhatsApp: boolean;
  loading: boolean;
  error: unknown;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    orderNumber: "",
    projectId: "",
    supplierId: "",
    xmlFileId: "",
    freightAmount: "0",
    dueDate: "",
    messageText: "",
  });
  const createOrder = useMutation({
    mutationFn: async () => {
      const freightAmount = Number(form.freightAmount);
      if (
        !form.orderNumber.trim() ||
        !form.projectId ||
        !form.supplierId ||
        !form.xmlFileId ||
        !form.messageText.trim()
      ) {
        throw new Error("Preencha ordem, projeto, fornecedor, XML e mensagem.");
      }
      if (!Number.isFinite(freightAmount) || freightAmount < 0) {
        throw new Error("Informe um frete válido.");
      }
      const selectedXml = xmlFiles.find(
        (file) => file.id === form.xmlFileId && file.project_id === form.projectId,
      );
      if (!selectedXml) throw new Error("O XML selecionado não pertence ao projeto.");
      const { error: insertError } = await commercialSupabase.from("outsourcing_orders").insert({
        company_id: companyId,
        project_id: form.projectId,
        supplier_id: form.supplierId,
        xml_file_id: form.xmlFileId,
        order_number: form.orderNumber.trim(),
        freight_amount: freightAmount,
        requested_due_date: form.dueDate || null,
        message_text: form.messageText.trim(),
        created_by: userId,
        status: "draft",
        sent_at: null,
      });
      if (insertError) throw insertError;
    },
    onSuccess: async () => {
      setForm({
        orderNumber: "",
        projectId: "",
        supplierId: "",
        xmlFileId: "",
        freightAmount: "0",
        dueDate: "",
        messageText: "",
      });
      toast.success("Rascunho da ordem criado. O envio continua separado.");
      await queryClient.invalidateQueries({ queryKey: ["commercial-outsourcing", companyId] });
    },
    onError: (cause) => toast.error(message(cause)),
  });
  const sendWhatsApp = useMutation({
    mutationFn: async (orderId: string) => {
      await sendOutsourcingOrderWhatsApp({ data: { orderId } });
    },
    onSuccess: async () => {
      toast.success("XML enviado pelo WhatsApp e ordem atualizada.");
      await queryClient.invalidateQueries({ queryKey: ["commercial-outsourcing", companyId] });
    },
    onError: (cause) => toast.error(message(cause)),
  });
  const projectXmlFiles = xmlFiles.filter((file) => file.project_id === form.projectId);

  return (
    <Panel title="Ordens de terceirização" icon={Truck}>
      <div className="border-l-2 border-amber-500 bg-amber-50 p-3 text-xs text-amber-950">
        A ordem nasce como rascunho. O XML só é enviado ao acionar a integração do servidor; falhas
        de configuração ou do provedor não são tratadas como sucesso.
      </div>
      {canCreate && (
        <form
          className="grid gap-3 border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            createOrder.mutate();
          }}
        >
          <Field label="Número da ordem">
            <Input
              required
              value={form.orderNumber}
              onChange={(event) => setForm({ ...form, orderNumber: event.target.value })}
              placeholder="TER-0001"
            />
          </Field>
          <Field label="Projeto">
            <select
              required
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.projectId}
              onChange={(event) =>
                setForm({ ...form, projectId: event.target.value, xmlFileId: "" })
              }
            >
              <option value="">Selecione</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fornecedor">
            <select
              required
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.supplierId}
              onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
            >
              <option value="">Selecione</option>
              {[...suppliers.values()]
                .filter((item) => item.active)
                .map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="XML oficial do projeto">
            <select
              required
              disabled={!form.projectId || !projectXmlFiles.length}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"
              value={form.xmlFileId}
              onChange={(event) => setForm({ ...form, xmlFileId: event.target.value })}
            >
              <option value="">
                {form.projectId && !projectXmlFiles.length ? "Projeto sem XML" : "Selecione"}
              </option>
              {projectXmlFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.file_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frete">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.freightAmount}
              onChange={(event) => setForm({ ...form, freightAmount: event.target.value })}
            />
          </Field>
          <Field label="Prazo solicitado">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>
          <div className="sm:col-span-2 xl:col-span-4">
            <Field label="Mensagem para envio futuro">
              <Textarea
                required
                rows={4}
                value={form.messageText}
                onChange={(event) => setForm({ ...form, messageText: event.target.value })}
                placeholder="Mensagem registrada, mas não enviada por esta tela."
              />
            </Field>
          </div>
          <Button
            type="submit"
            className="bg-slate-950 sm:col-span-2 xl:col-span-1"
            disabled={createOrder.isPending}
          >
            {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar ordem
          </Button>
        </form>
      )}
      <QueryBoundary
        loading={loading}
        error={error}
        empty={!orders.length}
        emptyText="Nenhuma ordem de terceirização cadastrada."
      >
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-950 text-[9px] uppercase tracking-wider text-white">
              <tr>
                <th className="p-3">Ordem</th>
                <th className="p-3">Projeto</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">XML / mensagem</th>
                <th className="p-3">Contato</th>
                <th className="p-3">Prazo</th>
                <th className="p-3">Frete</th>
                <th className="p-3">Status</th>
                {canSendWhatsApp && <th className="p-3 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const supplier = suppliers.get(order.supplier_id);
                const canSendOrder =
                  canSendWhatsApp &&
                  ["draft", "reviewed"].includes(order.status) &&
                  Boolean(supplier?.whatsapp) &&
                  Boolean(order.xml_file_id);
                return (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="p-3 font-black">{order.order_number}</td>
                    <td className="p-3">
                      {order.project_id
                        ? (projects.get(order.project_id)?.name ?? "Projeto não localizado")
                        : "Sem projeto"}
                    </td>
                    <td className="p-3">{supplier?.name ?? "Não identificado"}</td>
                    <td className="p-3">
                      {xmlFiles.find((file) => file.id === order.xml_file_id)?.file_name ??
                        "XML não localizado"}
                      <span className="mt-1 block max-w-64 truncate text-[10px] text-slate-500">
                        {order.message_text ?? "Sem mensagem registrada"}
                      </span>
                    </td>
                    <td className="p-3">{supplier?.whatsapp ?? "Não informado"}</td>
                    <td className="p-3">{formatDate(order.requested_due_date)}</td>
                    <td className="p-3">{money.format(order.freight_amount)}</td>
                    <td className="p-3">
                      <Status value={order.status} />
                    </td>
                    {canSendWhatsApp && (
                      <td className="p-3 text-right">
                        {canSendOrder ? (
                          <Button
                            size="sm"
                            disabled={sendWhatsApp.isPending}
                            onClick={() => sendWhatsApp.mutate(order.id)}
                          >
                            {sendWhatsApp.isPending && sendWhatsApp.variables === order.id ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-3.5 w-3.5" />
                            )}
                            Enviar XML pelo WhatsApp
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Envio indisponível</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </QueryBoundary>
    </Panel>
  );
}

function BoardsPanel({
  companyId,
  projects,
  sessions,
  loading,
  error,
  canCreate,
}: {
  companyId: string;
  projects: CommercialProject[];
  sessions: VisualAnalysisSession[];
  loading: boolean;
  error: unknown;
  canCreate: boolean;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um PDF ou imagem.");
      if (!notes.trim()) throw new Error("Descreva o objetivo ou observações da prancha.");
      const path = `${companyId}/boards/${Date.now()}-${safeStorageName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("commercial-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await commercialSupabase
        .from("visual_analysis_sessions")
        .insert({
          company_id: companyId,
          project_id: projectId || null,
          file_name: file.name,
          storage_path: path,
          purpose: notes.trim(),
          status: "uploaded",
          method: "COMERCIAL_ONLY",
          created_at: new Date().toISOString(),
        });
      if (insertError) {
        await supabase.storage.from("commercial-documents").remove([path]);
        throw insertError;
      }
    },
    onSuccess: async () => {
      setFile(null);
      setNotes("");
      toast.success("Prancha registrada para análise comercial.");
      await queryClient.invalidateQueries({ queryKey: ["commercial-visual-sessions", companyId] });
    },
    onError: (cause) => toast.error(message(cause)),
  });
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 border-2 border-fuchsia-300 bg-fuchsia-50 p-4 text-fuchsia-950">
        <PanelsTopLeft className="h-5 w-5 shrink-0" />
        <div>
          <Badge className="mb-2 bg-fuchsia-700 text-white">COMERCIAL_ONLY</Badge>
          <p className="text-xs leading-relaxed">
            BETA para leitura visual e observações comerciais. Não valida engenharia, não libera
            produção e não chama gates de corte ou CNC.
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        {canCreate && (
          <Panel title="Nova prancha BETA" icon={Upload}>
            <Field label="PDF ou imagem">
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="Projeto opcional">
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">Sem vínculo</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Objetivo / observações">
              <Textarea
                rows={6}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="O que deve ser observado comercialmente?"
              />
            </Field>
            <Button
              className="w-full bg-slate-950"
              disabled={!file || upload.isPending}
              onClick={() => upload.mutate()}
            >
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Registrar prancha
            </Button>
          </Panel>
        )}
        <Panel title="Sessões comerciais" icon={PanelsTopLeft}>
          <QueryBoundary
            loading={loading}
            error={error}
            empty={!sessions.length}
            emptyText="Nenhuma prancha enviada para análise comercial."
          >
            <div className="divide-y divide-slate-200 border border-slate-200">
              {sessions.map((session) => (
                <div key={session.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black">{session.file_name}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{session.method}</Badge>
                      <Status value={session.status} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{session.purpose}</p>
                </div>
              ))}
            </div>
          </QueryBoundary>
        </Panel>
      </div>
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="min-w-32 bg-slate-900 p-3">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${alert ? "text-amber-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
function SummaryCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="rounded-none shadow-none">
      <CardContent className="flex items-end justify-between p-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black">{loading ? "--" : value}</p>
        </div>
        <Icon className="h-5 w-5 text-slate-300" />
      </CardContent>
    </Card>
  );
}
function Signal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border border-slate-200 bg-slate-50 p-3">
      <span className="text-xs font-bold">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}
function Tab({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: typeof Building2;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-11 rounded-none px-3 text-[9px] font-black uppercase tracking-wider data-[state=active]:bg-slate-950 data-[state=active]:text-white"
    >
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </TabsTrigger>
  );
}
function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 p-3">
        <span className="grid h-9 w-9 place-items-center bg-slate-950 text-lime-400">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-black uppercase tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3 p-3 sm:p-4">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </Label>
      {children}
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className="whitespace-nowrap rounded-sm text-[8px] font-black uppercase tracking-wider"
    >
      {value}
    </Badge>
  );
}
function QueryBoundary({
  loading,
  error,
  empty,
  emptyText,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Consultando dados comerciais
      </div>
    );
  if (error)
    return (
      <div className="border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
        <p className="font-black uppercase">Fonte indisponível</p>
        <p className="mt-1">{message(error)}</p>
      </div>
    );
  if (empty)
    return (
      <div className="border border-dashed border-slate-300 p-10 text-center">
        <PackageSearch className="mx-auto mb-3 h-7 w-7 text-slate-300" />
        <p className="text-xs text-slate-500">{emptyText}</p>
      </div>
    );
  return children;
}
