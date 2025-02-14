import axios from 'axios';
import { DicomStudy, DicomSeries, DicomImage, DicomImportResult } from '../types/dicom';
import dcmjs from 'dcmjs';

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
  private baseUrl = '/api/dicom';

  async parseLocalFolder(folderPath: string) {
    const response = await axios.post(`${this.baseUrl}/parse/folder`, {
      folderPath
    });
    if (!response.ok) throw new Error('Failed to parse DICOM folder');
    return response.data;
  }

  async parseDicomdir(dicomdirPath: string) {
    const response = await axios.post(`${this.baseUrl}/parse/dicomdir`, {
      dicomdirPath
    });
    if (!response.ok) throw new Error('Failed to parse DICOMDIR');
    return response.data;
  }

  async getImage(instanceUid: string) {
    const response = await axios.get(`${this.baseUrl}/image/${instanceUid}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async analyzeDataset() {
    const response = await axios.get(`${this.baseUrl}/dataset/analyze`);
    if (!response.ok) throw new Error('Dataset analysis failed');
    return response.data;
  }

  async searchStudies(query: string): Promise<DicomStudy[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search studies:', error);
      throw error;
    }
  }

  async getStats() {
    const response = await axios.get('/dicom/stats');
    return response.data;
  }

  async getSeriesMetadata(seriesId: string) {
    const response = await axios.get(`/dicom/series/${seriesId}/metadata`);
    return response.data;
  }

  async getVolumeData(seriesId: string) {
    const response = await axios.get(`/dicom/volume/${seriesId}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
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

  async loadLocalDicom(relativePath: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/file`, {
        params: { path: relativePath },
        responseType: 'arraybuffer'  // Important for binary data
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load DICOM file: ${error}`);
    }
  }

  async getPatientsWithDicom() {
    try {
      const response = await axios.get('/api/patients/with-dicom');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      throw error;
    }
  }

  async parseDirectory(directoryPath: string) {
    const response = await axios.post(`${this.baseUrl}/parse/folder`, {
      folderPath: directoryPath
    });
    return response.data;
  }

  async parseLocalDirectory(directoryPath: string) {
    const response = await axios.post(`${this.baseUrl}/parse/folder`, {
      folderPath: directoryPath
    });
    return response.data;
  }

  async getStudyDetails(studyInstanceUid: string): Promise<DicomStudy> {
    try {
      const response = await axios.get(`${this.baseUrl}/studies/${studyInstanceUid}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get study details:', error);
      throw error;
    }
  }
}

export default new DicomService(); 