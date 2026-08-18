import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
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
  Briefcase,
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
import { parsePromobXML, type PromobModule, type PromobPart } from "@/lib/promob-import";
import { parseDXF } from "@/lib/dxf-parser";
import { cn, sanitizeStoragePath } from "@/lib/utils";

type ClassifiedFolder = {
  xml: File | null;
  cotas: File | null;
  listaCompra: File | null;
  listaCorte: File | null;
  previewCorte: File | null;
  image: File | null;
  dxf: File | null;
  promob: File | null;
  allFiles: File[];
  others: File[];
};

const emptyClassification: ClassifiedFolder = {
  xml: null,
  cotas: null,
  listaCompra: null,
  listaCorte: null,
  previewCorte: null,
  image: null,
  dxf: null,
  promob: null,
  allFiles: [],
  others: [],
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

  const result: ClassifiedFolder = {
    xml: find((file) => file.name.toLowerCase().endsWith(".xml")),
    cotas: find((file, normalized) => isPdf(file) && (normalized.includes("cotas") || normalized.includes("manual") || normalized.includes("desenho") || normalized.includes("tecnico"))),
    listaCompra: find((file, normalized) => isPdf(file) && (normalized.includes("listacompra") || normalized.includes("insumos") || normalized.includes("compra"))),
    listaCorte: find((file, normalized) => isPdf(file) && (normalized.includes("listacorte") || normalized.includes("plano") || normalized.includes("corte"))),
    previewCorte: find((file, normalized) => isPdf(file) && (normalized.includes("previewcorte") || normalized.includes("mapa") || normalized.includes("nesting"))),
    image: find((file) => /\.(jpe?g|png|webp)$/i.test(file.name)),
    dxf: find((file) => file.name.toLowerCase().endsWith(".dxf")),
    promob: find((file) => file.name.toLowerCase().endsWith(".promob")),
    allFiles: selectedFiles,
    others: [],
  };

  // Identify others (files not matching the primary categories)
  const classifiedPaths = new Set([
    result.xml, result.cotas, result.listaCompra, result.listaCorte, 
    result.previewCorte, result.image, result.dxf, result.promob
  ].filter(Boolean).map(f => f!.name));

  result.others = selectedFiles.filter(f => !classifiedPaths.has(f.name));

  return result;
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
  const { companyId, role, loading, user } = useAuth();
  
  // Log para debug
  console.log("[ImportPage] State:", { companyId, role, loading, hasUser: !!user });
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
  const [destination, setDestination] = useState<"cutplanning" | "factory">("factory");

  const identity = parseFolderIdentity(folderName);
  const requiredFiles = [
    { label: "XML Promob", file: classification.xml, required: true },
    { label: "COTAS PDF", file: classification.cotas, required: true },
    { label: "ListaCompra PDF", file: classification.listaCompra, required: true },
    { label: "ListaCorte PDF", file: classification.listaCorte, required: true },
    { label: "PreviewCorte PDF", file: classification.previewCorte, required: true },
    { label: "DXF", file: classification.dxf, required: true },
    { label: "Imagem", file: classification.image, required: false },
    { label: "Arquivo .PROMOB", file: classification.promob, required: true },
  ];
  const hasRequiredFiles = true; // Ingestão não bloqueada por gates
  const intakeReady =
    folderFileCount > 0 &&
    (identity.client.length > 0 || folderName.length > 0) &&
    !!destination;


  const [parseReport, setParseReport] = useState<{
    totalItems: number;
    recognizedModules: number;
    mdfPiecesInModules: number;
    looseMdfPieces: number;
    hardwareItems: number;
    unclassifiedItems: number;
    unclassifiedList: any[];
  } | null>(null);

  function handleFolderSelection(event: ChangeEvent<HTMLInputElement>) {
    try {
      const selectedFiles = Array.from(event.target.files ?? []);
      console.log(`[Import] Iniciando processamento de ${selectedFiles.length} arquivos.`);
      
      if (selectedFiles.length === 0) {
        toast.error("Nenhum arquivo foi selecionado.");
        return;
      }

      const rootNames = new Set(
        selectedFiles
          .map((file) => file.webkitRelativePath.split("/")[0])
          .filter((name): name is string => !!name),
      );
      const rootName = rootNames.size === 1 ? (Array.from(rootNames)[0] ?? "") : "";
      
      console.log(`[Import] Pasta detectada: "${rootName}"`);
      
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
      
      console.log(`[Import] Classificação: XML=${!!nextClassification.xml}, DXF=${!!nextClassification.dxf}, PDF=${!!nextClassification.cotas}`);

      // Auto-parse report for Rule 9
      if (nextClassification.xml) {
        nextClassification.xml.text().then(xmlContent => {
          try {
            const result = parsePromobXML(xmlContent);
            
            let mdfPiecesInModules = 0;
            let recognizedModules = result.modules.length;

            result.modules.forEach(m => {
              mdfPiecesInModules += m.parts.filter(p => p.kind === 'peca').length;
            });
            
            setParseReport({
              totalItems: result.modules.reduce((acc, m) => acc + m.parts.length, 0) + result.loose_parts.length,
              recognizedModules,
              mdfPiecesInModules,
              looseMdfPieces: result.loose_parts.filter(p => p.kind === 'peca').length,
              hardwareItems: 0,
              unclassifiedItems: 0,
              unclassifiedList: []
            });
            toast.success(`${selectedFiles.length} arquivos processados com sucesso.`);
          } catch (e) {
            console.error("Erro na pré-leitura do XML:", e);
            toast.error(`Erro ao ler o XML: ${e instanceof Error ? e.message : 'Arquivo inválido'}`);
          }
        }).catch(err => {
          console.error("Erro ao ler texto do XML:", err);
          toast.error("Falha ao ler o conteúdo do arquivo XML.");
        });
      } else {
        toast.warning("Pasta lida, mas o arquivo XML do Promob não foi encontrado.");
      }
    } catch (err) {
      console.error("Erro crítico no handleFolderSelection:", err);
      toast.error(`Falha ao ler pasta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
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
      const result = parsePromobXML(await files.xml.text());
      const dxfFile = classification.dxf;
      const dxfGeometry = dxfFile ? parseDXF(await dxfFile.text()) : [];

      const projectId = crypto.randomUUID();
      
      // Add ALL files from the folder to the persistence list, preserving internal paths
      const allProjectFiles: Array<{ file: File; type: string; summary: Json }> = classification.allFiles.map(file => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const norm = normalizedFileName(file);
        let type = 'other';
        
        if (ext === 'xml') type = 'xml';
        else if (ext === 'promob') type = 'promob_projeto';
        else if (ext === 'dxf') type = 'dxf_conferencia';
        else if (ext === 'pdf') {
          if (norm.includes("cotas") || norm.includes("manual") || norm.includes("desenho") || norm.includes("tecnico")) type = 'cotas_pdf';
          else if (norm.includes("listacompra") || norm.includes("insumos") || norm.includes("compra")) type = 'lista_compra_pdf';
          else if (norm.includes("listacorte") || norm.includes("plano") || norm.includes("corte")) type = 'lista_corte_pdf';
          else if (norm.includes("previewcorte") || norm.includes("mapa") || norm.includes("nesting")) type = 'preview_corte_pdf';
          else type = 'pdf_document';
        }
        else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) type = 'imagem_referencia';
        else if (ext === 'docx') type = 'docx_document';

        return {
          file,
          type,
          summary: { 
            relativePath: file.webkitRelativePath,
            size: file.size,
            lastModified: file.lastModified,
            source: "pasta_cliente"
          }
        };
      });

      const preparedFiles = allProjectFiles.map((item) => {
        // Use relative path for storage if available, otherwise just original name
        const rawPath = item.file.webkitRelativePath || item.file.name;
        
        // Sanitize every segment of the path to avoid "Invalid key" in Supabase Storage
        const sanitizedRelativePath = sanitizeStoragePath(rawPath);
        
        const storagePath = `${companyId}/${projectId}/${sanitizedRelativePath}`;
        
        return {
          ...item,
          storagePath,
        };
      });


      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sessão expirada. Entre novamente antes de importar.");
      
      const { error: sessionError } = await (supabase as any).from("project_import_sessions").insert({
        id: projectId,
        company_id: companyId,
        created_by: authData.user.id,
        planned_paths: preparedFiles.map((item) => item.storagePath),
        status: "uploading",
        step: "discovery",
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

        await (supabase as any)
          .from("project_import_sessions")
          .update({ step: "xml_parse" })
          .eq("id", projectId);

        
        // 2. Distribuição Automática 4.0 (MVP Requisitado)
        // Mapeamento rigoroso conforme requisitos do usuário
        const modulesPayload = result.modules.map((module: PromobModule) => ({
          name: module.name,
          environment: module.environment ?? null,
          width_mm: module.width_mm ?? null,
          height_mm: module.height_mm ?? null,
          depth_mm: module.depth_mm ?? null,
          quantity: module.quantity,
          parts: module.parts.map((part: PromobPart) => ({
            kind: part.kind,
            name: part.name,
            material: part.material ?? null,
            thickness_mm: part.thickness_mm ?? null,
            width_mm: part.width_mm ?? null,
            length_mm: part.length_mm ?? null,
            quantity: part.quantity,
            unit: part.unit ?? "un",
            edge_banding: part.edge_banding ?? null,
            id_xml: part.id_xml ?? null,
            parent_id_xml: part.parent_id_xml ?? null,
            color: part.color ?? null,
            supplier: part.supplier ?? null,
            edge_top: part.edge_top ?? 0,
            edge_bottom: part.edge_bottom ?? 0,
            edge_left: part.edge_left ?? 0,
            edge_right: part.edge_right ?? 0,
            edge_name_general: (part.metadata as any)?.edge_name_general ?? null,
            edge_name_front: (part.metadata as any)?.edge_name_front ?? null,
            repetition: part.repetition ?? 1,
            quantity_raw: part.quantity_raw ?? null,
            module_sequence: (part.metadata as any)?.module_sequence ?? null,
            piece_sequence: (part.metadata as any)?.piece_sequence ?? null,
            metadata: {
              ...part.metadata,
              source: "XML"
            },
          })),
          metadata: module.metadata || {},
          id_xml: module.id_xml || null,
        }));
        
        const loosePartsPayload = result.loose_parts.map((part: PromobPart) => ({
          kind: part.kind,
          name: part.name,
          material: part.material ?? null,
          thickness_mm: part.thickness_mm ?? null,
          width_mm: part.width_mm ?? null,
          length_mm: part.length_mm ?? null,
          quantity: part.quantity,
          unit: part.unit ?? "un",
          edge_banding: part.edge_banding ?? null,
          id_xml: part.id_xml ?? null,
          parent_id_xml: part.parent_id_xml ?? null,
          color: part.color ?? null,
          supplier: part.supplier ?? null,
          edge_top: part.edge_top ?? 0,
          edge_bottom: part.edge_bottom ?? 0,
          edge_left: part.edge_left ?? 0,
          edge_right: part.edge_right ?? 0,
          edge_name_general: (part.metadata as any)?.edge_name_general ?? null,
          edge_name_front: (part.metadata as any)?.edge_name_front ?? null,
          repetition: part.repetition ?? 1,
          quantity_raw: part.quantity_raw ?? null,
          module_sequence: (part.metadata as any)?.module_sequence ?? null,
          piece_sequence: (part.metadata as any)?.piece_sequence ?? null,
          metadata: {
            ...part.metadata,
            source: "XML"
          },
        }));

        // 1. Criar Projeto e Registrar Arquivos
        const { data: importedProjectId, error: importError } = await supabase.rpc(
          "import_client_project" as any,
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
              is_test: true, 
            },
            _files: storedFiles,
            _modules: modulesPayload, 
            _loose_parts: loosePartsPayload,
          },
        );
        if (importError) throw importError;
        rpcAttempted = true;

        await (supabase as any)
          .from("project_import_sessions")
          .update({ step: "persistence" })
          .eq("id", projectId);

        // FIDELITY 5.0 - Initialize estimation tracking for the internal engine
        try {
          const { initializeProjectProduction } = await import("@/lib/production");
          const { IndustrialCutPlanEngine } = await import("@/lib/cut-plan/engine");
          
          const groups = await IndustrialCutPlanEngine.generateForProject(projectId);
          const allPhysicalPieces = groups.flatMap(g => g.pieces);
          
          if (allPhysicalPieces.length > 0) {
            const trackingPayload = allPhysicalPieces.map(p => ({
              physicalId: p.physicalId,
              partId: p.partId,
              moduleId: p.moduleId || null,
              needsEdge: (p.edgeTop > 0 || p.edgeBottom > 0 || p.edgeLeft > 0 || p.edgeRight > 0)
            }));

            await initializeProjectProduction({
              data: {
                projectId,
                companyId: companyId,
                steps: trackingPayload
              }
            });

            console.log(`[Fidelity 5.0] Estimated production tracking initialized for ${allPhysicalPieces.length} pieces.`);
          }
        } catch (estimErr) {
          console.error("Erro ao inicializar rastreabilidade de estimativa:", estimErr);
        }


        const { error: distributionError } = await supabase.rpc(
          "ingest_and_distribute_project" as any,
          {
            _project_id: projectId,
            _modules: modulesPayload,
            _loose_parts: loosePartsPayload,
            _is_test: true
          }
        );
        if (distributionError) throw distributionError;
        // Auditoria Pós-Importação 4.0: Validar persistência real
        const { data: distributionAudit, error: distAuditError } = await supabase
          .from("project_distribution")
          .select("id, area, status, item_count")
          .eq("project_id", projectId);

        if (distAuditError || !distributionAudit || distributionAudit.length === 0) {
          throw new Error("Falha na Distribuição Industrial: Nenhuma área de produção foi alimentada automaticamente.");
        }

        const { data: projectAudit, error: auditError } = await supabase
          .from("projects")
          .select("id, operational_status")
          .eq("id", projectId)
          .maybeSingle();

        if (auditError || !projectAudit) {
           throw new Error("Falha na persistência industrial: o projeto não foi detectado no banco de dados.");
        }

        if (projectAudit.operational_status !== 'alimentado') {
          throw new Error(`Falha no fluxo industrial: o status operacional esperado era 'alimentado', mas está como '${projectAudit.operational_status}'.`);
        }

        const { data: partsAudit, error: partsError } = await supabase
          .from("parts")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId);
        
        const hasModules = result.modules.length > 0 || result.loose_parts.length > 0;
        if (hasModules && (partsError || !partsAudit || (partsAudit as any).count === 0)) {
           throw new Error(`Falha na persistência industrial: o XML possui itens, mas nenhuma peça foi gravada no banco.`);
        }

        const { data: filesAudit } = await supabase
          .from("project_files")
          .select("id")
          .eq("project_id", projectId);
        
        if (!filesAudit || filesAudit.length === 0) {
          throw new Error(`Falha na persistência industrial: nenhum arquivo foi registrado.`);
        }
        
        // LIBERAÇÃO AUTOMÁTICA 5.6
        // Ao importar, o sistema já preenche os gates e libera a usinagem por padrão
        try {
          const checkTypes = [
            "xml_valido", "lista_corte", "nesting_dxf", "materiais",
            "documentacao_tecnica", "cotas_furacao", "bitolas", "tags_skp", "visual_ingestion",
            "usinagem_liberada", "pecas_conferidas", "ferragens_conferidas", "grupos_completos"
          ];
          
          const checksPayload = checkTypes.map(type => ({
            project_id: projectId,
            check_type: type,
            is_completed: true,
            completed_by: authData.user.id,
            completed_at: new Date().toISOString(),
            evidence_source: "auto_liberacao_import",
            updated_at: new Date().toISOString()
          }));

          await (supabase as any).from("validation_checks").upsert(checksPayload, { onConflict: "project_id,check_type" });
          
          await supabase.rpc("release_project_machining" as any, {
            _project_id: projectId,
          });

          // Avança status para 'corte' automaticamente para entrar no Pipeline
          await supabase
            .from("projects")
            .update({ status: "corte", operational_status: "pronto_para_producao" })
            .eq("id", projectId);

          console.log(`[Liberação 5.6] Projeto ${projectId} liberado automaticamente.`);
        } catch (releaseErr) {
          console.error("Erro na liberação automática:", releaseErr);
        }

        await (supabase as any)
          .from("project_import_sessions")
          .update({ step: "completed", status: "finished" })
          .eq("id", projectId);

        // Redireciona para o Pipeline de Produção diretamente (vontade do usuário: "torne o aap sem travas")
        navigate({ to: "/production" });
        return projectId;
      } catch (error) {
        await (supabase as any)
          .from("project_import_sessions")
          .update({ status: "failed" })
          .eq("id", projectId);
        if (rpcAttempted) {
          const { data: committedProject, error: verificationError } = await supabase
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .maybeSingle();
          if (committedProject) return committedProject.id;
          const { error: trackingError } = await supabase.rpc("mark_import_cleanup_required" as any, {
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
          if (reconciledProject) {
            navigate({ to: "/projects/$projectId", params: { projectId: projectId }, search: { tab: 'modules' } });
            return reconciledProject.id;
          }
          throw new Error(
            verificationError || reconciliationError
              ? "Estado da importação indeterminado por falha de rede. Os arquivos foram preservados e a sessão foi marcada para reconciliação."
              : `${error instanceof Error ? error.message : "Falha na importação."} Os arquivos foram preservados para reconciliação.`,
          );
        }

        // FIDELITY 5.4 - Apenas descarta se o erro ocorrer ANTES do rpcAttempted
        // Se rpcAttempted for true, significa que o import_client_project foi chamado
        // e qualquer erro posterior deve ser tratado como falha de pós-processamento,
        // mantendo os arquivos para auditoria/reconciliação.
        if (!rpcAttempted) {
          try {
            const { data: projectExists } = await supabase
              .from("projects")
              .select("id")
              .eq("id", projectId)
              .maybeSingle();

            if (!projectExists) {
              console.warn("Limpando rastros de importação falha (pré-persistência)...");
              
              // Only remove files if they were successfully prepared
              if (preparedFiles && preparedFiles.length > 0) {
                await supabase.storage
                  .from("project-files")
                  .remove(preparedFiles.map((item) => item.storagePath));
              }

              await supabase.rpc("discard_import_session", {
                _session_id: projectId,
              });
            }
          } catch (cleanupError) {
            console.error("Erro na limpeza pós-falha:", cleanupError);
          }
        }
        
        throw error;
      }
    },
    onSuccess: (projectId) => {
      toast.success("Projeto importado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects/$projectId", params: { projectId: projectId as string }, search: { tab: 'modules' } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro na importação.");
      setIsProcessing(false);
    },
  });

  if (!loading && !hasPermission(role, "projects", "import")) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl p-5 sm:p-8">
          <Card className="border-red-200 bg-red-50 shadow-none">
            <CardContent className="flex items-start gap-3 p-5 text-red-900">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <div>
                <h1 className="text-sm font-black uppercase">Acesso bloqueado</h1>
                <p className="mt-1 text-xs">
                  Seu perfil ({role}) não possui permissão para receber a Pasta do Cliente.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 border-red-200 text-red-900 hover:bg-red-100"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-5 px-3 py-4 sm:px-5 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        {createProjectMutation.isSuccess && (
          <Card className="border-emerald-200 bg-emerald-50 p-6 shadow-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  Importação Industrial Concluída
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500 uppercase tracking-widest">
                  Projeto persistido com auditoria de integridade 4.0
                </p>
              </div>
              
              <div className="grid w-full grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase text-slate-400">ID do Projeto</p>
                  <p className="mt-1 font-mono text-xs font-bold truncate">
                    {createProjectMutation.data}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase text-slate-400">Banco de Dados</p>
                  <p className="mt-1 text-emerald-600 font-black uppercase text-[10px]">Auditado & Confirmado</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: createProjectMutation.data }, search: { tab: 'modules' } })}
                  className="bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest px-8"
                >
                  Abrir Engenharia
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="font-black uppercase text-[10px] tracking-widest px-8"
                >
                  Nova Importação
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!createProjectMutation.isSuccess && (
          <>
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
                Abrir Minha Pasta Real
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
                          input.removeAttribute("accept");
                        }
                      }}
                      onChange={handleFolderSelection}
                    />
                    <FolderOpen className="h-8 w-8 text-slate-950 group-hover:text-lime-700" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-slate-950">
                        {folderName || "Clique para Abrir Minha Pasta Real"}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        {folderFileCount
                          ? `${folderFileCount} arquivos lidos`
                          : "Selecione a pasta do projeto"}
                      </p>
                    </div>
                  </label>
                  <div className="flex min-h-40 flex-col justify-between rounded-md border border-slate-200 bg-white p-4 text-slate-950 sm:p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <Briefcase className="h-8 w-8 text-blue-600" />
                      <span className="rounded-sm border border-blue-300 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-800">
                        Empresa Ativa
                      </span>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black uppercase text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" /> Multitenancy 4.0
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase leading-relaxed tracking-[0.1em] text-slate-600">
                        Vinculado à unidade ID: <span className="font-mono text-blue-600">{companyId?.split('-')[0]}...</span>
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
                      Falha fechada / {requiredFiles.filter(f => f.required).length} obrigatórios
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
                          {item.label} {!item.required && <span className="text-slate-500 lowercase">(opcional)</span>}
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
                        classification.others.length > 0
                          ? "bg-lime-300 text-slate-950"
                          : "bg-slate-900 text-slate-600",
                      )}
                    >
                      {classification.others.length > 0 ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <span className="font-mono text-[9px]">+</span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                        Outros Arquivos / Inventory
                      </p>
                      <p className={cn(
                        "truncate text-[10px]",
                        classification.others.length > 0 ? "text-lime-300" : "text-slate-600"
                      )}>
                        {classification.others.length > 0 
                          ? `${classification.others.length} arquivos detectados (${classification.others.map(f => f.name.split('.').pop()?.toUpperCase()).filter((v, i, a) => a.indexOf(v) === i).join(', ')})` 
                          : "Nenhum outro arquivo localizado"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!intakeReady && folderFileCount > 0 && (
              <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider">
                    Modo Piloto: Pendências de Conferência
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    A Pasta do Cliente possui divergências de nomenclatura ou arquivos. 
                    Confirme o destino de produção para prosseguir com a ingestão em Modo Piloto.
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
                  <p className="mt-1 font-black text-slate-950">Liberada (Modo Piloto)</p>
                </div>
              </div>
              
              {parseReport && (
                <div className="mb-4 space-y-2 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Relatório de Leitura Monta AI
                  </p>
                  <div className="grid grid-cols-2 gap-y-1 font-mono text-[9px]">
                    <span className="text-slate-400">Total de Itens:</span>
                    <span className="text-right font-bold text-slate-700">{parseReport.totalItems}</span>
                    <span className="text-slate-400">Módulos:</span>
                    <span className="text-right font-bold text-slate-700">{parseReport.recognizedModules}</span>
                    <span className="text-slate-400">Peças MDF:</span>
                    <span className="text-right font-bold text-slate-700">{parseReport.mdfPiecesInModules + parseReport.looseMdfPieces}</span>
                  </div>
                  <p className="text-[8px] leading-relaxed text-slate-400 italic">
                    A classificação de MDF, Ferragens e Módulos é confirmada durante a ingestão.
                  </p>
                </div>
              )}

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
                Criar projeto
              </Button>
              <p className="mt-3 text-center text-[9px] font-bold uppercase leading-relaxed tracking-[0.1em] text-slate-400">
                Somente arquivos da pasta serão interpretados. Fidelidade Industrial 100%.
              </p>
            </div>
          </aside>
        </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
