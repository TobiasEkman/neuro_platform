import axios, { AxiosError } from 'axios';
import { DicomStudy, DicomSeries, DicomImage, DicomImportResult } from '../types/dicom';

// Configure axios defaults
axios.defaults.baseURL = '/api';

interface VolumeData {
  volume: number[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

class DicomService {
  private baseUrl = '/dicom';

  async parseLocalFolder(folderPath: string): Promise<DicomImportResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/parse/folder`, {
        folderPath
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to parse DICOM folder');
    }
  }

  async parseDicomdir(dicomdirPath: string): Promise<DicomImportResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/parse/dicomdir`, {
        dicomdirPath
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to parse DICOMDIR');
    }
  }

  async getImage(instanceUid: string): Promise<ArrayBuffer> {
    try {
      const response = await axios.get(`${this.baseUrl}/image/${instanceUid}`, {
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get image');
    }
  }

  async analyzeDataset(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/dataset/analyze`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Dataset analysis failed');
    }
  }

  async searchStudies(query: string): Promise<DicomStudy[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to search studies');
    }
  }

  async getStats() {
    try {
      const response = await axios.get(`${this.baseUrl}/stats`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get stats');
    }
  }

  async getSeriesMetadata(seriesId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/series/${seriesId}/metadata`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get series metadata');
    }
  }

  async getVolumeData(seriesId: string): Promise<ArrayBuffer> {
    try {
      const response = await axios.get(`${this.baseUrl}/volume/${seriesId}`, {
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get volume data');
    }
  }

  async testConnection() {
    const response = await axios.get('/dicom/test');
    return response.data;
  }

  async loadSeries(seriesId: string) {
    const response = await fetch(`/api/dicom/series/${seriesId}`);
    return response.json();
  }

  async getPatients() {
    const response = await fetch('/api/patients');
    if (!response.ok) throw new Error('Failed to fetch patients');
    return response.json();
  }

  async getStudies(patientId: string) {
    const response = await fetch(`/api/patients/${patientId}/studies`);
    if (!response.ok) throw new Error('Failed to fetch studies');
    return response.json();
  }

  async getSeries(studyId: string) {
    const response = await fetch(`/api/studies/${studyId}/series`);
    if (!response.ok) throw new Error('Failed to fetch series');
    return response.json();
  }

  async getSlices(seriesId: string) {
    const response = await fetch(`/api/series/${seriesId}/slices`);
    if (!response.ok) throw new Error('Failed to fetch slices');
    return response.json();
  }

  async getSliceImage(sliceId: string) {
    const response = await fetch(`/api/slices/${sliceId}/image`);
    if (!response.ok) throw new Error('Failed to fetch slice image');
    return response.blob();
  }

  async getImagePixelData(instanceUID: string) {
    try {
      const response = await fetch(`/api/dicom/image/${instanceUID}`, {
        headers: {
          'Accept': 'application/dicom'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load image');
      }
      
      return response.arrayBuffer();
    } catch (error) {
      console.error('Error loading DICOM image:', error);
      throw error;
    }
  }

  async loadLocalDicom(relativePath: string): Promise<ArrayBuffer> {
    try {
      const response = await axios.get(`${this.baseUrl}/file`, {
        params: { path: relativePath },
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to load DICOM file');
    }
  }

  async getPatientsWithDicom(): Promise<Array<{
    _id: string;
    pid: string;
    name: string;
    studies: Array<{
      studyInstanceUID: string;
      studyDate: string;
      series: Array<{
        seriesInstanceUID: string;
        modality: string;
        filePath: string;
      }>;
    }>;
  }>> {
    try {
      const response = await axios.get('/patients/with-dicom');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch patients');
    }
  }

  async parseDirectory(directoryPath: string) {
    const response = await axios.post(`${this.baseUrl}/parse/folder`, {
      folderPath: directoryPath
    });
    return response.data;
  }

  async parseLocalDirectory(directoryPath: string): Promise<DicomImportResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/parse/folder`, {
        folderPath: directoryPath
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to parse directory');
    }
  }

  async getStudyDetails(studyInstanceUid: string): Promise<DicomStudy> {
    try {
      const response = await axios.get(`${this.baseUrl}/studies/${studyInstanceUid}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get study details');
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