// För filhantering och organisation
export const dicomManagerService = {
    uploadDicom: async (files: FileList): Promise<DicomImportResult> => {
        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('files', file));
        const response = await fetch('/api/dicom/upload', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Failed to upload DICOM files');
        return response.json();
    },

    getStats: async () => {
        const response = await fetch('/api/dicom/stats');
        return response.json();
    },

    searchStudies: async (query: string) => {
        const response = await fetch(`/api/dicom/search?q=${encodeURIComponent(query)}`);
        return response.json();
    },

    analyzeDataset: async () => {
        const response = await fetch('/api/dataset/analyze');
        return response.json();
    }
}; 