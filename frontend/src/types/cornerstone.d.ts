declare module '@cornerstonejs/core' {
  export function enable(element: HTMLElement): Promise<void>;
  export function disable(element: HTMLElement): void;
  export function getViewport(element: HTMLElement): any;
  export function setViewport(element: HTMLElement, viewport: any): void;
  export function displayImage(element: HTMLElement, image: any): Promise<void>;
  export function createImageStack(arrayBuffer: ArrayBuffer): Promise<any[]>;
  export function createVolume(arrayBuffer: ArrayBuffer): Promise<any>;
  export function displayVolume(element: HTMLElement, volume: any, options: any): Promise<void>;
}

declare module '@cornerstonejs/tools' {
  export function init(config?: any): void;
  export function addTool(tool: any): void;
  export function setToolActive(toolName: string, options: any): void;
  
  export const WwwcTool: any;
  export const ZoomTool: any;
  export const PanTool: any;
  export const LengthTool: any;
  export const AngleTool: any;
} 