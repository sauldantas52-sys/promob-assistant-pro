import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Cloud,
  Factory,
  FileText,
  FolderOpen,
  Loader2,
  Scissors,
  ServerOff,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { parseProjectFile } from "@/lib/promob-import";
import { parseDXF } from "@/lib/dxf-parser";
import { cn } from "@/lib/utils";

type ClassifiedFolder = {
  xml: File | null;
  cotas: File | null;
  listaCompra: File | null;
  listaCorte: File | null;
  previewCorte: File | null;
  image: File | null;
  dxf: File | null;
  xmk: File | null;
};

const emptyClassification: ClassifiedFolder = {
  xml: null,
  cotas: null,
  listaCompra: null,
  listaCorte: null,
  previewCorte: null,
  image: null,
  dxf: null,
  xmk: null,
};

function normalizedFileName(file: File) {
  return file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function classifyFolder(selectedFiles: File[]): ClassifiedFolder {
  const find = (predicate: (file: File, normalized: string) => boolean) =>
    selectedFiles.find((file) => predicate(file, normalizedFileName(file))) ?? null;
  const isPdf = (file: File) => file.name.toLowerCase().endsWith(".pdf");

  return {
    xml: find((file) => file.name.toLowerCase().endsWith(".xml")),
    cotas: find((file, normalized) => isPdf(file) && normalized.includes("cotas")),
    listaCompra: find((file, normalized) => isPdf(file) && normalized.includes("listacompra")),
    listaCorte: find((file, normalized) => isPdf(file) && normalized.includes("listacorte")),
    previewCorte: find((file, normalized) => isPdf(file) && normalized.includes("previewcorte")),
    image: find((file) => /\.(jpe?g|png|webp)$/i.test(file.name)),
    dxf: find((file) => file.name.toLowerCase().endsWith(".dxf")),
    xmk: find((file) => file.name.toLowerCase().endsWith(".xmk")),
  };
}

function parseFolderIdentity(folderName: string) {
  const dateMatch = folderName.match(/(?:^|[^0-9])(\d{2}-\d{2}-\d{4})(?![0-9])/);
  const date = dateMatch?.[1] ?? "";
  const dateParts = date.split("-").map(Number);
  const day = dateParts[0] ?? 0;
  const month = dateParts[1] ?? 0;
  const year = dateParts[2] ?? 0;
  const parsedDate = date ? new Date(Date.UTC(year, month - 1, day)) : null;
  const validDate =
    !!parsedDate &&
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;
  const client = (date ? folderName.replace(date, "") : folderName)
    .replace(/^pasta[\s_.-]+do[\s_.-]+cliente[\s_.-]*/i, "")
    .replace(/^[\s_.-]+|[\s_.-]+$/g, "")
    .replace(/_+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { client, date: validDate ? date : "", hasValidIdentity: validDate && client.length > 0 };
}

export const Route = createFileRoute("/_authenticated/projects/import")({
  head: () => ({
    meta: [
      { title: "Nova Importação | Monta AI — Industrial 4.0" },
      {
        name: "description",
        content: "Assistente de importação de projetos Promob para produção industrial.",
      },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const navigate = useNavigate();
  const { companyId, role } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState({ name: "", client: "", env: "", notes: "" });
  const [files, setFiles] = useState<{ xml: File | null; dxf: File | null; pdf: File | null }>({
    xml: null,
    dxf: null,
    pdf: null,
  });
  const [folderName, setFolderName] = useState("");
  const [folderFileCount, setFolderFileCount] = useState(0);
  const [classification, setClassification] = useState<ClassifiedFolder>(emptyClassification);
  const [destination, setDestination] = useState<"cutplanning" | "factory" | null>(null);

  const identity = parseFolderIdentity(folderName);
  const requiredFiles = [
    { label: "XML Promob", file: classification.xml },
    { label: "COTAS PDF", file: classification.cotas },
    { label: "ListaCompra PDF", file: classification.listaCompra },
    { label: "ListaCorte PDF", file: classification.listaCorte },
    { label: "PreviewCorte PDF", file: classification.previewCorte },
    { label: "Imagem", file: classification.image },
    { label: "DXF", file: classification.dxf },
  ];
  const hasRequiredFiles = requiredFiles.every((item) => !!item.file);
  const intakeReady =
    folderFileCount > 0 &&
    identity.hasValidIdentity &&
    hasRequiredFiles &&
    !!destination &&
    !!files.xml;

  function handleFolderSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const rootNames = new Set(
      selectedFiles
        .map((file) => file.webkitRelativePath.split("/")[0])
        .filter((name): name is string => !!name),
    );
    const rootName = rootNames.size === 1 ? (Array.from(rootNames)[0] ?? "") : "";
    const nextClassification = classifyFolder(selectedFiles);
    const nextIdentity = parseFolderIdentity(rootName);

    setFolderName(rootName);
    setFolderFileCount(selectedFiles.length);
    setClassification(nextClassification);
    setFiles({
      xml: nextClassification.xml,
      dxf: nextClassification.dxf,
      pdf: nextClassification.cotas,
    });
    setData((current) => ({
      ...current,
      name: rootName,
      client: nextIdentity.client,
    }));
  }

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada.");
      if (!hasPermission(role, "projects", "import"))
        throw new Error("Seu perfil não possui permissão para importar projetos.");
      if (!files.xml) throw new Error("O arquivo XML é obrigatório.");
      if (!intakeReady || !destination)
        throw new Error(
          "A Pasta do Cliente não passou pela pré-validação de nomes e arquivos obrigatórios.",
        );

      setIsProcessing(true);

      // Parse before persistence so malformed XML never creates a partial project.
      const result = await parseProjectFile(files.xml);
      const dxfFile = classification.dxf;
      if (!dxfFile) throw new Error("O arquivo DXF é obrigatório.");
      const dxfGeometry = parseDXF(await dxfFile.text());
      if (dxfGeometry.length === 0)
        throw new Error("O DXF obrigatório não contém geometria reconhecível.");

      const projectId = crypto.randomUUID();
      const packageCandidates: Array<{
        file: File | null;
        type: string;
        summary: Json;
      }> = [
        {
          file: files.xml,
          type: "xml",
          summary: {
            modules: result.modules.length,
            parts:
              result.modules.reduce((total, module) => total + module.parts.length, 0) +
              result.looseParts.length,
            looseParts: result.looseParts.length,
            warnings: result.warnings,
          },
        },
        { file: classification.cotas, type: "cotas_pdf", summary: { source: "pasta_cliente" } },
        {
          file: classification.listaCompra,
          type: "lista_compra_pdf",
          summary: { source: "pasta_cliente" },
        },
        {
          file: classification.listaCorte,
          type: "lista_corte_pdf",
          summary: { source: "pasta_cliente" },
        },
        {
          file: classification.previewCorte,
          type: "preview_corte_pdf",
          summary: { source: "pasta_cliente" },
        },
        {
          file: classification.image,
          type: "imagem_referencia",
          summary: { source: "pasta_cliente" },
        },
        {
          file: classification.dxf,
          type: "dxf_conferencia",
          summary: { source: "pasta_cliente", entities: dxfGeometry.length },
        },
        {
          file: classification.xmk,
          type: "xmk_identidade_opcional",
          summary: { source: "pasta_cliente", format_status: "unconfirmed" },
        },
      ];
      const packageFiles = packageCandidates.filter(
        (item): item is { file: File; type: string; summary: Json } => item.file !== null,
      );
      const preparedFiles = packageFiles.map((item) => {
        const safeName = item.file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        return {
          ...item,
          storagePath: `${companyId}/${projectId}/${crypto.randomUUID()}-${safeName}`,
        };
      });
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sessão expirada. Entre novamente antes de importar.");
      const { error: sessionError } = await supabase.from("project_import_sessions").insert({
        id: projectId,
        company_id: companyId,
        step: "uploading",
        files: preparedFiles.map((item) => item.storagePath),
        status: "uploading",
      });
      if (sessionError) throw sessionError;

      let rpcAttempted = false;
      try {
        const storedFiles = [];
        for (const item of preparedFiles) {
          const { error: uploadError } = await supabase.storage
            .from("project-files")
            .upload(item.storagePath, item.file, {
              contentType: item.file.type || "application/octet-stream",
              upsert: false,
            });
          if (uploadError) throw uploadError;
          storedFiles.push({
            file_name: item.file.name,
            file_type: item.type,
            size_bytes: item.file.size,
            storage_path: item.storagePath,
            summary: item.summary,
          });
        }

        const modulesPayload = result.modules.map((module) => ({
          name: module.name,
          environment: module.environment ?? null,
          width_mm: module.width_mm ?? null,
          height_mm: module.height_mm ?? null,
          depth_mm: module.depth_mm ?? null,
          quantity: module.quantity,
          parts: module.parts.map((part) => ({
            kind: part.kind,
            name: part.name,
            material: part.material ?? null,
            thickness_mm: part.thickness_mm ?? null,
            width_mm: part.width_mm ?? null,
            length_mm: part.length_mm ?? null,
            quantity: part.quantity,
            unit: part.unit ?? "un",
            edge_banding: part.edge_banding ?? null,
          })),
        }));
        const loosePartsPayload = result.looseParts.map((part) => ({
          kind: part.kind,
          name: part.name,
          material: part.material ?? null,
          thickness_mm: part.thickness_mm ?? null,
          width_mm: part.width_mm ?? null,
          length_mm: part.length_mm ?? null,
          quantity: part.quantity,
          unit: part.unit ?? "un",
          edge_banding: part.edge_banding ?? null,
        }));

        rpcAttempted = true;
        const { data: importedProjectId, error: importError } = await supabase.rpc(
          "import_client_project",
          {
            _project_id: projectId,
            _project: {
              name: data.name || files.xml.name.replace(/\.xml$/i, ""),
              client_name: data.client,
              environment: data.env,
              notes:
                destination === "cutplanning"
                  ? "Destino de produção: CutPlanning (terceirização)"
                  : "Destino de produção: fábrica própria",
            },
            _files: storedFiles,
            _modules: modulesPayload,
            _loose_parts: loosePartsPayload,
          },
        );
        if (importError) throw importError;
        return importedProjectId;
      } catch (error) {
        if (rpcAttempted) {
          const { data: committedProject, error: verificationError } = await supabase
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .maybeSingle();
          if (committedProject) return committedProject.id;
          const { error: trackingError } = await supabase.rpc("mark_import_cleanup_required", {
            _session_id: projectId,
          });
          if (trackingError) {
            throw new Error(
              "Estado da importação indeterminado e a reconciliação não pôde ser confirmada. Não reenvie a pasta; solicite auditoria técnica.",
            );
          }
          const { data: reconciledProject, error: reconciliationError } = await supabase
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .maybeSingle();
          if (reconciledProject) return reconciledProject.id;
          throw new Error(
            verificationError || reconciliationError
              ? "Estado da importação indeterminado por falha de rede. Os arquivos foram preservados e a sessão foi marcada para reconciliação."
              : `${error instanceof Error ? error.message : "Falha na importação."} Os arquivos foram preservados para reconciliação.`,
          );
        }

        let cleanupFailed = false;
        if (preparedFiles.length > 0) {
          const { error: cleanupError } = await supabase.storage
            .from("project-files")
            .remove(preparedFiles.map((item) => item.storagePath));
          cleanupFailed = !!cleanupError;
        }
        if (cleanupFailed) {
          const { error: trackingError } = await supabase.rpc("mark_import_cleanup_required", {
            _session_id: projectId,
          });
          if (trackingError)
            throw new Error(
              "Falha na importação e não foi possível confirmar a reconciliação dos arquivos.",
            );
          throw new Error(
            `${error instanceof Error ? error.message : "Falha na importação."} Limpeza automática pendente para auditoria.`,
          );
        }
        const { error: discardError } = await supabase.rpc("discard_import_session", {
          _session_id: projectId,
        });
        if (discardError)
          throw new Error(
            `${error instanceof Error ? error.message : "Falha na importação."} Arquivos removidos, mas a sessão residual exige auditoria.`,
          );
        throw error;
      }
    },
    onSuccess: (projectId) => {
      toast.success("Projeto importado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro na importação.");
      setIsProcessing(false);
    },
  });

  if (!hasPermission(role, "projects", "import")) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl p-5 sm:p-8">
          <Card className="border-red-200 bg-red-50 shadow-none">
            <CardContent className="flex items-start gap-3 p-5 text-red-900">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <div>
                <h1 className="text-sm font-black uppercase">Acesso bloqueado</h1>
                <p className="mt-1 text-xs">
                  Seu perfil não possui permissão para receber a Pasta do Cliente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-5 px-3 py-4 sm:px-5 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <header className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/projects" })}
            className="-ml-3 mb-5 h-8 gap-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 hover:bg-slate-900 hover:text-lime-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Projetos
          </Button>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="mb-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-lime-300">
                <span className="h-px w-8 bg-lime-300" /> Entrada técnica / 01
              </p>
              <h1 className="text-3xl font-black uppercase leading-none tracking-[-0.05em] sm:text-4xl lg:text-5xl">
                Pasta do Cliente
              </h1>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                Selecione a pasta raiz completa. O pacote só avança quando identidade e documentos
                obrigatórios forem localizados.
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-3 rounded-md border px-4 py-3",
                intakeReady ? "border-lime-300/50 bg-lime-300/10" : "border-slate-700 bg-slate-900",
              )}
            >
              {intakeReady ? (
                <Check className="h-5 w-5 text-lime-300" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-slate-500" />
              )}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                  Pré-validação local
                </p>
                <p
                  className={cn(
                    "text-xs font-black uppercase",
                    intakeReady ? "text-lime-300" : "text-slate-300",
                  )}
                >
                  {intakeReady ? "Nomes obrigatórios localizados" : "Aguardando arquivos"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
          <main className="min-w-0 space-y-5">
            <Card className="overflow-hidden rounded-lg border-slate-200 shadow-none">
              <CardContent className="p-0">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-slate-950 font-mono text-[10px] font-black text-lime-300">
                      01
                    </span>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-950">
                        Origem dos arquivos
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Leitura local pelo navegador. Nenhum arquivo é enviado nesta etapa de
                        seleção.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
                  <label className="group relative flex min-h-40 cursor-pointer flex-col justify-between overflow-hidden rounded-md border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-lime-500 hover:bg-lime-50/40 sm:p-5">
                    <input
                      type="file"
                      multiple
                      className="absolute inset-0 cursor-pointer opacity-0"
                      ref={(input) => {
                        if (input) {
                          input.setAttribute("webkitdirectory", "");
                          input.setAttribute("directory", "");
                        }
                      }}
                      onChange={handleFolderSelection}
                    />
                    <FolderOpen className="h-8 w-8 text-slate-950 group-hover:text-lime-700" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-slate-950">
                        {folderName || "Selecionar pasta raiz"}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        {folderFileCount
                          ? `${folderFileCount} arquivos lidos`
                          : "webkitdirectory / acesso local"}
                      </p>
                    </div>
                  </label>
                  <div className="flex min-h-40 flex-col justify-between rounded-md border border-slate-200 bg-slate-100 p-4 text-slate-500 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Cloud className="h-8 w-8" />
                      <span className="rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800">
                        Não conectado
                      </span>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black uppercase text-slate-700">
                        <ServerOff className="h-4 w-4" /> Inbox na nuvem
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase leading-relaxed tracking-[0.1em] text-slate-400">
                        Configuração pendente. Não há monitoramento ou sincronização ativa.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-lg border-slate-200 shadow-none">
              <CardContent className="p-0">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-slate-950 font-mono text-[10px] font-black text-lime-300">
                      02
                    </span>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-950">
                        Identidade da pasta
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        A raiz deve conter o cliente e uma data válida no padrão DD-MM-YYYY.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                      Cliente extraído
                    </Label>
                    <div
                      className={cn(
                        "min-h-11 break-words rounded-md border px-3 py-3 text-xs font-bold",
                        identity.client
                          ? "border-slate-200 bg-slate-50 text-slate-900"
                          : "border-red-200 bg-red-50 text-red-700",
                      )}
                    >
                      {identity.client || "Cliente ausente no nome da pasta"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                      Data de referência
                    </Label>
                    <div
                      className={cn(
                        "min-h-11 rounded-md border px-3 py-3 font-mono text-xs font-bold",
                        identity.date
                          ? "border-slate-200 bg-slate-50 text-slate-900"
                          : "border-red-200 bg-red-50 text-red-700",
                      )}
                    >
                      {identity.date || "DD-MM-YYYY ausente ou inválida"}
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="environment-import"
                      className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400"
                    >
                      Ambiente principal / opcional
                    </Label>
                    <Input
                      id="environment-import"
                      placeholder="Ex.: Cozinha, dormitório 01"
                      value={data.env}
                      onChange={(event) => setData({ ...data, env: event.target.value })}
                      className="h-11 rounded-md border-slate-200 bg-white text-xs font-bold focus-visible:ring-lime-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-lg border-slate-200 shadow-none">
              <CardContent className="p-0">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-slate-950 font-mono text-[10px] font-black text-lime-300">
                      03
                    </span>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-950">
                        Destino de produção
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Escolha obrigatória registrada nas observações do projeto.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                  <button
                    type="button"
                    onClick={() => setDestination("cutplanning")}
                    className={cn(
                      "flex min-h-24 items-center gap-4 rounded-md border p-4 text-left transition-colors",
                      destination === "cutplanning"
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-400",
                    )}
                  >
                    <Scissors
                      className={cn(
                        "h-6 w-6 shrink-0",
                        destination === "cutplanning" ? "text-lime-300" : "text-slate-400",
                      )}
                    />
                    <span>
                      <strong className="block text-xs font-black uppercase">CutPlanning</strong>
                      <small className="mt-1 block text-[10px] font-bold uppercase tracking-wider opacity-60">
                        Terceirização
                      </small>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestination("factory")}
                    className={cn(
                      "flex min-h-24 items-center gap-4 rounded-md border p-4 text-left transition-colors",
                      destination === "factory"
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-400",
                    )}
                  >
                    <Factory
                      className={cn(
                        "h-6 w-6 shrink-0",
                        destination === "factory" ? "text-lime-300" : "text-slate-400",
                      )}
                    />
                    <span>
                      <strong className="block text-xs font-black uppercase">
                        Fábrica própria
                      </strong>
                      <small className="mt-1 block text-[10px] font-bold uppercase tracking-wider opacity-60">
                        Produção interna
                      </small>
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </main>

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-5 lg:self-start">
            <Card className="overflow-hidden rounded-lg border-slate-800 bg-slate-950 text-white shadow-none">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight">
                      Checklist do pacote
                    </h2>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Falha fechada / 7 obrigatórios
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-lime-300" />
                </div>
                <div className="divide-y divide-slate-800">
                  {requiredFiles.map((item) => (
                    <div
                      key={item.label}
                      className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm",
                          item.file ? "bg-lime-300 text-slate-950" : "bg-slate-800 text-slate-500",
                        )}
                      >
                        {item.file ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                          {item.label}
                        </p>
                        <p
                          className={cn(
                            "truncate text-[10px]",
                            item.file ? "text-lime-300" : "text-slate-600",
                          )}
                        >
                          {item.file?.name || "Não localizado"}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm",
                        classification.xmk
                          ? "bg-slate-700 text-lime-300"
                          : "bg-slate-900 text-slate-600",
                      )}
                    >
                      {classification.xmk ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <span className="font-mono text-[9px]">+</span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                        XMK / opcional
                      </p>
                      <p className="truncate text-[10px] text-slate-600">
                        {classification.xmk?.name || "Identidade suplementar não localizada"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!intakeReady && folderFileCount > 0 && (
              <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider">
                    Criação bloqueada
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    Corrija o nome da pasta, inclua todos os arquivos obrigatórios e selecione o
                    destino de produção.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Projeto
                  </p>
                  <p className="mt-1 truncate font-black text-slate-950">
                    {data.name || "Não identificado"}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Usinagem
                  </p>
                  <p className="mt-1 font-black text-slate-950">Bloqueada</p>
                </div>
              </div>
              {isProcessing && (
                <div className="mb-3 flex items-center gap-2 rounded-md bg-slate-100 p-3 text-[10px] font-black uppercase tracking-wider text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processando XML Promob
                </div>
              )}
              <Button
                onClick={() => createProjectMutation.mutate()}
                disabled={!intakeReady || isProcessing}
                className="h-12 w-full gap-2 rounded-md bg-lime-300 text-[10px] font-black uppercase tracking-[0.13em] text-slate-950 hover:bg-lime-200 disabled:bg-slate-200 disabled:text-slate-500"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}{" "}
                Criar projeto bloqueado
              </Button>
              <p className="mt-3 text-center text-[9px] font-bold uppercase leading-relaxed tracking-[0.1em] text-slate-400">
                O XML será processado pela rotina existente. machining_blocked permanece true.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
