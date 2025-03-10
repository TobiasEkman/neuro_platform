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



// Lägg till typdeklaration för Charls-codec 
type CharlsCodec = { 
  setConfig?: (config: { wasmPath: string }) => void 
};

// Ta bort den befintliga modulutökningen för dicom-image-loader
// declare module '@cornerstonejs/dicom-image-loader' { ... }

const convertStudy = (study: DicomStudy): DicomStudy => {
  if (!study) {
    console.error('Received undefined study in convertStudy');
    return {
      study_instance_uid: '',
      study_date: '',
      description: 'Invalid Study',
      series: [],
      _id: '',
      patient_id: '',
      modalities: [],
      num_series: 0,
      num_instances: 0
    };
  }

  return {
    ...study,
    _id: study.study_instance_uid,
    modalities: study.modality ? [study.modality] : [],
    num_series: study.series?.length || 0,
    num_instances: study.series?.reduce((sum, s) => sum + (s.instances?.length || 0), 0) || 0,
    series: study.series?.map(s => ({
      ...s,
      series_uid: s.series_instance_uid,
      filePath: s.instances?.[0]?.file_path || ''
    })) || []
  };
};


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


interface IImageLoadObject {
  image: any;
  imageId: string;
}

interface VolumeOptions {
  imageIds: string[];
  dimensions?: number[];
  spacing?: number[];
  orientation?: number[];
  voxelData?: any;
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
      // Konvertera sökresultat till rätt format om det är en studie
      return response.data.map((result: SearchResult) => {
        if (result.type === 'study' && result.studyData) {
          return {
            ...result,
            studyData: convertStudy(result.studyData)
          };
        }
        return result;
      });
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
      // Hämta alla studies
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
        id: series.series_instance_uid,
        description: series.description || 'Untitled Series',
        modality: series.modality,
        numImages: series.number_of_images,
        studyInstanceUID: series.study_instance_uid,
        seriesInstanceUID: series.series_instance_uid,
        metadata: series.metadata
      }));
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch series for study');
    }
  }

  async getStudiesForPatient(patientId: string): Promise<DicomStudy[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/studies`, {
        params: { patientId }
      });

      // Validera och konvertera data
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response data:', response.data);
        return [];
      }

      return response.data
        .filter(study => study && typeof study === 'object')
        .map(study => convertStudy(study));
    } catch (error) {
      console.error('Failed to fetch studies:', error);
      throw this.handleError(error, 'Failed to fetch studies');
    }
  }

  async getStudy(studyId: string): Promise<DicomStudy> {
    try {
      const response = await axios.get(`${this.baseUrl}/study/${studyId}`);
      return convertStudy(response.data);
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
      // Kontrollera att WebWorker-filer finns tillgängliga
      const filesToCheck = [
        '/cornerstoneWADOImageLoaderWebWorker.min.js',
        '/cornerstoneWADOImageLoaderCodecs.min.js',
        '/charlswasm_decode.wasm'
      ];
      
      for (const file of filesToCheck) {
        try {
          const response = await fetch(file, { method: 'HEAD' });
          if (!response.ok) {
            console.warn(`[DicomService] Fil saknas eller otillgänglig: ${file}`);
          }
        } catch (error) {
          console.warn(`[DicomService] Kunde inte kontrollera fil: ${file}`, error);
        }
      }
      
      const loader = cornerstoneDICOMImageLoader as any;
      
      // Importera codec-charls med dynamisk import och typdefinition
      try {
        // Lägg till explicit typtvång direkt vid importen för att tysta TypeScript
        const charlsModule = await import('@cornerstonejs/codec-charls' as any);
        const charlsCodec = charlsModule as unknown as CharlsCodec;
        
        if (charlsCodec.setConfig) {
          charlsCodec.setConfig({
            wasmPath: '/charlswasm_decode.wasm',
          });
          console.log('[DicomService] Charls codec konfigurerad');
        } else {
          console.warn('[DicomService] Charls codec hittades men setConfig är inte tillgänglig');
        }
      } catch (error) {
        console.warn('[DicomService] Kunde inte ladda Charls codec:', error);
      }

      // Initiera DICOM Image Loader med WebWorkers
      cornerstoneDICOMImageLoader.init({
        maxWebWorkers: navigator.hardwareConcurrency || 1,
        webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.min.js',
        taskConfiguration: {
          decodeTask: {
            codecsPath: '/cornerstoneWADOImageLoaderCodecs.min.js',
          },
        },
      });
      
      // Registrera vår anpassade worker med Cornerstone WebWorkerManager
      // enligt dokumentationen
      this.registerCornerstoneWorker();
      
      // Vi kan också fortsätta registrera de specifika filerna manuellt genom intern API
      if (loader.internal && loader.internal.config) {
        loader.internal.config.webWorkerPath = '/cornerstoneWADOImageLoaderWebWorker.min.js';
        loader.internal.config.codecsPath = '/cornerstoneWADOImageLoaderCodecs.min.js';
      }
      
      // Registrera WADO-URI-schemat oavsett konfiguration
      loader.external.cornerstone = cornerstone;
      loader.wadouri.register(cornerstone);
      
      console.log('[DicomService] DICOM Image Loader and custom workers initialized');
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
    // Initiera Cornerstone3D
    await cornerstone.init();
    await toolsInit();
    
    // Registrera verktyg globalt
    this.registerTools();
    
    // Initiera DICOM Image Loader
    await this.initializeDICOMImageLoader();
    
    // Registrera metadata provider
    this.registerMetadataProvider();
    
    console.log('[DicomService] Cornerstone, verktyg och DICOM Image Loader initialiserade');
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