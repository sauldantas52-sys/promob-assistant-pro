import { PhysicalPiece } from "@/lib/cut-plan/engine";
import { getEdgeData } from "../cut-plan/edges";

export interface LabelData {
  physicalId: string;
  projectId: string;
  masterUid: string;
  moduleName: string;
  pieceCode: string;
  name: string;
  dim: string;
  material: string;
  edgeLabel: string;
  qrPayload: string;
}

export const generateLabelData = (piece: PhysicalPiece): LabelData => {
  const edgeData = getEdgeData(piece);
  
  return {
    physicalId: piece.physicalId,
    projectId: piece.projectId,
    masterUid: piece.metadata?.unique_id || piece.idXml || 'N/A',
    moduleName: piece.moduleName || 'Peça Avulsa',
    pieceCode: `${piece.moduleSequence || '0'}.${piece.pieceSequence || '0'}`,
    name: piece.name,
    dim: `${piece.lengthMm} × ${piece.widthMm} × ${piece.thicknessMm} mm`,
    material: piece.material,
    edgeLabel: edgeData.label,
    qrPayload: JSON.stringify({
      g: piece.moduleSequence || 'G0',
      p: piece.pieceSequence || '0',
      m: piece.metadata?.unique_id || piece.idXml,
      u: piece.physicalId
    })
  };
};
