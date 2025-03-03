import { Types } from '@cornerstonejs/core';
import { VolumeViewport } from '@cornerstonejs/core';

declare module '@cornerstonejs/core' {
  export interface StackViewport {
    setStack(imageIds: string[]): Promise<void>;
    setCamera(options: { reset?: boolean }): void;
    getCurrentImageIdIndex(): number;
    addLayer(options: {
      imageIds: string[];
      options: {
        opacity: number;
        colormap: string;
        data: number[];
      };
    }): void;
    voi: {
      windowCenter: number;
      windowWidth: number;
    };
  }

  export interface VolumeViewport {
    setVolumes(volumes: Array<{
      volumeId: string;
      callback?: (props: { volumeActor: any }) => void;
    }>): Promise<void>;
    setSliceIndex(index: number): void;
    render(): void;
  }

  export class RenderingEngine {
    constructor(id: string);
    destroy(): void;
    setViewports(viewportInputs: ViewportInput[]): Promise<void>;
    getViewport(viewportId: string): StackViewport | VolumeViewport;
    render(): void;
    enableElement(viewport: ViewportInput): Promise<void>;
  }

  export function enable(element: HTMLElement): Promise<void>;
  export function disable(element: HTMLElement): void;
  export function getViewport(element: HTMLElement): StackViewport | VolumeViewport;
  export function setViewport(element: HTMLElement, viewport: any): void;
  export function displayImage(element: HTMLElement, image: any): Promise<void>;
  export function createImageStack(arrayBuffer: ArrayBuffer): Promise<any[]>;
  export function createVolume(arrayBuffer: ArrayBuffer): Promise<any>;
  export function displayVolume(element: HTMLElement, volume: any, options: any): Promise<void>;

  export const cache: {
    getVolume(volumeId: string): { dimensions: number[] };
    purgeCache(): void;
  };

  export const volumeLoader: {
    createAndCacheVolume(volumeId: string, options: VolumeOptions): Promise<any>;
    registerVolumeLoader(scheme: string, loader: VolumeLoader): void;
  };

  export const imageLoader: {
    createAndCacheLocalImage(imageId: string, arrayBuffer: ArrayBuffer): Promise<void>;
  };

  export function setVolumesForViewports(
    renderingEngine: RenderingEngine,
    volumes: Array<{ volumeId: string }>,
    viewportIds: string[]
  ): Promise<void>;

  export const utilities: any;
  export function init(): Promise<void>;

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
    element: HTMLDivElement | HTMLCanvasElement;
    viewportId: string;
    type: string;
    defaultOptions?: {
      orientation?: any;
      background?: number[];
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

  export interface EnabledElement {
    viewport: VolumeViewport;
  }

  export interface VolumeOptions {
    imageIds: string[];
    dimensions: number[];
    spacing: number[];
    orientation: number[];
    voxelData: ArrayBuffer;
  }

  export interface VolumeLoadObject {
    volumeId: string;
    dimensions: number[];
    spacing: number[];
    orientation: number[];
    scalarData: Float32Array;
    metadata?: Record<string, any>;
  }
}

declare module '@cornerstonejs/tools' {
  export interface ToolGroup {
    addTool(toolName: string): void;
    setToolActive(toolName: string, options?: {
      mouseButtonMask?: number;
      isTouchActive?: boolean;
    }): void;
  }

  export const Tools: {
    ToolGroupManager: {
      createToolGroup(name: string): ToolGroup;
    };
    WindowLevelTool: { toolName: string };
    PanTool: { toolName: string };
    ZoomTool: { toolName: string };
    StackScrollMouseWheelTool: { toolName: string };
  };

  export function init(): Promise<void>;
}

interface VolumeLoader {
  (volumeId: string, options?: any): Promise<VolumeLoadObject>;
} 