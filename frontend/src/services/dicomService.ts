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

import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

// Använd typassertioner för att få verktygen
const toolsInit = (csTools as any).init;
const addTool = (csTools as any).addTool;
const StackScrollTool = (csTools as any).StackScrollTool;
const ZoomTool = (csTools as any).ZoomTool;
const PanTool = (csTools as any).PanTool;
const WindowLevelTool = (csTools as any).WindowLevelTool;

export interface DicomMetadata {
  patientId: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID?: string;
  modality: string;
  studyDate?: string;
  seriesNumber?: number;
  seriesDescription?: string;
  filePath: string;
  metadata?: Record<string, any>;
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

  constructor() {
    this.baseUrl = '/api/dicom';
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

  async getSeriesForStudy(studyId: string): Promise<DicomSeries[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/series`, {
        params: { studyId }
      });
      return response.data.map((series: any) => ({
        id: series.series_uid,
        description: series.description || 'Untitled Series',
        modality: series.modality,
        numImages: series.number_of_images,
        studyInstanceUID: series.study_instance_uid,
        seriesInstanceUID: series.series_uid,
        metadata: series.metadata
      }));
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch series for study');
    }
  }

  // Get studies for a patient
  async getStudiesForPatient(patientId: string): Promise<DicomStudy[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/studies`, {
        params: { patientId }
      });

      // Validera data men returnera utan konvertering
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response data:', response.data);
        return [];
      }

