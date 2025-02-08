import axios from 'axios';

const IMAGING_SERVICE_URL = process.env.REACT_APP_IMAGING_SERVICE_URL || 'http://localhost:5003';

// För bildvisning och manipulation
export const dicomViewerService = {
    getImage: async (instanceUid: string): Promise<Blob> => {
        try {
            const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/image/${instanceUid}`, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching DICOM image:', error);
            throw error;
        }
    },

    getSeriesMetadata: async (seriesId: string) => {
        try {
            const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/series/${seriesId}/metadata`);
            return response.data;
        } catch (error) {
            console.error('Error fetching series metadata:', error);
            throw error;
        }
    },

    getVolumeData: async (seriesId: string) => {
        const response = await fetch(`/api/dicom/volume/${seriesId}`);
        return response.arrayBuffer();
    },

    searchStudies: async (query: string) => {
        try {
            const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/search?q=${encodeURIComponent(query)}`);
            return response.data;
        } catch (error) {
            console.error('Error searching studies:', error);
            throw error;
        }
    }
}; 