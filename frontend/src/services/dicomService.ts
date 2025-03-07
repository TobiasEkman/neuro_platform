import axios, { AxiosError } from 'axios';
import { 
  DicomStudy, 
  DicomSeries, 
  DicomImage, 
  DicomImportResult, 
  VolumeData,
  WindowPreset,
  SearchResult,
  DicomPatientSummary
} from '../types/medical';
import { logger } from '../utils/logger';
// @ts-ignore - Saknade typdeklarationer för Cornerstone-bibliotek
import * as cornerstone from '@cornerstonejs/core';
// @ts-ignore
import { imageLoader } from '@cornerstonejs/core';
// @ts-ignore
import { volumeLoader } from '@cornerstonejs/core';
// @ts-ignore
import { VolumeLoadObject } from '@cornerstonejs/core';
// @ts-ignore
import * as dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import { init as csTools3dInit } from '@cornerstonejs/tools';

// Ta bort import från dicom.ts och använd convertStudy direkt här
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

// Lägg till DicomMetadata interface
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

interface ImageResponse {
  pixelData: number[][];
  rows: number;
  columns: number;
  windowCenter: number;
  windowWidth: number;
}

interface ImageBatchResponse {
  images: {
    instanceId: string;
    pixelData: number[][];
    rows: number;
    columns: number;
    windowCenter: number;
    windowWidth: number;
  }[];
  total: number;
  start: number;
  count: number;
}

interface ImageLoaderResult {
  promise: Promise<Record<string, any>>;
  cancelFn?: () => void;
  decache?: () => void;
}

