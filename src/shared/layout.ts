export interface NodePosition {
  x: number;
  y: number;
}

export interface WindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutMap {
  agents: Record<string, NodePosition>;
  windows?: Record<string, WindowFrame>;
  openWindows?: string[];
}
