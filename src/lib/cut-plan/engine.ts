import { supabase } from "@/integrations/supabase/client";

/**
 * Industrial Cut Plan Engine 4.0
 * Implementation: Shelf Packing Algorithm (Horizontal)
 * Rules:
 * - Deterministic repetition expansion
 * - Grouping by Supplier + Material + Color + Thickness
 * - Sorted by Short Side (sh) descending, then Long Side (lo)
 * - Standard Kerf: 4mm
 * - Standard Sheet: 2750 x 1830 mm
 */

export interface PhysicalPiece {
  physicalId: string;
  partId: string;
  projectId: string;
  idXml: string;
  parentIdXml: string;
  repetitionIndex: number;
  moduleSequence?: number;
  pieceSequence?: number;
  moduleId?: string;
  moduleName?: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  material: string;
  supplier: string;
  color: string;
  edgeTop: number;
  edgeBottom: number;
  edgeLeft: number;
  edgeRight: number;
  edgeNameGeneral?: string;
  edgeNameFront?: string;
  metadata?: any;
  // Dimensions for packing
  lo: number; // Major side
  sh: number; // Minor side
}

export interface Placement {
  physicalId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  piece: PhysicalPiece;
}

export interface Shelf {
  y: number;
  height: number;
  usedWidth: number;
  placements: Placement[];
}

export interface Sheet {
  sheetId: number;
  width: number;
  height: number;
  usedHeight: number;
  shelves: Shelf[];
}

export interface CutPlanGroup {
  groupKey: string;
  supplier: string;
  material: string;
  color: string;
  thicknessMm: number;
  pieces: PhysicalPiece[];
  sheets: Sheet[];
  stats: {
    totalPieces: number;
    totalAreaPieces: number;
    totalAreaSheets: number;
    utilizationPercent: number;
    wastePercent: number;
    sheetCount: number;
  };
}

const KERF = 4;
const DEFAULT_SHEET_WIDTH = 2750;
const DEFAULT_SHEET_HEIGHT = 1830;

