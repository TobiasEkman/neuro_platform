import axios, { AxiosError } from 'axios';
import { 
  DicomStudy, 
  DicomSeries, 
  DicomImportResult, 
  WindowPreset,
  SearchResult,
  DicomPatientSummary
} from '../types/medical';
import { logger } from '../utils/logger';

import * as cornerstone from '@cornerstonejs/core';
import * as csTools from '@cornerstonejs/tools';

// Importera dicom-image-loader med typkastning för att hantera saknade properties
import * as dicomImageLoaderModule from '@cornerstonejs/dicom-image-loader';

// Typkasta dicomImageLoader för att hantera saknade properties i typdeklarationen
const cornerstoneDICOMImageLoader = dicomImageLoaderModule as any;

// Använd typassertioner för att få verktygen och funktioner
const toolsInit = (csTools as any).init;
const addTool = (csTools as any).addTool;
const ToolGroupManager = (csTools as any).ToolGroupManager;

// Typkasta cornerstone för att hantera saknade properties
const cornerstoneImageLoader = cornerstone as any;

// Definiera verktygsnamn som konstanter
const TOOL_NAMES = {
  STACK_SCROLL: 'StackScrollMouseWheelTool',
  WINDOW_LEVEL: 'WindowLevelTool',
  ZOOM: 'ZoomTool',
  PAN: 'PanTool',
  LENGTH: 'LengthTool'
};

// Typer för Cornerstone
const { 
  Enums: csEnums, 
  volumeLoader, 
  setVolumesForViewports, 
  cache 
} = cornerstone;

export interface DicomImageId {
  imageId: string;
  sopInstanceUid: string;
  seriesInstanceUid: string;
  studyInstanceUid: string;
  instanceNumber: number;
  filePath: string;
}

export interface DicomMetadata {
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
  rows: number;
  columns: number;
  pixelSpacing: number[];
  sliceThickness: number;
  sliceLocation: number;
  instanceNumber: number;
  windowCenter: number;
  windowWidth: number;
}

interface CustomLoaderOptions {
  maxWebWorkers: number;
  webWorkerPath: string;
  taskConfiguration: {
    decodeTask: {
      codecsPath: string;
    };
  };
}

// Deklarera eget interface för initfunktionen
declare module '@cornerstonejs/dicom-image-loader' {
  export function init(options: CustomLoaderOptions): void;
}

// Definiera interface för loader options
interface DicomImageLoaderOptions {
  maxWebWorkers: number;
  webWorkerPath: string;
  taskConfiguration?: {
    decodeTask: {
      codecsPath?: string;
    };
  };
}

export class DicomService {
  private baseUrl: string;
  private initialized: boolean = false;
  private toolGroup: any = null;

  constructor() {
    this.baseUrl = '/api/dicom';
  }

  /**
   * Initierar Cornerstone3D och dess verktyg
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[DicomService] Initializing Cornerstone3D...');
      
      // Initiera Cornerstone
      await cornerstone.init();
      
      // Initiera verktyg
      await toolsInit();
      
      // Konfigurera DICOM Image Loader
      cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
      cornerstoneDICOMImageLoader.external.dicomParser = (window as any).dicomParser;
      
      // Konfigurera webworkers för bildladdning
      const config = {
        maxWebWorkers: navigator.hardwareConcurrency || 4,
        startWebWorkersOnDemand: true,
      };
      
      cornerstoneDICOMImageLoader.webWorkerManager.initialize(config);
      
      // Registrera DICOM-bildladdare med typkastning
      cornerstoneImageLoader.imageLoader.registerImageLoader(
        'wadouri',
        cornerstoneDICOMImageLoader.wadouri.loadImage
      );
      
      // Registrera verktyg
      // Här använder vi verktygsnamn istället för direkta importer
      this.registerTools();
      
      console.log('[DicomService] Cornerstone3D initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('[DicomService] Failed to initialize Cornerstone3D:', error);
      throw new Error('Failed to initialize DICOM viewer');
    }
  }

  /**
   * Registrerar verktyg i Cornerstone
   */
  private registerTools(): void {
    try {
      // Hämta verktyg från csTools
      const tools = csTools as any;
      
      // Registrera verktyg
      addTool(tools.StackScrollMouseWheelTool);
      addTool(tools.WindowLevelTool);
      addTool(tools.ZoomTool);
      addTool(tools.PanTool);
      addTool(tools.LengthTool);
      
      console.log('[DicomService] Tools registered successfully');
    } catch (error) {
      console.error('[DicomService] Failed to register tools:', error);
      throw new Error('Failed to register tools');
    }
  }

