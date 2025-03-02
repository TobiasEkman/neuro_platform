import { Types } from '@cornerstonejs/core';
import { VolumeViewport } from '@cornerstonejs/core';

declare module '@cornerstonejs/core' {
  export class RenderingEngine {
    constructor(id: string);
    destroy(): void;
    setViewports(viewportInputs: any[]): void;
    render(): void;
    getViewport(viewportId: string): VolumeViewport;
    enableElement(viewportInput: ViewportInput): Promise<EnabledElement>;
    renderViewports(viewportIds: string[]): void;
  }

  export class StackViewport {
    setStack: (imageIds: string[]) => Promise<void>;
    setCamera: (options: { reset?: boolean }) => void;
  }

  export class VolumeViewport {
    setVolumes(volumes: Array<{
      volumeId: string;
      callback?: (props: { volumeActor: any }) => void;
    }>): Promise<void>;
    setSliceIndex(index: number): void;
    render(): void;
  }

  export function enable(element: HTMLElement): Promise<void>;
  export function disable(element: HTMLElement): void;
  export function getViewport(element: HTMLElement): any;
  export function setViewport(element: HTMLElement, viewport: any): void;
  export function displayImage(element: HTMLElement, image: any): Promise<void>;
  export function createImageStack(arrayBuffer: ArrayBuffer): Promise<any[]>;
  export function createVolume(arrayBuffer: ArrayBuffer): Promise<any>;
  export function displayVolume(element: HTMLElement, volume: any, options: any): Promise<void>;

  export const cache: {
    getVolume(volumeId: string): {
      dimensions: number[];
    };
  };

  export const volumeLoader: {
    createAndCacheVolume(volumeId: string, options: {
      imageIds: string[];
      dimensions: number[];
      spacing: number[];
      orientation: number[];
      voxelData: ArrayBuffer;
    }): Promise<any>;
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

  export namespace Enums {
    enum ViewportType {
      ORTHOGRAPHIC = 'ORTHOGRAPHIC',
      PERSPECTIVE = 'PERSPECTIVE'
    }
    
    enum OrientationAxis {
      AXIAL = 'AXIAL',
      SAGITTAL = 'SAGITTAL',
      CORONAL = 'CORONAL'
    }
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