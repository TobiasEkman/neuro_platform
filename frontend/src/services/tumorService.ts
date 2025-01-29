// Service for interacting with tumor analysis service (port 5005)
class TumorService {
  private baseUrl = 'http://localhost:5005/api/analysis';

  async analyzeTumor(imageId: string) {
    const response = await fetch(`${this.baseUrl}/tumor/${imageId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) throw new Error('Failed to analyze tumor');
    return response.json();
  }

  async predictMGMT(studyId: string) {
    const response = await fetch(`${this.baseUrl}/mgmt/${studyId}`);
    if (!response.ok) throw new Error('Failed to predict MGMT status');
    return response.json();
  }
}

export const tumorService = new TumorService(); 