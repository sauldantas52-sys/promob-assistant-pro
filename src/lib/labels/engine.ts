import { PhysicalPiece } from "@/lib/cut-plan/engine";
import { getEdgeData } from "../cut-plan/edges";
import { pieceLabelHtml } from "./piece-label";
import { QRCodeSVG } from "qrcode.react";
import * as ReactServer from "react-dom/server";

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

/**
 * Legacy helper for pieceLabelHtml (if still needed by older components)
 */
export const renderPieceLabel = (piece: PhysicalPiece, width: number, height: number): string => {
  const data = generateLabelData(piece);
  
  // No Lovable/React environment, we can use a React-based approach or 
  // simply pass a placeholder/svg for qrSvg if calling pieceLabelHtml.
  // Note: pieceLabelHtml expects a raw string.
  
  return pieceLabelHtml({
    ...piece,
    modNum: piece.moduleSequence || 0,
    code: `${piece.moduleSequence || 0}.${piece.pieceSequence || 0}`,
    masterUid: data.masterUid,
    uid: piece.physicalId,
    modulePieceNumber: piece.pieceSequence || 0,
    modName: piece.moduleName || 'Peça',
    desc: piece.name,
    lo: piece.lo,
    sh: piece.sh,
    thick: piece.thicknessMm,
    model: piece.material,
    fb: [piece.edgeTop, piece.edgeBottom, piece.edgeLeft, piece.edgeRight],
    bandNames: [piece.edgeNameGeneral, piece.edgeNameFront, piece.edgeNameGeneral, piece.edgeNameGeneral],
    obs: piece.metadata?.observations || ''
  }, {
    larguraMm: width,
    alturaMm: height,
    qrSvg: '<svg width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="#eee"/></svg>'
  });
};
