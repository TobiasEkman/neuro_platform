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

// Single consolidated DICOM service
export const dicomService = {
  // DicomManager operations
  uploadFiles: async (files: FileList, patientId?: string): Promise<DicomImportResult> => {
    const metadata = [];
    
    for (const file of files) {
      try {
        // Read and parse DICOM locally
        const arrayBuffer = await file.arrayBuffer();
        const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer);
        
        // Extract only necessary metadata
        metadata.push({
          studyInstanceUID: dicomData.string('x0020000d'),
          seriesInstanceUID: dicomData.string('x0020000e'),
          modality: dicomData.string('x00080060'),
          studyDate: dicomData.string('x00080020'),
          localPath: file.webkitRelativePath // Store relative path only
        });
      } catch (error) {
        console.error(`Error parsing file ${file.name}:`, error);
      }
    }

    // Send only metadata to backend
    const response = await axios.post('/api/dicom/metadata', {
      metadata,
      patientId
    });
    
    return response.data;
  },

  searchStudies: async (query: string): Promise<DicomStudy[]> => {
    const response = await axios.get(`/dicom/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getStats: async () => {
    const response = await axios.get('/dicom/stats');
    return response.data;
  },

  // DicomViewer operations
  getImage: async (instanceUid: string): Promise<Blob> => {
    const response = await axios.get(`/dicom/image/${instanceUid}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getSeriesMetadata: async (seriesId: string) => {
    const response = await axios.get(`/dicom/series/${seriesId}/metadata`);
    return response.data;
  },

  getVolumeData: async (seriesId: string) => {
    const response = await axios.get(`/dicom/volume/${seriesId}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  },

  // Common operations
  testConnection: async (): Promise<{ status: string; message: string }> => {
    const response = await axios.get('/dicom/test');
    return response.data;
  },

  // Load DICOM series by ID
  loadSeries: async (seriesId: string): Promise<DicomSeries> => {
    const response = await fetch(`/api/dicom/series/${seriesId}`);
    return response.json();
  },

  async importDicomdir(dicomdirPath: string): Promise<DicomImportResult> {
    const response = await fetch('/api/dicom/parse/dicomdir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dicomdirPath }),
    });
    if (!response.ok) throw new Error('Failed to import DICOMDIR');
    return response.json();
  },

  async getPatients() {
    const response = await fetch('/api/patients');
    if (!response.ok) throw new Error('Failed to fetch patients');
    return response.json();
  },

  async getStudies(patientId: string): Promise<DicomStudy[]> {
    const response = await fetch(`/api/patients/${patientId}/studies`);
    if (!response.ok) throw new Error('Failed to fetch studies');
    return response.json();
  },

  async getSeries(studyId: string): Promise<DicomSeries[]> {
    const response = await fetch(`/api/studies/${studyId}/series`);
    if (!response.ok) throw new Error('Failed to fetch series');
    return response.json();
  },

  async getSlices(seriesId: string) {
    const response = await fetch(`/api/series/${seriesId}/slices`);
    if (!response.ok) throw new Error('Failed to fetch slices');
    return response.json();
  },

  async getSliceImage(sliceId: string): Promise<Blob> {
    const response = await fetch(`/api/slices/${sliceId}/image`);
    if (!response.ok) throw new Error('Failed to fetch slice image');
    return response.blob();
  },

  async getImagePixelData(instanceUID: string): Promise<ArrayBuffer> {
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
  },

  // Add method to load local DICOM files
  loadLocalDicom: async (relativePath: string): Promise<ArrayBuffer> => {
    const baseFolder = localStorage.getItem('dicomBaseFolder');
    if (!baseFolder) {
      throw new Error('DICOM folder not configured');
    }

    try {
      // Combine base folder with relative path
      const fullPath = `${baseFolder}/${relativePath}`;
      const fileHandle = await window.showOpenFilePicker({
        startIn: fullPath
      });
      const file = await fileHandle[0].getFile();
      return await file.arrayBuffer();
    } catch (error) {
      throw new Error(`Failed to load DICOM file: ${error}`);
    }
  }
}; 