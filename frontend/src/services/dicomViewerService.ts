// För bildvisning och manipulation
export const dicomViewerService = {
    getImage: async (instanceUid: string): Promise<Blob> => {
        const response = await fetch(`/api/dicom/image/${instanceUid}`);
        return response.blob();
    },

    getSeriesMetadata: async (seriesId: string): Promise<DicomSeries> => {
        const response = await fetch(`/api/dicom/series/${seriesId}/metadata`);
        return response.json();
    },

    getVolumeData: async (seriesId: string) => {
        const response = await fetch(`/api/dicom/volume/${seriesId}`);
        return response.arrayBuffer();
    }
}; 