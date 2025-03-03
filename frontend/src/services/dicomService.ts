import axios, { AxiosError } from 'axios';
import { 
  DicomStudy, 
  DicomSeries, 
  DicomImage, 
  DicomImportResult, 
  VolumeData,
  WindowPreset,
  SearchResult
} from '../types/medical';
import { logger } from '../utils/logger';
import * as cornerstone from '@cornerstonejs/core';
import { imageLoader } from '@cornerstonejs/core';
import { volumeLoader } from '@cornerstonejs/core';
import { VolumeLoadObject } from '@cornerstonejs/core';
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

export class DicomService {
  // Använd direkt URL till backend
  private baseUrl = 'http://localhost:4000/api/dicom';

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
            const text = progressEvent.currentTarget.responseText;
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

  async getImageBatch(seriesId: string, start: number, count: number): Promise<ImageBatchResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/images/batch/${seriesId}`, {
          params: { start, count }
        }
      );
      return response.data;
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
    // För Cornerstone3D använder vi volumeLoader istället
    volumeLoader.registerVolumeLoader('cornerstoneStreamingImageVolume', this.loadVolume.bind(this));
  }

  private async loadVolume(volumeId: string, options: any): Promise<VolumeLoadObject> {
    try {
      const seriesId = volumeId.split(':')[1];
      const series = await this.getSeries(seriesId);
      
      // Konvertera spacing till number[]
      const spacing = series.instances[0].pixel_spacing?.split('\\').map(Number) || [1, 1, 1];
      
      // Ladda alla instances för serien
      const instances = await Promise.all(
        series.instances.map(async instance => {
          const response = await axios.get(
            `${this.baseUrl}/cornerstone/${series.series_instance_uid}?path=${instance.file_path}`,
            { responseType: 'arraybuffer' }
          );
          return response.data;
        })
      );

      // Skapa volymdata
      const dimensions = [
        series.instances[0].columns || 512,
        series.instances[0].rows || 512,
        series.instances.length
      ];

      // Kombinera alla instances till en volym
      const voxelData = new Float32Array(
        dimensions[0] * dimensions[1] * dimensions[2]
      );

      instances.forEach((buffer, index) => {
        const view = new Float32Array(buffer);
        const offset = index * dimensions[0] * dimensions[1];
        voxelData.set(view, offset);
      });

      return {
        volumeId,
        dimensions,
        spacing: spacing,  // Nu är detta alltid number[]
        orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        scalarData: voxelData,
        metadata: {
          Modality: series.modality,
          SeriesInstanceUID: series.series_instance_uid
        }
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to load volume');
    }
  }

  async getImageIds(seriesInstanceUid: string): Promise<string[]> {
    const response = await axios.get(`/api/dicom/series/${seriesInstanceUid}/instances`);
    const instances = response.data;
    
    return instances.map((instance: any) => 
      `dicom:/api/dicom/instances/${instance.sop_instance_uid}`
    );
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

  private handleError(error: unknown, defaultMessage = 'An error occurred'): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return new Error(
        axiosError.response?.data?.message || 
        axiosError.message || 
        defaultMessage
      );
    }
    return error instanceof Error ? error : new Error(defaultMessage);
  }
}

export default new DicomService(); 