export const IndustrialCutPlanEngine = {
  async generateForProject(projectId: string): Promise<CutPlanGroup[]> {
    console.log(`[IndustrialCutPlanEngine] Generating cut plan for project: ${projectId}`);

    // 1. Fetch parts explicitly by projectId
    const { data: parts, error } = await supabase
      .from("parts")
      .select("*")
      .eq("project_id", projectId);

    if (error) throw error;
    if (!parts || parts.length === 0) return [];

    // 2. Industrial Filtering & Repetition Expansion
    const physicalPieces: PhysicalPiece[] = [];
    
    parts.forEach(part => {
      // Rule 4: Material = MDF or MDP and valid thickness
      const isMdfOrMdp = part.material?.toUpperCase().includes("MDF") || part.material?.toUpperCase().includes("MDP");
      if (!isMdfOrMdp || !part.thickness_mm) return;
      if (!part.length_mm || !part.width_mm) return; // Rule 7: Invalid dimensions

      const repetition = Number(part.repetition) || 1;
      const metadata = (part.metadata as any) || {};

      for (let i = 0; i < repetition; i++) {
        const lo = Math.max(part.length_mm, part.width_mm);
        const sh = Math.min(part.length_mm, part.width_mm);

        physicalPieces.push({
          physicalId: `${part.id_xml || part.id}_rep${i}`,
          partId: part.id,
          projectId: part.project_id,
          idXml: part.id_xml || "",
          parentIdXml: (metadata.unique_parent_id as string) || "",
          repetitionIndex: i,
          moduleSequence: metadata.module_sequence as number | undefined,
          pieceSequence: metadata.piece_sequence as number | undefined,
          moduleId: part.module_id || undefined,
          name: part.name || "Peça Sem Nome",
          lengthMm: part.length_mm,
          widthMm: part.width_mm,
          thicknessMm: part.thickness_mm,
          material: part.material || "MDF",
          supplier: part.supplier || "GENERIC",
          color: part.color || "WHITE",
          edgeTop: part.edge_top || 0,
          edgeBottom: part.edge_bottom || 0,
          edgeLeft: part.edge_left || 0,
          edgeRight: part.edge_right || 0,
          edgeNameGeneral: metadata.edge_name_general as string | undefined,
          edgeNameFront: metadata.edge_name_front as string | undefined,
          metadata: metadata,
          lo,
          sh
        });
      }
    });

    // 3. Industrial Groups (Rule 8)
    const groups: Record<string, PhysicalPiece[]> = {};
    physicalPieces.forEach(piece => {
      const key = `${piece.supplier}|${piece.material}|${piece.color}|${piece.thicknessMm}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(piece);
    });

    const result: CutPlanGroup[] = [];

    // 4. Algorithm Implementation (Rule 11-13)
    for (const [key, pieces] of Object.entries(groups)) {
      const [supplier, material, color, thickness] = key.split('|');
      
      // Sort pieces: sh descending, then lo descending
      const sortedPieces = [...pieces].sort((a, b) => {
        if (b.sh !== a.sh) return b.sh - a.sh;
        return b.lo - a.lo;
      });

      const sheets: Sheet[] = [];
      
      for (const piece of sortedPieces) {
        let placed = false;

        // Try to place in existing sheets and shelves
        for (const sheet of sheets) {
          for (const shelf of sheet.shelves) {
            if (this.canFitInShelf(piece, shelf, sheet.width)) {
              this.placeInShelf(piece, shelf);
              placed = true;
              break;
            }
          }
          if (placed) break;

          // Try to open a new shelf in current sheet
          if (this.canOpenShelfInSheet(piece, sheet, DEFAULT_SHEET_HEIGHT, DEFAULT_SHEET_WIDTH)) {
            this.openShelfAndPlace(piece, sheet, DEFAULT_SHEET_WIDTH);
            placed = true;
            break;
          }
        }

        // If not placed, open a new sheet
        if (!placed) {
          const newSheet: Sheet = {
            sheetId: sheets.length + 1,
            width: DEFAULT_SHEET_WIDTH,
            height: DEFAULT_SHEET_HEIGHT,
            usedHeight: 0,
            shelves: []
          };
          this.openShelfAndPlace(piece, newSheet, DEFAULT_SHEET_WIDTH);
          sheets.push(newSheet);
        }
      }

      // Calculate Stats
      const totalAreaPieces = pieces.reduce((acc, p) => acc + (p.lengthMm * p.widthMm), 0) / 1000000;
      const totalAreaSheets = sheets.length * (DEFAULT_SHEET_WIDTH * DEFAULT_SHEET_HEIGHT) / 1000000;
      
      result.push({
        groupKey: key,
        supplier,
        material,
        color,
        thicknessMm: parseFloat(thickness),
        pieces,
        sheets,
        stats: {
          totalPieces: pieces.length,
          totalAreaPieces,
          totalAreaSheets,
          utilizationPercent: (totalAreaPieces / totalAreaSheets) * 100,
          wastePercent: 100 - ((totalAreaPieces / totalAreaSheets) * 100),
          sheetCount: sheets.length
        }
      });
    }

    return result;
  },

  canFitInShelf(piece: PhysicalPiece, shelf: Shelf, sheetWidth: number): boolean {
    // Normal: lo is length (width in shelf), sh is height
    if (piece.sh <= shelf.height && (shelf.usedWidth + piece.lo + KERF) <= sheetWidth) {
      return true;
    }
    // Rotated: sh is length, lo is height
    if (piece.lo <= shelf.height && (shelf.usedWidth + piece.sh + KERF) <= sheetWidth) {
      return true;
    }
    return false;
  },

  placeInShelf(piece: PhysicalPiece, shelf: Shelf) {
    // Prefer normal orientation if fits, otherwise rotated
    const rotated = !(piece.sh <= shelf.height && (shelf.usedWidth + piece.lo + KERF) <= (DEFAULT_SHEET_WIDTH));
    const w = rotated ? piece.sh : piece.lo;
    const h = rotated ? piece.lo : piece.sh;

    shelf.placements.push({
      physicalId: piece.physicalId,
      x: shelf.usedWidth,
      y: shelf.y,
      w,
      h,
      rotated,
      piece
    });

    shelf.usedWidth += w + KERF;
  },

  canOpenShelfInSheet(piece: PhysicalPiece, sheet: Sheet, sheetHeight: number, sheetWidth: number): boolean {
    // Normal
    if ((sheet.usedHeight + piece.sh + KERF) <= sheetHeight && (piece.lo + KERF) <= sheetWidth) {
      return true;
    }
    // Rotated
    if ((sheet.usedHeight + piece.lo + KERF) <= sheetHeight && (piece.sh + KERF) <= sheetWidth) {
      return true;
    }
    return false;
  },

  openShelfAndPlace(piece: PhysicalPiece, sheet: Sheet, sheetWidth: number) {
    const rotated = !( (sheet.usedHeight + piece.sh + KERF) <= DEFAULT_SHEET_HEIGHT && (piece.lo + KERF) <= sheetWidth );
    const w = rotated ? piece.sh : piece.lo;
    const h = rotated ? piece.lo : piece.sh;

    const newShelf: Shelf = {
      y: sheet.usedHeight,
      height: h,
      usedWidth: 0,
      placements: []
    };

    newShelf.placements.push({
      physicalId: piece.physicalId,
      x: 0,
      y: newShelf.y,
      w,
      h,
      rotated,
      piece
    });

    newShelf.usedWidth = w + KERF;
    sheet.shelves.push(newShelf);
    sheet.usedHeight += h + KERF;
  }
};