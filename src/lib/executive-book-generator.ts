import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Fidelity 5.4 - Industrial Executive Book Generator
 * Implementa a lógica documental e industrial baseada no gabarito BWC.
 */

interface ModuleData {
  id: string;
  name: string;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  parts: any[];
  images: string[];
}

interface ProjectData {
  id: string;
  name: string;
  client_name: string | null;
  environment: string | null;
  machining_blocked: boolean;
  status: string;
}

export async function generateExecutivePDF(project: ProjectData, modules: any[], parts: any[], files: any[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = "#0f172a"; // Slate-950
  const accentColor = "#2563eb";  // Blue-600
  const warningColor = "#dc2626"; // Red-600

  // Helper para Rodapé
  const addFooter = (pageNumber: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    doc.text(`MONTA AI - CADERNO EXECUTIVO TÉCNICO | Gerado em: ${dateStr}`, 15, 285);
    doc.text(`Página ${pageNumber} de ${totalPages}`, 180, 285);
    doc.text(`ID: ${project.id}`, 15, 289);
  };

  // 1. CAPA
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 297, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.text("MONTA AI", 105, 80, { align: "center" });
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  doc.text("CADERNO EXECUTIVO TÉCNICO", 105, 100, { align: "center" });

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.line(40, 110, 170, 110);

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(project.name.toUpperCase(), 105, 140, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`CLIENTE: ${project.client_name || "NÃO INFORMADO"}`, 105, 160, { align: "center" });
  doc.text(`AMBIENTE: ${project.environment || "NÃO INFORMADO"}`, 105, 170, { align: "center" });

  if (project.machining_blocked) {
    doc.setFillColor(warningColor);
    doc.rect(50, 200, 110, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("MODO PILOTO", 105, 208, { align: "center" });
    doc.text("USINAGEM BLOQUEADA", 105, 215, { align: "center" });
  }

  // 2. SUMÁRIO
  doc.addPage();
  doc.setTextColor(primaryColor);
  doc.setFontSize(20);
  doc.text("SUMÁRIO TÉCNICO", 15, 30);
  
  doc.setFontSize(12);
  let yPos = 50;
  modules.forEach((mod, index) => {
    const label = `G${index + 1} — ${mod.name}`;
    doc.text(label, 15, yPos);
    doc.text(`${index + 3}`, 190, yPos, { align: "right" });
    doc.setDrawColor(230);
    doc.line(15, yPos + 2, 195, yPos + 2);
    yPos += 12;
    if (yPos > 260) {
       doc.addPage();
       yPos = 30;
    }
  });

  // 3. FICHAS DE MÓDULOS
  modules.forEach((mod, index) => {
    doc.addPage();
    
    // Cabeçalho da Ficha
    doc.setFillColor(primaryColor);
    doc.rect(15, 15, 180, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`G${index + 1} - ${mod.name.toUpperCase()}`, 20, 25);
    
    doc.setTextColor(primaryColor);
    doc.setFontSize(10);
    const dims = `Dimensões: ${mod.width_mm || "?"} x ${mod.height_mm || "?"} x ${mod.depth_mm || "?"} mm`;
    doc.text(dims, 15, 40);

    // Área para Imagens (Fidelidade 5.4 - Imagens da Pasta do Cliente)
    // Procurar arquivos relacionados ao módulo
    const moduleImages = files.filter(f => 
      f.file_name.toLowerCase().includes(mod.name.toLowerCase()) ||
      (f.summary && f.summary.toLowerCase().includes(mod.name.toLowerCase()))
    ).filter(f => ['image/jpeg', 'image/png', 'application/pdf'].includes(f.file_type || ''));

    doc.setDrawColor(200);
    doc.rect(15, 45, 180, 100); // Placeholder moldura
    
    if (moduleImages.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(accentColor);
      doc.text("IMAGEM TÉCNICA LOCALIZADA NA PASTA DO CLIENTE", 105, 95, { align: "center" });
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Arquivo: ${moduleImages[0].file_name}`, 105, 100, { align: "center" });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("VISTA 3D DO SISTEMA (POSIÇÃO ILUSTRATIVA)", 105, 95, { align: "center" });
    }

    // Tabela de Peças do Módulo
    const moduleParts = parts.filter(p => p.module_id === mod.id && p.kind === 'peca');
    
    const tableData = moduleParts.map((p, pIdx) => [
      pIdx + 1,
      p.name,
      p.material || "-",
      `${p.width_mm}x${p.length_mm}x${p.thickness_mm}`,
      p.quantity,
      p.edge_banding || "N"
    ]);

    (doc as any).autoTable({
      startY: 150,
      head: [['#', 'Peça', 'Material', 'Dimensões (mm)', 'Qtd', 'Fita']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      margin: { left: 15, right: 15 }
    });

    // Observações
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES TÉCNICAS:", 15, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("- Medidas nominais sujeitas a refilo de 5mm por lado.", 15, finalY + 5);
    doc.text("- Conferir furação de dobradiças conforme padrão de fábrica.", 15, finalY + 9);
    if (project.machining_blocked) {
      doc.setTextColor(warningColor);
      doc.text("- ATENÇÃO: USINAGEM BLOQUEADA (MODO PILOTO).", 15, finalY + 13);
    }
  });

  // Finalização e Download
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  doc.save(`caderno-executivo-${project.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