// Definiera egna typer för att hantera Cornerstone API
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
          responseType: 'text',
          timeout: 0,  // Disable timeout
          onDownloadProgress: (progressEvent) => {
            const text = progressEvent.event?.target?.responseText || '';
            const lines = text.split('\n').filter((line: string) => line.trim());
            
            // Process only the last line for progress
            const lastLine = lines[lines.length - 1];
            if (lastLine) {
              try {
                const data = JSON.parse(lastLine);
                if (!data.complete && !data.error && onProgress) {
                  onProgress(data);
                }
              } catch (e) {
                // Ignore parse errors for incomplete lines
              }
            }
          }
        }
      );

      // Process final result
      const lines = response.data.split('\n').filter(Boolean);
      const lastLine = lines[lines.length - 1];
      const result = JSON.parse(lastLine);

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Directory parse error: ${error instanceof Error ? error.message : String(error)}`);
      throw this.handleError(error, 'Failed to parse directory');
    }
  }

  // Get image data for a specific instance
  async getImageData(path: string): Promise<Response> {
    try {
      const encodedPath = encodeURIComponent(path);
      const url = `${this.baseUrl}/image?path=${encodedPath}`;

      const response = await fetch(url);
      
      // Debug: Kolla exakt vad vi får
      const clone = response.clone();
      const rawData = await clone.text();
      console.log('[dicomService] Raw response:', rawData.substring(0, 200)); // Första 200 tecken
      
      const data = JSON.parse(rawData);
      console.log('[dicomService] Parsed data structure:', {
        keys: Object.keys(data),
        dataType: typeof data,
        hasPixelData: 'pixelData' in data,
        hasDimensions: 'rows' in data && 'columns' in data
      });

      return new Response(rawData, {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[dicomService] Error:', error);
      throw error;
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

  async getImageBatch(seriesId: string, startIndex: number, count: number): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/images/batch/${seriesId}`, 
        { params: { start: startIndex, count } }
      );
      return response.data.images;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch image batch');
    }
  }

  async getSeriesImageIds(seriesId: string): Promise<string[]> {
    try {
      const series = await this.getSeries(seriesId);
      if (!series?.instances) {
        throw new Error('No instances found');
      }

      // Skapa Cornerstone imageIds
      return series.instances.map(instance => 
        `wadouri:${this.baseUrl}/image?path=${encodeURIComponent(instance.file_path)}`
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to get series image IDs');
    }
  }

  // Lägg till getSeries metod
  async getSeries(seriesId: string): Promise<DicomSeries> {
    const response = await axios.get(`${this.baseUrl}/series/${seriesId}`);
    return response.data;
  }

  // Uppdatera registerImageLoader
  registerImageLoader() {
    // Använd any för att kringgå typkontroll
    (cornerstone.imageLoader as any).registerImageLoader('dicom', this.loadImage.bind(this));
  }

  private async loadImage(imageId: string): Promise<IImageLoadObject> {
    const filePath = imageId.replace('dicom://', '');
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/image`,
        { 
          params: { path: filePath },
          responseType: 'json'
        }
      );
      
      const imageData = response.data;
      
      const image = {
        imageId,
        minPixelValue: 0,
        maxPixelValue: 255,
        slope: imageData.rescaleSlope || 1,
        intercept: imageData.rescaleIntercept || 0,
        windowCenter: imageData.windowCenter,
        windowWidth: imageData.windowWidth,
        getPixelData: () => {
          const pixelData = new Uint16Array(imageData.rows * imageData.columns);
          for (let y = 0; y < imageData.rows; y++) {
            for (let x = 0; x < imageData.columns; x++) {
              pixelData[y * imageData.columns + x] = imageData.pixelData[y][x];
            }
          }
          return pixelData;
        },
        rows: imageData.rows,
        columns: imageData.columns,
        height: imageData.rows,
        width: imageData.columns,
        color: false,
        columnPixelSpacing: imageData.pixelSpacing?.[0] || 1,
        rowPixelSpacing: imageData.pixelSpacing?.[1] || 1,
        sizeInBytes: imageData.rows * imageData.columns * 2
      };
      
      return {
        image,
        imageId
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to load image');
    }
  }

  async getImageIds(seriesInstanceUid: string): Promise<string[]> {
    try {
      // Hämta serien för att få instances
      const series = await this.getSeries(seriesInstanceUid);
      if (!series?.instances) {
        throw new Error('No instances found');
      }

      // Skapa Cornerstone imageIds baserat på filsökvägar
      return series.instances.map(instance => 
        `dicom://${instance.file_path}`
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to get image IDs');
    }
  }

  async loadAndCacheImage(imageId: string) {
    const response = await fetch(imageId);
    const arrayBuffer = await response.arrayBuffer();
    return cornerstone.imageLoader.createAndCacheLocalImage(imageId, arrayBuffer);
  }

  async initialize() {
    // Initiera Cornerstone3D
    await cornerstone.init();
    await csTools3dInit();

    // Registrera metadata provider
    cornerstone.metaData.addProvider((type: string, imageId: string) => {
      return {
        imagePixelModule: {
          samplesPerPixel: 1,
          photometricInterpretation: 'MONOCHROME2',
          rows: 512,
          columns: 512,
          bitsAllocated: 16,
          bitsStored: 16,
          highBit: 15,
          pixelRepresentation: 0,
        }
      };
    });
  }

  // Lägg till en prefetch-metod
  async prefetchImages(imageIds: string[], priority = 0): Promise<void> {
    imageIds.forEach(imageId => {
      // Använd any för att kringgå typkontroll
      (cornerstone.imageLoader as any).loadAndCacheImage(imageId);
    });
  }

  // Lägg till en metod för att ladda hela volymen på en gång
  async loadVolumeForSeries(seriesId: string): Promise<cornerstone.Types.IImageVolume> {
    try {
      const imageIds = await this.getImageIds(seriesId);
      
      // Skapa en volym med Cornerstone3D
      // Använd any för att kringgå typkontroll
      const volume = await (cornerstone.volumeLoader as any).createAndCacheVolume(
        `volume-${seriesId}`,
        {
          imageIds,
          // Lägg till dessa fält för att uppfylla VolumeOptions
          dimensions: [512, 512, imageIds.length], // Standardvärden
          spacing: [1, 1, 1], // Standardvärden
          orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1] // Identitetsmatris
        } as VolumeOptions
      );
      
      // Ladda volymen
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

  // Lägg till getImageIdsForSeries-metoden i dicomService.ts
  async getImageIdsForSeries(seriesId: string): Promise<string[]> {
    try {
      // Hämta instanser för serien
      const response = await axios.get(`${this.baseUrl}/series/${seriesId}/instances`);
      const instances = response.data;
      
      // Skapa imageIds med dicom:// schema
      return instances.map((instance: any) => {
        return `dicom://${instance.relative_path}`;
      });
    } catch (error) {
      console.error('Error getting image IDs for series:', error);
      throw this.handleError(error, 'Failed to get image IDs for series');
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