  /**
   * Skapar en toolGroup för en viewport
   */
  createToolGroup(viewportId: string, renderingEngineId: string): any {
    if (!this.initialized) {
      throw new Error('Cornerstone not initialized. Call initialize() first.');
    }

    // Skapa en toolGroup
    this.toolGroup = ToolGroupManager.createToolGroup(viewportId);
    
    // Lägg till verktyg i toolGroup
    this.toolGroup.addTool(TOOL_NAMES.STACK_SCROLL);
    this.toolGroup.addTool(TOOL_NAMES.WINDOW_LEVEL);
    this.toolGroup.addTool(TOOL_NAMES.ZOOM);
    this.toolGroup.addTool(TOOL_NAMES.PAN);
    this.toolGroup.addTool(TOOL_NAMES.LENGTH);
    
    // Aktivera scrollhjul för stack navigation
    this.toolGroup.setToolActive(TOOL_NAMES.STACK_SCROLL);
    
    // Aktivera window/level som standard verktyg
    this.toolGroup.setToolActive(TOOL_NAMES.WINDOW_LEVEL, {
      bindings: [{ mouseButton: 1 }],
    });
    
    return this.toolGroup;
  }

  /**
   * Aktiverar ett verktyg i toolGroup
   */
  setToolActive(toolName: string): void {
    if (!this.toolGroup) {
      throw new Error('No tool group created. Call createToolGroup() first.');
    }
    
    // Inaktivera alla verktyg först
    this.toolGroup.setToolPassive(TOOL_NAMES.WINDOW_LEVEL);
    this.toolGroup.setToolPassive(TOOL_NAMES.ZOOM);
    this.toolGroup.setToolPassive(TOOL_NAMES.PAN);
    this.toolGroup.setToolPassive(TOOL_NAMES.LENGTH);
    
    // Aktivera det valda verktyget
    this.toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: 1 }],
    });
  }

  /**
   * Hämtar imageIds för en serie
   */
  async getImageIds(params: { studyId?: string; seriesId?: string }): Promise<DicomImageId[]> {
    try {
      console.log('[DicomService] Fetching imageIds with params:', JSON.stringify(params));
      
      // Kontrollera att params är ett objekt
      if (typeof params !== 'object' || params === null) {
        console.error('[DicomService] Invalid params:', params);
        params = {};
      }
      
      // Kontrollera att seriesId finns
      if (!params.seriesId) {
        console.error('[DicomService] seriesId is missing in params');
      }
      
      // Logga URL och params
      const url = `${this.baseUrl}/imageIds`;
      console.log('[DicomService] Calling URL:', url);
      console.log('[DicomService] With params:', params);
      
      const response = await axios.get(url, { params });
      
      console.log('[DicomService] Response status:', response.status);
      console.log('[DicomService] Response data length:', response.data.length);
      
      return response.data;
    } catch (error: unknown) {
      console.error('[DicomService] Error fetching imageIds:', error);
      if (error instanceof Error) {
        console.error('[DicomService] Error message:', error.message);
      }
      if (axios.isAxiosError(error) && error.response) {
        console.error('[DicomService] Error response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Hämtar metadata för en DICOM-instans
   */
  async getMetadata(sopInstanceUid: string): Promise<DicomMetadata> {
    try {
      console.log('[DicomService] Fetching metadata for:', sopInstanceUid);
      const response = await axios.get(`${this.baseUrl}/metadata/${sopInstanceUid}`);
      return response.data;
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw this.handleError(error, 'Failed to get metadata');
    }
  }

  // Main folder parsing method
  async parseDirectory(
    directoryPath: string, 
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<DicomImportResult> {
    try {
      logger.debug(`Parsing directory: ${directoryPath}`);
      
      const response = await axios.post(
        `${this.baseUrl}/parse/folder`,
        { folderPath: directoryPath },
        {
          responseType: 'stream',
          headers: {
            'Accept': 'text/event-stream'
          },
          timeout: 0,
          onDownloadProgress: (progressEvent) => {
            const text = progressEvent.event?.target?.responseText || '';
            const events = text.split('\n\n').filter(Boolean);
            
            const lastEvent = events[events.length - 1];
            if (lastEvent && lastEvent.startsWith('data: ')) {
              try {
                const data = JSON.parse(lastEvent.slice(6));
                if (!data.complete && !data.error && onProgress) {
                  onProgress(data);
                }
              } catch (e) {
                // Ignore parse errors for incomplete events
              }
            }
          }
        }
      );

      const events = response.data.split('\n\n').filter(Boolean);
      const lastEvent = events[events.length - 1];
      const result = JSON.parse(lastEvent.slice(6));

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Directory parse error: ${error instanceof Error ? error.message : String(error)}`);
      throw this.handleError(error, 'Failed to parse directory');
    }
  }


  // Search studies with optional patient filter
  async searchStudies(query: string): Promise<SearchResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      // Returnera data direkt utan konvertering
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to search studies');
    }
  }

  // Get series metadata
  async getSeriesMetadata(seriesId: string): Promise<DicomMetadata> {
    const response = await axios.get(`${this.baseUrl}/metadata/${seriesId}`);
    return response.data;
  }

  // Get volume data for MPR
  async getVolumeData(seriesId: string): Promise<{
    buffer: ArrayBuffer;
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/volume/${seriesId}`);
      
      // Konvertera JSON-data till Float32Array
      const data = response.data;
      const volumeArray = new Float32Array(data.volume);
      
      return {
        buffer: volumeArray.buffer,
        dimensions: data.dimensions
      };
    } catch (error) {
      console.error('Error fetching volume data:', error);
      throw this.handleError(error, 'Failed to fetch volume data');
    }
  }

  // Get patients with DICOM studies
  async getPatients(options: { withDicom?: boolean } = {}) {
    try {
      
      const response = await axios.get(`${this.baseUrl}/studies`);
      const studies = response.data;

      // Extrahera unika patienter från studies
      const patientMap = new Map();
      studies.forEach((study: any) => {
        if (!patientMap.has(study.patient_id)) {
          patientMap.set(study.patient_id, {
            _id: study._id,
            patient_id: study.patient_id,
            name: study.patient_name || 'Unknown',
            studies: [study.study_instance_uid]
          });
        } else {
          // Lägg till study ID till existerande patient
          patientMap.get(study.patient_id).studies.push(study.study_instance_uid);
        }
      });

      return Array.from(patientMap.values());
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Get dataset statistics
  async getStats() {
    try {
      const response = await axios.get(`${this.baseUrl}/stats`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get statistics');
    }
  }

  // Health check
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Connection test failed');
    }
  }

  async configureDicomPath(path: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/config/dicom-path`, { path });
    } catch (error) {
      throw this.handleError(error, 'Failed to configure DICOM path');
    }
  }

  async getDicomPath(): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/config/dicom-path`);
      return response.data.path;
    } catch (error) {
      throw this.handleError(error, 'Failed to get DICOM path');
    }
  }

  async getWindowPresets(): Promise<WindowPreset[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/window-presets`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch window presets');
    }
  }

  /**
   * Hämtar serier för en studie
   */
  async getSeriesForStudy(studyId: string): Promise<DicomSeries[]> {
    try {
      console.log('[DicomService] Fetching series for study:', studyId);
      const response = await axios.get(`${this.baseUrl}/series`, { 
        params: { studyId } 
      });
      return response.data;
    } catch (error) {
      console.error('Error getting series for study:', error);
      throw this.handleError(error, 'Failed to get series');
    }
  }

  /**
   * Hämtar studier för en patient
   */
  async getStudiesForPatient(patientId: string): Promise<DicomStudy[]> {
    try {
      console.log('[DicomService] Fetching studies for patient:', patientId);
      const response = await axios.get(`${this.baseUrl}/studies`, { 
        params: { patientId } 
      });
      return response.data;
    } catch (error) {
      console.error('Error getting studies for patient:', error);
      throw this.handleError(error, 'Failed to get studies');
    }
  }

  // Get a single study
  async getStudy(studyId: string): Promise<DicomStudy> {
    try {
      const response = await axios.get(`${this.baseUrl}/study/${studyId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch study');
    }
  }

  // Lägg till test-metod
  async testRouting(): Promise<void> {
    try {
      console.log('[DicomService] Starting routing test...');
      console.log('[DicomService] Base URL:', this.baseUrl);
      
      // Test health endpoint
      console.log('[DicomService] Testing health endpoint...');
      const healthUrl = `${this.baseUrl}/health`;
      console.log('[DicomService] Health URL:', healthUrl);
      
      const healthResponse = await axios.get(healthUrl);
      console.log('[DicomService] Health check response:', healthResponse.data);
    } catch (error) {
      console.error('[DicomService] Routing test failed:', error);
      throw this.handleError(error, 'Routing test failed');
    }
  }

  // Analysera DICOM-katalog utan att spara till databasen
  async analyzeDicomDirectory(
    directoryPath: string, 
    progressCallback?: (progress: { percentage: number }) => void
  ): Promise<DicomImportResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/analyze`, 
        { directory_path: directoryPath },
        { 
          onUploadProgress: (progressEvent) => {
            if (progressCallback && progressEvent.total) {
              const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              progressCallback({ percentage });
            }
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error analyzing DICOM directory:', error);
      throw error;
    }
  }

  // Hämta alla patienter
  async getAllPatients(): Promise<DicomPatientSummary[]> {
    try {
      console.log('[DicomService] Fetching all patients');
      const response = await axios.get(`${this.baseUrl}/patients`);
      
      // Logga svaret för debugging
      console.log('[DicomService] Patients response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  }

  // Importera DICOM-data till databasen
  async importDicomData(
    directoryPath: string,
    dicomData: any,
    progressCallback?: (progress: { percentage: number }) => void
  ): Promise<DicomImportResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/import`, 
        { 
          directory_path: directoryPath,
          dicom_data: dicomData
        },
        { 
          onUploadProgress: (progressEvent) => {
            if (progressCallback && progressEvent.total) {
              const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              progressCallback({ percentage });
            }
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error importing DICOM data:', error);
      throw error;
    }
  }

  private handleError(error: unknown, defaultMessage = 'An error occurred'): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return new Error(
        axiosError.response?.data?.message as string || 
        axiosError.message || 
        defaultMessage
      );
    }
    return error instanceof Error ? error : new Error(defaultMessage);
  }
}

export default new DicomService(); 