import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Float, Html, PerspectiveCamera, Bounds, useBounds } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Maximize2, RotateCw, ZoomIn, ZoomOut, Layers, Eye, EyeOff, Info, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Convenção de Unidades ---
// 1 unidade Three.js = 1000 mm (1 metro)
const MM_TO_SCENE = 0.001;

function mmToSceneUnits(mm: number): number {
  return mm * MM_TO_SCENE;
}

interface PhysicalPiece3D {
  physicalId: string;
  partId: string;
  idXml: string;
  moduleSequence: number;
  pieceCode: string;
  name: string;
  dimensions: { w: number; h: number; l: number };
  material: string;
  color: string;
  thickness: number;
  status?: string;
  edgeBanding?: string;
}

interface Module3D {
  id: string;
  idXml: string;
  sequence: number;
  name: string;
  width: number;
  height: number;
  depth: number;
  positionConfirmed: boolean;
  position: [number, number, number];
  pieces: PhysicalPiece3D[];
  selectedPieceId?: string | null;
}

// Componente para renderizar uma peça individual
function PieceMesh({
  piece,
  modulePosition,
  index,
  totalPieces,
  isSelected,
  isIsolated,
  isXRay,
  onSelect
}: {
  piece: PhysicalPiece3D;
  modulePosition: [number, number, number];
  index: number;
  totalPieces: number;
  isSelected: boolean;
  isIsolated: boolean;
  isXRay: boolean;
  onSelect: () => void;
}) {
  const width = mmToSceneUnits(piece.dimensions.w);
  const height = mmToSceneUnits(piece.dimensions.h); // Thickness
  const length = mmToSceneUnits(piece.dimensions.l);

  // Posicionamento algorítmico básico (Empilhamento visual dentro do módulo)
  // Explodimos um pouco se estiver isolado para ver a composição
  const spacing = isIsolated ? 0.2 : 0.02;
  const xPos = modulePosition[0];
  const yPos = modulePosition[1] + (index * spacing) - ((totalPieces * spacing) / 2);
  const zPos = modulePosition[2];

  const opacity = isIsolated 
    ? (isSelected ? 1 : 0.1) 
    : (isSelected ? 1 : 0.6);

  // Cor baseada no material ou fixa industrial
  const color = piece.material.toLowerCase().includes('mdf') ? "#d4a373" : "#cbd5e1";
  const finalColor = isSelected ? "#3b82f6" : color;

  return (
    <group position={[xPos, yPos, zPos]} onClick={(e) => {
      e.stopPropagation();
      onSelect();
    }}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial 
          color={finalColor} 
          transparent 
          opacity={opacity * (isXRay ? 0.3 : 1)}
          metalness={0.1}
          roughness={0.5}
        />
      </mesh>
      
      {isSelected && (
        <mesh>
          <boxGeometry args={[length + 0.01, height + 0.01, width + 0.01]} />
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// Componente para renderizar um módulo individual (agora como um container de peças)
function ModuleGroup({ 
  module, 
  isSelected, 
  isIsolated, 
  isXRay,
  onSelectModule,
  onSelectPiece
}: { 
  module: Module3D; 
  isSelected: boolean; 
  isIsolated: boolean;
  isXRay: boolean;
  onSelectModule: (id: string) => void;
  onSelectPiece: (physicalId: string) => void;
}) {
  const width = mmToSceneUnits(module.width);
  const height = mmToSceneUnits(module.height);
  const depth = mmToSceneUnits(module.depth);

  const visible = isIsolated ? isSelected : true;
  if (!visible) return null;

  return (
    <group>
      {/* Container visual do Módulo (Envelope) */}
      <mesh 
        position={module.position} 
        onClick={(e) => {
          e.stopPropagation();
          onSelectModule(module.id);
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          transparent 
          opacity={0.05} 
          color={isSelected ? "#3b82f6" : "#cbd5e1"} 
          wireframe={!isSelected}
        />
      </mesh>

      {/* Peças Reais */}
      {module.pieces.map((piece, idx) => (
        <PieceMesh
          key={piece.physicalId}
          piece={piece}
          modulePosition={module.position}
          index={idx}
          totalPieces={module.pieces.length}
          isSelected={isSelected && module.selectedPieceId === piece.physicalId}
          isIsolated={isIsolated}
          isXRay={isXRay}
          onSelect={() => {
            onSelectPiece(piece.physicalId);
          }}
        />
      ))}
      
      {/* Label do Módulo */}
      <Html distanceFactor={10} position={[module.position[0], module.position[1] + height / 2 + 0.1, module.position[2]]}>
        <div className={cn(
          "px-2 py-1 rounded bg-slate-900/80 backdrop-blur text-[8px] font-black text-white uppercase tracking-widest whitespace-nowrap pointer-events-none select-none transition-opacity",
          isSelected ? "opacity-100" : "opacity-40"
        )}>
          {module.sequence > 0 ? `G${module.sequence} · ` : ""}{module.name}
        </div>
      </Html>
    </group>
  );
}

function SceneContent({ 
  modules, 
  selectedId, 
  isIsolated, 
  isXRay,
  onSelectModule,
  onSelectPiece
}: { 
  modules: Module3D[]; 
  selectedId: string | null;
  isIsolated: boolean;
  isXRay: boolean;
  onSelectModule: (id: string) => void;
  onSelectPiece: (physicalId: string) => void;
}) {
  const bounds = useBounds();

  if (typeof window !== 'undefined') {
    (window as any).isXRayActive = isXRay;
  }

  return (
    <Bounds fit clip observe margin={1.2}>
      <group>
        {modules.map((mod) => (
          <ModuleGroup 
            key={mod.id} 
            module={mod} 
            isSelected={selectedId === mod.id}
            isIsolated={isIsolated}
            isXRay={isXRay}
            onSelectModule={onSelectModule}
            onSelectPiece={onSelectPiece}
          />
        ))}
      </group>
      
      <ContactShadows 
        position={[0, -1, 0]} 
        opacity={0.4} 
        scale={20} 
        blur={2} 
        far={4.5} 
      />
    </Bounds>
  );
}

export function Operational3DView({ 
  projectId, 
  modules: rawModules, 
  parts: rawParts 
}: { 
  projectId: string;
  modules: any[];
  parts: any[];
}) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [isIsolated, setIsIsolated] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'xray'>('standard');
  const [isXRay, setIsXRay] = useState(false);
  const [offsetModuleId, setOffsetModuleId] = useState<string | null>(null);

  // Processamento dos dados para o 3D
  const processedModules = useMemo(() => {
    if (!rawModules) return [];

    return rawModules.map((m, index) => {
      // Mock de posicionamento ilustrativo se não houver coordenadas
      const basePos: [number, number, number] = [
        (index % 5) * 1.5 - 3, 
        0, 
        Math.floor(index / 5) * 1.5
      ];
      
      // Aplicar AFASTAR visualmente (Apenas visual, Fidelity 5.1 Regra 11)
      const visualPosition: [number, number, number] = offsetModuleId === m.id 
        ? [basePos[0], basePos[1] + 0.5, basePos[2] + 0.5] // Deslocamento visual
        : basePos;

      const moduleParts = rawParts?.filter(p => p.module_id === m.id) || [];
      const pieces: PhysicalPiece3D[] = moduleParts.map(p => ({
        physicalId: p.id,
        partId: p.id,
        idXml: p.metadata?.id_xml || '',
        moduleSequence: index + 1,
        pieceCode: p.metadata?.piece_code || '',
        name: p.name,
        dimensions: { w: p.width_mm || 0, h: p.thickness_mm || 0, l: p.length_mm || 0 },
        material: p.material || '',
        color: p.metadata?.color || '',
        thickness: p.thickness_mm || 0,
        status: p.is_completed ? 'concluido' : 'pendente',
        edgeBanding: p.edge_banding
      }));

      return {
        id: m.id,
        idXml: m.id_xml || '',
        sequence: index + 1,
        name: m.name,
        width: m.width_mm || 500,
        height: m.height_mm || 700,
        depth: m.depth_mm || 550,
        positionConfirmed: false,
        position: visualPosition,
        pieces,
        selectedPieceId: selectedModuleId === m.id ? selectedPieceId : null
      };
    });
  }, [rawModules, rawParts]);

  const selectedModule = useMemo(() => 
    processedModules.find(m => m.id === selectedModuleId), 
    [processedModules, selectedModuleId]
  );

  const restoreScene = () => {
    setSelectedModuleId(null);
    setSelectedPieceId(null);
    setIsIsolated(false);
    setViewMode('standard');
    setIsXRay(false);
    setOffsetModuleId(null);
    if (typeof window !== 'undefined') {
      (window as any).isXRayActive = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-600" /> Visualização 3D Operacional
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Gêmeo Digital Industrial • Fidelidade 5.1
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="rounded-full bg-blue-50 border-blue-200 text-blue-600 font-black text-[9px] uppercase tracking-widest px-3 py-1">
            {processedModules.length} Módulos Reais
          </Badge>
          <Badge className="rounded-full bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none">
            Unidade: Milímetros (mm)
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        <Card className="lg:col-span-3 rounded-[2.5rem] border-none shadow-2xl bg-slate-100 overflow-hidden relative group h-full">
          <Canvas shadows dpr={[1, 2]}>
            <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={35} />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <Suspense fallback={null}>
              <SceneContent 
                modules={processedModules} 
                selectedId={selectedModuleId}
                isIsolated={isIsolated}
                isXRay={isXRay}
                onSelectModule={setSelectedModuleId}
                onSelectPiece={(physicalId) => {
                  window.dispatchEvent(new CustomEvent('highlight-piece', { 
                    detail: { physicalId } 
                  }));
                  toast.info(`Peça destacada: ${physicalId}`);
                }}
              />
              <Environment preset="city" />
            </Suspense>

            <OrbitControls 
              makeDefault 
              minPolarAngle={0} 
              maxPolarAngle={Math.PI / 1.75} 
            />
          </Canvas>

          {/* Overlay informativo fixo */}
          <div className="absolute top-6 left-6 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200/50 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">Posição Ilustrativa</p>
              </div>
              <p className="text-[8px] font-bold text-slate-500 uppercase leading-tight max-w-[160px]">
                Medidas confirmadas pelo arquivo técnico. Disposição em cena apenas para visualização.
              </p>
            </div>
          </div>

          {/* Controles da Cena */}
          <div className="absolute bottom-6 left-6 flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest bg-white/90 backdrop-blur shadow-sm hover:bg-white"
              onClick={restoreScene}
            >
              <RotateCw className="mr-2 h-4 w-4 text-blue-600" /> Restaurar
            </Button>
            <Button 
              variant={isIsolated ? "default" : "secondary"}
              size="sm" 
              className={cn(
                "rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest shadow-sm",
                isIsolated ? "bg-blue-600 text-white" : "bg-white/90 backdrop-blur text-slate-900"
              )}
              disabled={!selectedModuleId}
              onClick={() => setIsIsolated(!isIsolated)}
            >
              {isIsolated ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
              {isIsolated ? "Mostrar Tudo" : "Isolar"}
            </Button>

            <Button 
              variant={isXRay ? "default" : "secondary"}
              size="sm" 
              className={cn(
                "rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest shadow-sm",
                isXRay ? "bg-blue-600 text-white" : "bg-white/90 backdrop-blur text-slate-900"
              )}
              onClick={() => setIsXRay(!isXRay)}
            >
              <Layers className="mr-2 h-4 w-4" />
              {isXRay ? "Raio-X Ativo" : "Raio-X"}
            </Button>

            <Button 
              variant={offsetModuleId ? "default" : "secondary"}
              size="sm" 
              className={cn(
                "rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest shadow-sm",
                offsetModuleId ? "bg-blue-600 text-white" : "bg-white/90 backdrop-blur text-slate-900"
              )}
              disabled={!selectedModuleId}
              onClick={() => setOffsetModuleId(offsetModuleId ? null : selectedModuleId)}
            >
              <Maximize2 className={cn("mr-2 h-4 w-4", offsetModuleId ? "animate-pulse" : "")} />
              {offsetModuleId ? "Reagrupar" : "Afastar"}
            </Button>
          </div>

          <div className="absolute bottom-6 right-6 flex gap-2">
            <div className="bg-slate-900/90 backdrop-blur p-1 rounded-2xl flex gap-1">
               <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10 rounded-xl">
                 <ZoomIn className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10 rounded-xl">
                 <ZoomOut className="h-4 w-4" />
               </Button>
            </div>
          </div>
        </Card>

        {/* Painel Lateral */}
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {selectedModule ? (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detalhes do Módulo</h3>
                <Badge className="bg-blue-600 text-white text-[8px] uppercase">G{selectedModule.sequence}</Badge>
              </div>

              <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Módulo Selecionado</p>
                    <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{selectedModule.name}</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2 rounded-2xl text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Largura</p>
                      <p className="text-xs font-black text-slate-900">{selectedModule.width}<span className="text-[8px] ml-0.5">mm</span></p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-2xl text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Altura</p>
                      <p className="text-xs font-black text-slate-900">{selectedModule.height}<span className="text-[8px] ml-0.5">mm</span></p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-2xl text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Prof.</p>
                      <p className="text-xs font-black text-slate-900">{selectedModule.depth}<span className="text-[8px] ml-0.5">mm</span></p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Composição ({selectedModule.pieces.length} peças)</p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedModule.pieces.map((piece) => (
                        <div key={piece.physicalId} className="space-y-2 py-2 border-b border-slate-50 last:border-0 group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Layers className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[120px]">{piece.name}</p>
                                <p className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">
                                  {piece.dimensions.l} × {piece.dimensions.w} × {piece.thickness} mm
                                </p>
                              </div>
                            </div>
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              piece.status === 'concluido' ? "bg-green-500" : "bg-slate-200"
                            )} />
                          </div>
                          
                          <div className="flex gap-1 pl-11">
                            <Button 
                              variant="ghost" 
                              className="h-6 px-2 text-[7px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/50 hover:bg-blue-100 rounded-md"
                              onClick={() => {
                                // Navegação 3D -> Plano de Corte (Fidelity 5.1 Regra 7)
                                window.dispatchEvent(new CustomEvent('highlight-piece', { 
                                  detail: { physicalId: piece.physicalId } 
                                }));
                                toast.info(`Peça destacada no Plano de Corte.`);
                              }}
                            >
                              Ver no Plano
                            </Button>
                            <Button
                              asChild
                              className="h-6 px-2 text-[7px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md"
                            >
                              <Link 
                                to="/assembly/piece/$physicalId" 
                                params={{ physicalId: piece.physicalId }}
                                className="flex items-center gap-1"
                              >
                                <Badge className="bg-slate-900 text-white text-[7px] h-5 hover:bg-slate-800">PRODUÇÃO</Badge>
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-950 p-4">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 font-black uppercase text-[10px] tracking-widest"
                    onClick={() => {
                      const ids = selectedModule.pieces.map(p => p.physicalId);
                      ids.forEach(id => {
                        window.dispatchEvent(new CustomEvent('highlight-piece', { 
                          detail: { physicalId: id } 
                        }));
                      });
                      toast.info(`Módulo ${selectedModule.name} destacado no Plano.`);
                    }}
                  >
                    Destacar Módulo no Plano
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm">
                <Info className="h-8 w-8 text-slate-300" />
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Exploração de Ambiente</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">
                Selecione um módulo na cena 3D para visualizar dados técnicos e composição física.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
