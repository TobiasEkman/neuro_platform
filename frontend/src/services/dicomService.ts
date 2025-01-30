import { DicomStudy, DicomSeries, DicomImage, DicomImportResult } from '../types/dicom';

interface VolumeData {
  volume: number[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export const dicomService = {
  // Load DICOM series by ID
  loadSeries: async (seriesId: string): Promise<DicomSeries> => {
    const response = await fetch(`/api/dicom/series/${seriesId}`);
    return response.json();
  },

  // Get volume data for MPR views
  getVolumeData: async (seriesId: string) => {
    const response = await fetch(`/api/dicom/volume/${seriesId}`);
    if (!response.ok) throw new Error('Failed to load volume data');
    return response.json();
  },

  // Import DICOM files
  importFolder: async (folderPath: string): Promise<DicomImportResult> => {
    const response = await fetch('/api/dicom/parse/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath })
    });
    return response.json();
  },

  async importDicomdir(dicomdirPath: string): Promise<DicomImportResult> {
    const response = await fetch('/api/dicom/import/dicomdir', {
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

  async getSeriesMetadata(seriesUID: string): Promise<DicomSeries> {
    const response = await fetch(`/api/dicom/series/${seriesUID}/metadata`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load series metadata');
    }
    return response.json();
  },

  async testConnection(): Promise<{ status: string; message: string }> {
    const response = await fetch('/api/dicom/test');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Connection test failed');
    }
    return response.json();
  },

  searchDicom: async (query: string) => {
    const response = await fetch(`/api/dicom/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  getStats: async () => {
    const response = await fetch('/api/dicom/stats');
    return response.json();
  },

  analyzeDataset: async () => {
    const response = await fetch('/api/dicom/dataset/analyze');
    return response.json();
  },

  getImage: async (instanceUid: string): Promise<Blob> => {
    const response = await fetch(`/api/dicom/image/${instanceUid}`);
    return response.blob();
  },

  uploadDicom: async (files: FileList): Promise<DicomImportResult> => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
        formData.append('files', file);
    });
    
    const response = await fetch('/api/dicom/upload', {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error('Failed to upload DICOM files');
    return response.json();
  }
}; 