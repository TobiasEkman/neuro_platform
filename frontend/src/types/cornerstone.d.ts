declare module '@cornerstonejs/core' {
  export class RenderingEngine {
    constructor(id: string);
    destroy(): void;
    setViewports(viewportInputArray: any[]): void;
    render(): void;
    getViewport(id: string): StackViewport;
    enableElement(viewportInput: any): void;
  }

  export class StackViewport {
    setStack(imageIds: string[]): Promise<void>;
  }

  export class VolumeViewport {}

  export function enable(element: HTMLElement): Promise<void>;
  export function disable(element: HTMLElement): void;
  export function getViewport(element: HTMLElement): any;
  export function setViewport(element: HTMLElement, viewport: any): void;
  export function displayImage(element: HTMLElement, image: any): Promise<void>;
  export function createImageStack(arrayBuffer: ArrayBuffer): Promise<any[]>;
  export function createVolume(arrayBuffer: ArrayBuffer): Promise<any>;
  export function displayVolume(element: HTMLElement, volume: any, options: any): Promise<void>;

  export const cache: {
    getVolume(volumeId: string): Promise<any>;
  };

  export const volumeLoader: {
    createAndCacheVolume(volumeId: string, options: any): Promise<void>;
  };

  export const imageLoader: {
    createAndCacheLocalImage(imageId: string, arrayBuffer: ArrayBuffer): Promise<void>;
  };

  export const setVolumesForViewports: (
    renderingEngine: RenderingEngine,
    volumes: Array<{ volumeId: string }>,
    viewportIds: string[]
  ) => Promise<void>;

  export const utilities: any;
  export const init: () => Promise<void>;

  export interface ImageVolume {
    dimensions: number[];
    spacing: number[];
    origin: number[];
    direction: number[];
    scalarData: Float32Array;
    metadata: {
      Modality?: string;
      SeriesInstanceUID?: string;
      StudyInstanceUID?: string;
    };
  }

  export interface ViewportInput {
    element: HTMLDivElement;
    viewportId: string;
    type: 'stack' | 'volume';
    defaultOptions?: {
      background?: [number, number, number];
      orientation?: 'axial' | 'sagittal' | 'coronal';
    };
  }

  export interface DicomMetadata {
    StudyInstanceUID: string;
    SeriesInstanceUID: string;
    SOPInstanceUID: string;
    Rows: number;
    Columns: number;
    PixelSpacing?: [number, number];
    ImageOrientationPatient?: number[];
    ImagePositionPatient?: number[];
    SliceThickness?: number;
    SliceLocation?: number;
    PixelData?: Uint8Array | Int16Array;
  }
}

declare module '@cornerstonejs/tools' {
  export const Tools: {
    ToolGroupManager: {
      createToolGroup(name: string): ToolGroup;
    };
    WindowLevelTool: { toolName: string };
    PanTool: { toolName: string };
    ZoomTool: { toolName: string };
    StackScrollMouseWheelTool: { toolName: string };
    VolumeRotateMouseWheelTool: { toolName: string };
  };

  export class ToolGroup {
    addTool(toolName: string): void;
    setToolActive(toolName: string): void;
  }

  export function init(config?: any): void;
  export function addTool(tool: any): void;
  export function setToolActive(toolName: string, options: any): void;
  
  export const WwwcTool: any;
  export const ZoomTool: any;
  export const PanTool: any;
  export const LengthTool: any;
  export const AngleTool: any;
  export const Enums: any;
  export const utilities: any;
} 