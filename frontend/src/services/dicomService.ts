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
import * as dicomImageLoaderModule from '@cornerstonejs/dicom-image-loader';
import dicomParser from 'dicom-parser';

// Typkasta dicomImageLoader för att hantera saknade properties i typdeklarationen
const cornerstoneDICOMImageLoader = dicomImageLoaderModule as any;

// Destrukturera alla verktyg på ett ställe
const { 
  ToolGroupManager, 
  WindowLevelTool, 
  ZoomTool, 
  PanTool, 
  LengthTool,
  StackScrollTool,
  init: initTools,
  addTool
} = csTools as any;

// Definiera verktygsnamn som konstanter
const TOOL_NAMES = {
  STACK_SCROLL: 'StackScrollTool',
  WINDOW_LEVEL: 'WindowLevelTool',
  ZOOM: 'ZoomTool',
  PAN: 'PanTool',
  LENGTH: 'LengthTool'
};

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
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  pixelSpacing?: number[];
  sliceThickness?: number;
  sliceLocation?: number;
  instanceNumber?: number;
  windowCenter?: number;
  windowWidth?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number;
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
  private initialized: boolean = false;
  private toolGroup: any = null;
  private metadataCache: { [sopInstanceUid: string]: DicomMetadata } = {};

  constructor() {
    this.baseUrl = '/api/dicom';
  }

  /**
   * En alternativ, förenklad initialiseringsmetod
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[DicomService] Redan initialiserad, hoppar över');
      return;
    }

    try {
      console.log('[DicomService] Startar initialisering...');
      
      // Initiera kärnbiblioteken
      await cornerstone.init();
      console.log('[DicomService] Cornerstone initialiserat');
      
      // Förenklade sökvägar
      const webWorkerUrl = `${window.location.origin}/cornerstoneWADOImageLoaderWebWorker.min.js`;
      const codecsUrl = `${window.location.origin}/cornerstoneWADOImageLoaderCodecs.min.js`;
      
      console.log('[DicomService] Web worker URL:', webWorkerUrl);
      console.log('[DicomService] Codecs URL:', codecsUrl);
      
      // Testa att ladda worker-filen direkt för att verifiera att den finns
      try {
        const response = await fetch(webWorkerUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('[DicomService] Web worker fil hittades');
        } else {
          console.warn('[DicomService] Web worker fil kunde inte hittas:', webWorkerUrl);
        }
      } catch (e) {
        console.warn('[DicomService] Kunde inte testa web worker URL:', e);
      }
      
      // Låt oss verifiera vad cornerstoneDICOMImageLoader innehåller
      console.log('[DicomService] cornerstoneDICOMImageLoader-objekt:', Object.keys(cornerstoneDICOMImageLoader));
      
      // Enklare konfiguration baserad på rekommenderade exempel
      if (cornerstoneDICOMImageLoader.external) {
        cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
        console.log('[DicomService] Konfigurerade external.cornerstone');
      }
      
      if (cornerstoneDICOMImageLoader.webWorkerManager && 
          typeof cornerstoneDICOMImageLoader.webWorkerManager.initialize === 'function') {
        const workerConfig = {
          maxWebWorkers: navigator.hardwareConcurrency || 2, // Använd färre workers 
          startWebWorkersOnDemand: true,
          webWorkerPath: webWorkerUrl,
          taskConfiguration: {
            decodeTask: {
              codecsPath: codecsUrl
            }
          }
        };
        
        console.log('[DicomService] Konfigurerar web workers med:', workerConfig);
        cornerstoneDICOMImageLoader.webWorkerManager.initialize(workerConfig);
      }
      
      // Konfigurera loaders - logga mycket för att felsöka
      if (cornerstoneDICOMImageLoader.wadouri) {
        console.log('[DicomService] WADO-URI modul hittad');
        console.log('[DicomService] Funktioner i wadouri:', Object.keys(cornerstoneDICOMImageLoader.wadouri));
        
        if (typeof cornerstoneDICOMImageLoader.wadouri.loadImage === 'function') {
          console.log('[DicomService] loadImage-funktion hittad, registrerar...');
          
          // Registrera loadern med typkastning för att undvika TypeScript-fel
          const imageLoaderAny = cornerstone.imageLoader as any;
          if (imageLoaderAny && typeof imageLoaderAny.registerImageLoader === 'function') {
            imageLoaderAny.registerImageLoader('wadouri', cornerstoneDICOMImageLoader.wadouri.loadImage);
            console.log('[DicomService] WADO-URI laddare registrerad');
          } else {
            console.error('[DicomService] cornerstone.imageLoader.registerImageLoader finns inte');
          }
        } else {
          console.error('[DicomService] loadImage-funktion saknas i wadouri-modulen');
        }
      } else {
        console.error('[DicomService] WADO-URI modul saknas i cornerstoneDICOMImageLoader');
      }
      
      // Kontrollera om laddaren registrerades framgångsrikt, också med typkastning
      const imageLoaderAny = cornerstone.imageLoader as any;
      if (imageLoaderAny && typeof imageLoaderAny.getImageLoader === 'function') {
        const loader = imageLoaderAny.getImageLoader('wadouri');
        console.log('[DicomService] Kontrollerar WADO-URI laddare:', loader ? 'Registrerad' : 'Saknas');
        
        if (!loader) {
          console.error('[DicomService] WADO-URI laddare kunde inte registreras');
        }
      }
      
      // Initiera verktyg
      console.log('[DicomService] Initierar tools...');
      await initTools();
      
      // Registrera verktyg
      console.log('[DicomService] Registrerar verktyg...');
      this.registerTools();
      
      console.log('[DicomService] Alla tillgängliga verktyg i csTools:', Object.keys(csTools));
      
      // Ersätt koden för metadataprovider-registrering
      // Kontrollera först strukturen innan vi använder den
      if (cornerstoneDICOMImageLoader.wadors && 
          cornerstoneDICOMImageLoader.wadors.metaData && 
          typeof cornerstoneDICOMImageLoader.wadors.metaData.addProvider === 'function') {
        console.log('[DicomService] Registrerar wadors metadataprovider');
        cornerstoneDICOMImageLoader.wadors.metaData.addProvider(
          cornerstoneDICOMImageLoader.wadouri.metaDataProvider
        );
      } else {
        console.log('[DicomService] wadors.metaData.addProvider är inte tillgänglig, kontrollerar alternativa metoder');
        
        // Alternativa metoder att registrera metadata providers
        if (cornerstoneDICOMImageLoader.wadouri && 
            cornerstoneDICOMImageLoader.wadouri.metaDataProvider && 
            cornerstone.metaData && 
            typeof cornerstone.metaData.addProvider === 'function') {
          
          console.log('[DicomService] Registrerar wadouri metadataprovider via cornerstone.metaData');
          cornerstone.metaData.addProvider(cornerstoneDICOMImageLoader.wadouri.metaDataProvider);
          console.log('[DicomService] wadouri metadataprovider registrerad');
        } else {
          console.warn('[DicomService] Kunde inte registrera metadataprovider, metadata kan vara otillgängligt');
        }
      }

      // Logga tillgängliga metoder för felsökning
      console.log('[DicomService] cornerstone.metaData:', typeof cornerstone.metaData);
      if (cornerstone.metaData) {
        console.log('[DicomService] cornerstone.metaData metoder:', Object.keys(cornerstone.metaData));
      }

      console.log('[DicomService] cornerstoneDICOMImageLoader.wadouri:', typeof cornerstoneDICOMImageLoader.wadouri);
      if (cornerstoneDICOMImageLoader.wadouri) {
        console.log('[DicomService] cornerstoneDICOMImageLoader.wadouri metoder:', Object.keys(cornerstoneDICOMImageLoader.wadouri));
      }

      console.log('[DicomService] cornerstoneDICOMImageLoader.wadors:', typeof cornerstoneDICOMImageLoader.wadors);
      if (cornerstoneDICOMImageLoader.wadors) {
        console.log('[DicomService] cornerstoneDICOMImageLoader.wadors metoder:', Object.keys(cornerstoneDICOMImageLoader.wadors));
      }

      // Konfigurera DICOM-laddaren med säkerhets-check
      if (typeof cornerstoneDICOMImageLoader.configure === 'function') {
        console.log('[DicomService] Konfigurerar DICOM-laddaren');
        cornerstoneDICOMImageLoader.configure({
          useWebWorkers: true,
          decodeConfig: {
            convertFloatPixelDataToInt: false,
            use16Bits: true
          }
        });
      } else {
        console.warn('[DicomService] cornerstoneDICOMImageLoader.configure är inte en funktion');
      }

      console.log('[DicomService] Metadata providers registrerade');

      // Konfigurera dicomParser i external
      if (cornerstoneDICOMImageLoader.external === undefined) {
        console.log('[DicomService] cornerstoneDICOMImageLoader.external är undefined, skapar objekt');
        cornerstoneDICOMImageLoader.external = {
          dicomParser
        };
      } else if (cornerstoneDICOMImageLoader.external.dicomParser === undefined) {
        console.log('[DicomService] Lägger till dicomParser i external');
        cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
      }

      console.log('[DicomService] dicomParser konfigurerad:', !!cornerstoneDICOMImageLoader.external?.dicomParser);

      // Konfigurera thumbnail för cachehantering
      (cornerstone.cache as any).setMaxCacheSize(3000);
      
      console.log('[DicomService] Initieringen slutfördes framgångsrikt');
      this.initialized = true;

      // Lägg till en metod för att registrera metadataprovidern
      this.registerMetadataProvider();
    } catch (error) {
      console.error('[DicomService] Initialisering misslyckades:', error);
      if (error instanceof Error) {
        console.error('[DicomService] Felmeddelande:', error.message);
        console.error('[DicomService] Stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Registrerar verktyg i Cornerstone
   */
  private registerTools(): void {
    try {
      // Uppdaterad verktygsregistrering enligt Cornerstone Tools 3.0
      console.log('[DicomService] Registrerar verktyg...');
      
      // Logga verktygsdetaljer för felsökning
      console.log('[DicomService] WindowLevelTool:', typeof WindowLevelTool, WindowLevelTool);
      console.log('[DicomService] ZoomTool:', typeof ZoomTool, ZoomTool);
      console.log('[DicomService] PanTool:', typeof PanTool, PanTool);
      console.log('[DicomService] LengthTool:', typeof LengthTool, LengthTool);
      console.log('[DicomService] StackScrollTool:', typeof StackScrollTool, StackScrollTool);
      console.log('[DicomService] addTool funktion:', typeof addTool, addTool);
      
      // Registrera verktygen ett i taget med try/catch runt varje
      try {
        console.log('[DicomService] Registrerar WindowLevelTool...');
        addTool(WindowLevelTool);
      } catch (e) {
        console.error('[DicomService] Fel vid registrering av WindowLevelTool:', e);
      }
      
      try {
        console.log('[DicomService] Registrerar ZoomTool...');
        addTool(ZoomTool);
      } catch (e) {
        console.error('[DicomService] Fel vid registrering av ZoomTool:', e);
      }
      
      try {
        console.log('[DicomService] Registrerar PanTool...');
        addTool(PanTool);
      } catch (e) {
        console.error('[DicomService] Fel vid registrering av PanTool:', e);
      }
      
      try {
        console.log('[DicomService] Registrerar LengthTool...');
        addTool(LengthTool);
      } catch (e) {
        console.error('[DicomService] Fel vid registrering av LengthTool:', e);
      }
      
      try {
        console.log('[DicomService] Registrerar StackScrollTool...');
        addTool(StackScrollTool);
      } catch (e) {
        console.error('[DicomService] Fel vid registrering av StackScrollTool:', e);
      }
      
      console.log('[DicomService] WindowLevelTool.toolName:', WindowLevelTool?.toolName);
      console.log('[DicomService] ZoomTool.toolName:', ZoomTool?.toolName);
      console.log('[DicomService] PanTool.toolName:', PanTool?.toolName);
      console.log('[DicomService] LengthTool.toolName:', LengthTool?.toolName);
      console.log('[DicomService] StackScrollTool.toolName:', StackScrollTool?.toolName);
      
      console.log('[DicomService] Tools registered successfully');
    } catch (error) {
      console.error('[DicomService] Failed to register tools:', error);
      if (error instanceof Error) {
        console.error('[DicomService] Error message:', error.message);
        console.error('[DicomService] Error stack:', error.stack);
      }
      throw new Error('Failed to register tools');
    }
  }

  /**
   * Skapar en toolGroup för en viewport
   */
  createToolGroup(toolGroupId: string): any {
    if (!this.initialized) {
      throw new Error('Cornerstone not initialized. Call initialize() first.');
    }

    try {
      // Skapa en toolGroup
      this.toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
      
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
    } catch (error) {
      console.error('[DicomService] Failed to create tool group:', error);
      throw new Error('Failed to create tool group');
    }
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
  async getImageIds(params: { [key: string]: string }): Promise<DicomImageId[]> {
    try {
      console.log('[DicomService] Anropar URL:', '/api/dicom/imageIds');
      console.log('[DicomService] Med params:', params);
      
      const response = await axios.get('/api/dicom/imageIds', { params });
      console.log('[DicomService] Svarsstatuskod:', response.status);
      console.log('[DicomService] Svarsdata:', response.data);
      
      if (!Array.isArray(response.data)) {
        console.error('[DicomService] Oväntat svarsformat, förväntade array:', response.data);
        return [];
      }
      
      if (response.data.length > 0) {
        const firstItem = response.data[0];
        console.log('[DicomService] Kontrollerar fält i första bildobjektet:');
        console.log('- imageId:', !!firstItem.imageId);
        console.log('- sopInstanceUid:', !!firstItem.sopInstanceUid);
        console.log('- seriesInstanceUid:', !!firstItem.seriesInstanceUid);
        console.log('- instanceNumber:', !!firstItem.instanceNumber);
        
        if (firstItem.imageId) {
          console.log('[DicomService] ImageId format är:', firstItem.imageId);
        }
      }
      
      return response.data;
    } catch (error: unknown) {
      console.error('[DicomService] Fel vid hämtning av imageIds:', error);
      if (error instanceof Error) {
        console.error('[DicomService] Felmeddelande:', error.message);
      }
      if (axios.isAxiosError(error) && error.response) {
        console.error('[DicomService] Fel i svar:', error.response.data);
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
      
      // Kontrollera om vi har cachad metadata först
      if (this.metadataCache[sopInstanceUid]) {
        console.log('[DicomService] Returning cached metadata');
        return this.metadataCache[sopInstanceUid];
      }
      
      const response = await axios.get(`${this.baseUrl}/metadata/${sopInstanceUid}`);
      const metadata = response.data;
      
      // Cachea resultatet
      this.metadataCache[sopInstanceUid] = metadata;
      
      return metadata;
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw this.handleError(error, 'Failed to get metadata');
    }
  }

  // Lägg till en metod för att registrera metadataprovidern
  registerMetadataProvider(): void {
    console.log('[DicomService] Registering metadata provider');
    
    cornerstone.metaData.addProvider((type: string, imageId: string) => {
      if (!imageId.startsWith('wadouri:')) return;
      
      const sopInstanceUid = imageId.split('/').pop();
      if (!sopInstanceUid) {
        console.warn(`[DicomService] Kunde inte extrahera SOP Instance UID från ${imageId}`);
        return;
      }
      
      console.log(`[DicomService] Looking up ${type} for ${sopInstanceUid}`);
      
      const metadata = this.metadataCache[sopInstanceUid];
      if (!metadata) {
        console.warn(`[DicomService] No metadata found for ${sopInstanceUid}`);
        return;
      }
      
      if (type === 'imagePixelModule') {
        return {
          samplesPerPixel: metadata.samplesPerPixel || 1,
          photometricInterpretation: metadata.photometricInterpretation || 'MONOCHROME2',
          rows: metadata.rows || 512,
          columns: metadata.columns || 512,
          bitsAllocated: 16,
          bitsStored: 12,
          highBit: 11,
          pixelRepresentation: 0,
        };
      }
      
      if (type === 'voiLutModule') {
        return {
          windowCenter: metadata.windowCenter || 40,
          windowWidth: metadata.windowWidth || 400
        };
      }
      
      if (type === 'imagePlaneModule' && metadata.pixelSpacing) {
        return {
          pixelSpacing: metadata.pixelSpacing,
          imageOrientationPatient: [1, 0, 0, 0, 1, 0],
          imagePositionPatient: [0, 0, 0]
        };
      }
    }, 10);
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

  // Lägg till denna metod för att kontrollera om tjänsten är initialiserad
  isInitialized(): boolean {
    return this.initialized;
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

  // Lägg till en metod för att debugga DICOM-metadata
  logCornerstoneMetadata(imageId: string): void {
    try {
      console.log('[DicomService] Inspekterar metadata för:', imageId);
      
      // Hämta imagePixelModule som innehåller samplesPerPixel
      const imagePixelModule = cornerstone.metaData.get('imagePixelModule', imageId);
      console.log('[DicomService] imagePixelModule:', imagePixelModule);
      
      if (!imagePixelModule) {
        console.error('[DicomService] VARNING: imagePixelModule saknas helt i metadata!');
        
        // Kontrollera vilka metadatatyper som finns för denna bild
        console.log('[DicomService] Tillgängliga metadatatyper:');
        ['generalSeriesModule', 'imagePlaneModule', 'voiLutModule', 'modalityLutModule'].forEach(type => {
          const data = cornerstone.metaData.get(type, imageId);
          console.log(`- ${type}: ${data ? 'finns' : 'saknas'}`);
        });
        
        // Försök hämta raw DICOM-data
        const instance = cornerstone.metaData.get('instance', imageId);
        console.log('[DicomService] Raw DICOM instance:', instance);
      } else {
        // Logga alla viktiga egenskaper från imagePixelModule
        console.log('[DicomService] Viktiga bildegenskaper:');
        console.log('- samplesPerPixel:', imagePixelModule.samplesPerPixel);
        console.log('- photometricInterpretation:', imagePixelModule.photometricInterpretation);
        console.log('- rows:', imagePixelModule.rows);
        console.log('- columns:', imagePixelModule.columns);
        console.log('- bitsAllocated:', imagePixelModule.bitsAllocated);
        console.log('- bitsStored:', imagePixelModule.bitsStored);
        console.log('- pixelRepresentation:', imagePixelModule.pixelRepresentation);
      }
      
      // Implementera en egen version av getImageFrame-funktionen för felsökning
      const getDebugImageFrame = (imageId: string) => {
        const imagePixelModule = cornerstone.metaData.get('imagePixelModule', imageId);
        
        if (!imagePixelModule) {
          console.error('[DicomService] Kan inte skapa imageFrame - imagePixelModule saknas');
          return null;
        }
        
        return {
          samplesPerPixel: imagePixelModule.samplesPerPixel,
          photometricInterpretation: imagePixelModule.photometricInterpretation,
          planarConfiguration: imagePixelModule.planarConfiguration,
          rows: imagePixelModule.rows,
          columns: imagePixelModule.columns,
          bitsAllocated: imagePixelModule.bitsAllocated,
          bitsStored: imagePixelModule.bitsStored,
          pixelRepresentation: imagePixelModule.pixelRepresentation,
          smallestPixelValue: imagePixelModule.smallestPixelValue,
          largestPixelValue: imagePixelModule.largestPixelValue,
          imageId
        };
      };
      
      // Försök skapa en imageFrame
      const debugFrame = getDebugImageFrame(imageId);
      console.log('[DicomService] Debug Image Frame:', debugFrame);
      
    } catch (error) {
      console.error('[DicomService] Fel vid loggning av metadata:', error);
    }
  }
}

export default new DicomService(); 