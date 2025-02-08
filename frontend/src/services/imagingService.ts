// Service for interacting with imaging_data Flask service (port 5003)
class ImagingService {
  async parseFolder(folderPath: string) {
    const response = await fetch('/api/dicom/parse/folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folderPath }),
    });
    if (!response.ok) throw new Error('Failed to parse DICOM folder');
    return response.json();
  }

  async parseDicomdir(dicomdirPath: string) {
    const response = await fetch('/api/dicom/parse/dicomdir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dicomdirPath }),
    });
    if (!response.ok) throw new Error('Failed to parse DICOMDIR');
    return response.json();
  }

  async search(query: string) {
    const response = await fetch('/api/search?q=' + encodeURIComponent(query));
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  }

  async analyzeDataset() {
    const response = await fetch('/api/dataset/analyze');
    if (!response.ok) throw new Error('Dataset analysis failed');
    return response.json();
  }
}

export const imagingService = new ImagingService(); 