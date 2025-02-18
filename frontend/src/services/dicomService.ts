import axios, { AxiosError } from 'axios';
import { DicomStudy, DicomSeries, DicomImage, DicomImportResult, VolumeData } from '../types/dicom';
import { logger } from '../utils/logger';
import { convertStudy } from '../types/dicom';

// Configure axios defaults
axios.defaults.baseURL = '/api';

const BACKEND_URL = 'http://localhost:4000';

class DicomService {
  private baseUrl = '/dicom';

  // Main folder parsing method
  async parseDirectory(
    directoryPath: string, 
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<DicomImportResult> {
    try {
      logger.debug(`Parsing directory: ${directoryPath}`);
      
      const response = await axios.post(
        `${BACKEND_URL}/dicom/parse/folder`,
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
  async getImageData(filePath: string): Promise<ArrayBuffer> {
    try {
      // Use the path as-is, let the backend handle both absolute and relative paths
      const encodedPath = encodeURIComponent(filePath.replace(/\\/g, '/'));
      
      console.log('[DicomService] Requesting image with path:', filePath);

      const response = await axios.get(
        `${this.baseUrl}/image`,
        {
          params: { path: encodedPath },
          responseType: 'arraybuffer'
        }
      );

      // Add debug logging
      console.log('[DicomService] Got response:', {
        status: response.status,
        headers: response.headers,
        dataType: response.data.constructor.name,
        dataLength: response.data.byteLength
      });

      return response.data;
    } catch (error) {
      console.error('Error getting image data:', error);
      throw this.handleError(error, 'Failed to get image data');
    }
  }

  // Search studies with optional patient filter
  async searchStudies(query: string): Promise<DicomStudy[]> {
    try {
      const response = await axios.get(`${BACKEND_URL}/dicom/search`, {
        params: { q: query }
      });
      
      console.log('Raw study data:', response.data);
      
      // Convert the data to match our types
      const studies: DicomStudy[] = response.data.map(convertStudy);
      
      console.log('Formatted studies:', studies);
      return studies;
    } catch (error) {
      throw this.handleError(error, 'Failed to search studies');
    }
  }

  // Get series metadata
  async getSeriesMetadata(seriesInstanceUid: string) {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/dicom/series/${seriesInstanceUid}/metadata`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get series metadata');
    }
  }

  // Get volume data for MPR
  async getVolumeData(seriesInstanceUid: string): Promise<VolumeData> {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/dicom/series/${seriesInstanceUid}/volume`,
        { responseType: 'arraybuffer' }
      );
      
      const dimensions = response.headers['x-volume-dimensions']
        ?.split(',')
        .map(Number) as [number, number, number];
        
      return {
        volume: new Float32Array(response.data),
        dimensions: dimensions || [0, 0, 0]
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get volume data');
    }
  }

  // Get patients with DICOM studies
  async getPatientsWithDicom() {
    try {
      const response = await axios.get(`${BACKEND_URL}/patients/with-dicom`);
      
      response.data.forEach((patient: any) => {
        logger.debug('Patient ID check:', {
          id: patient.patient_id,
          hasValidFormat: /^PID_\d{4}$/.test(patient.patient_id)
        });
      });
      
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get patients with DICOM data');
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

  private handleError(error: unknown, defaultMessage: string): Error {
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