      return response.data
        .filter(study => study && typeof study === 'object');
    } catch (error) {
      console.error('Failed to fetch studies:', error);
      throw this.handleError(error, 'Failed to fetch studies');
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

  // Ersätt befintliga getImageIds-metoder med denna centraliserade metod
  async getImageIds(options: { studyId?: string; seriesId?: string }): Promise<string[]> {
    try {
      console.log('[DicomService] Fetching imageIds with options:', options);
      const response = await axios.get(`${this.baseUrl}/imageIds`, { params: options });
      
      // Returnerar imageIds direkt från API:et 
      // (dessa är redan i wadouri: format från backend)
      return response.data.map((item: any) => item.imageId);
    } catch (error) {
      console.error('Error getting image IDs:', error);
      throw this.handleError(error, 'Failed to get image IDs');
    }
  }

  // Registrera WebWorker med WebWorkerManager
  registerCornerstoneWorker(): boolean {
    try {
      // Hämta WebWorkerManager från Cornerstone
      const webWorkerManager = cornerstone.getWebWorkerManager();
      
      if (!webWorkerManager) {
        console.warn('[DicomService] WebWorkerManager not available in this version of Cornerstone');
        return false;
      }
      
      // Skapa en WebWorker-funktion enligt dokumentationen
      const workerFn = () => {
        return new Worker(
          new URL('/cornerstone-worker.js', window.location.origin),
          { name: 'cornerstoneWorker' }
        );
      };
      
      // Registrera arbetaren med WebWorkerManager enligt dokumentationen
      webWorkerManager.registerWorker('cornerstoneImageLoader', workerFn, {
        maxWorkerInstances: navigator.hardwareConcurrency || 2,
        autoTerminateOnIdle: { enabled: true, idleTimeThreshold: 60000 }
      });
      
      console.log('[DicomService] WebWorker registered with WebWorkerManager');
      return true;
    } catch (error) {
      console.error('[DicomService] Failed to register WebWorker:', error);
      return false;
    }
  }

  // Exekvera en WebWorker-task
  async executeWorkerTask(methodName: string, args: any) {
    try {
      const webWorkerManager = cornerstone.getWebWorkerManager();
      if (!webWorkerManager) {
        throw new Error('WebWorkerManager not available');
      }
      
      return await webWorkerManager.executeTask(
        'cornerstoneImageLoader', 
        methodName, 
        args,
        {
          callbacks: [
            (progress: any) => {
              console.debug('WebWorker progress:', progress);
            },
          ],
        }
      );
    } catch (error) {
      console.error(`[DicomService] Failed to execute worker task ${methodName}:`, error);
      throw error;
    }
  }

  // Uppdatera anropet till this.registerCornerstoneWorker()
  async initializeDICOMImageLoader(): Promise<void> {
    try {
      const loader = cornerstoneDICOMImageLoader;
      
      // Använd vår egen worker med explicit typning
      (cornerstoneDICOMImageLoader as any).init({
        maxWebWorkers: navigator.hardwareConcurrency || 1,
        webWorkerPath: '/cornerstone-worker.js',
        taskConfiguration: {
          decodeTask: {
            codecsPath: '/cornerstone-worker.js',
          },
        }
      } as DicomImageLoaderOptions);

      // Registrera vår anpassade worker med WebWorkerManager
      this.registerCornerstoneWorker();

      // Säkerställ att cornerstone är tillgängligt innan vi sätter det
      if (cornerstone) {
        // Använd type assertion för att hantera externa properties
        (loader as any).external = {};
        (loader as any).external.cornerstone = cornerstone;
        
        // Registrera WADO-URI utan argument
        loader.wadouri.register();
      } else {
        throw new Error('Cornerstone is not initialized');
      }

      console.log('[DicomService] DICOM Image Loader initialized');
    } catch (error) {
      console.error('Error initializing DICOM Image Loader:', error);
      throw error;
    }
  }

  // Hämta metdata för en specifik SOP-instans
  async getInstanceMetadata(sopInstanceUid: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/metadata/${sopInstanceUid}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get instance metadata');
    }
  }

  // Registrera metadata provider för Cornerstone
  registerMetadataProvider() {
    cornerstone.metaData.addProvider((type: string, imageId: string) => {
      // Extrahera sopInstanceUid från imageId
      const sopInstanceUid = imageId.substring(imageId.lastIndexOf('/') + 1);
      
      // Returnera direkt från cache om det finns
      // Annars hämtas det genom API:et när det behövs
      return null; // Låt Cornerstone begära metadata on-demand
    });
  }

  // Uppdaterad initialize-metod för att inkludera DICOM Image Loader
  async initialize() {
    console.log("[DicomService] Starting initialization...");
    
    // Initiera Cornerstone3D
    console.log("[DicomService] Initializing Cornerstone3D...");
    await cornerstone.init();
    
    console.log("[DicomService] Initializing tools...");
    await toolsInit();
    
    // Registrera verktyg globalt
    console.log("[DicomService] Registering tools...");
    this.registerTools();
    
    // Initiera DICOM Image Loader
    console.log("[DicomService] Initializing DICOM Image Loader...");
    await this.initializeDICOMImageLoader();
    
    // Registrera metadata provider
    console.log("[DicomService] Registering metadata provider...");
    this.registerMetadataProvider();
    
    console.log('[DicomService] Initialization complete');
  }

  // Ny metod för att registrera verktyg globalt
  registerTools() {
    try {
      // Registrera verktyg globalt med addTool (separata anrop)
      addTool(StackScrollTool);
      addTool(ZoomTool);
      addTool(PanTool);
      addTool(WindowLevelTool);
      
      console.log('[DicomService] Verktyg registrerade globalt');
      return true;
    } catch (error) {
      console.error('[DicomService] Fel vid registrering av verktyg:', error);
      return false;
    }
  }

  // Ersätt den befintliga loadVolumeForSeries med denna
  async loadVolumeForSeries(seriesId: string): Promise<cornerstone.Types.IImageVolume> {
    try {
      // Hämta imageIds med den nya metoden
      const imageIds = await this.getImageIds({ seriesId });
      
      if (imageIds.length === 0) {
        throw new Error('No images found for series');
      }
      
      console.log(`[DicomService] Creating volume for ${imageIds.length} images`);
      
      // Skapa en volym med Cornerstone3D
      const volumeId = `volume-${seriesId}`;
      
      // Använd 'any' för att helt kringgå typkontrollen
      const volumeOptions = {
        imageIds,
        dimensions: [512, 512, imageIds.length],
        spacing: [1, 1, 1],
        orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1]
      } as any;
      
      // Skapa volymen
      const volume = await cornerstone.volumeLoader.createAndCacheVolume(
        volumeId,
        volumeOptions
      );
      
      // Starta laddningen av volymen
      await volume.load();
      
      return volume;
    } catch (error) {
      throw this.handleError(error, 'Failed to load volume');
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
      const response = await axios.get(`${this.baseUrl}/patients`);
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