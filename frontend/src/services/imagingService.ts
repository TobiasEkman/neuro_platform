// Service for interacting with imaging_data Flask service (port 5003)
class ImagingService {
  private baseUrl = 'http://localhost:5003/api';

  async parseFolder(folderPath: string) {
    const response = await fetch(`${this.baseUrl}/dicom/parse/folder`, {
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
    const response = await fetch(`${this.baseUrl}/dicom/parse/dicomdir`, {
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
    const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  }

  async analyzeDataset() {
    const response = await fetch(`${this.baseUrl}/dataset/analyze`);
    if (!response.ok) throw new Error('Dataset analysis failed');
    return response.json();
  }
}

export const imagingService = new ImagingService(); 