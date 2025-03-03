interface PreprocessingOptions {
  mode: 'gpu' | 'cpu' | 'robex';
  defacing: boolean;
  batchProcessing: boolean;
}

interface SegmentationOptions {
  models: string[];
  fusion: 'simple' | 'majority';
}

interface FusionOptions {
  method: 'simple' | 'majority';
}

// Service for interacting with tumor analysis service (port 5005)
class TumorService {
  private baseUrl = '/api/analysis';

  async analyzeTumor(imageId: string, approach: string) {
    const response = await fetch(`${this.baseUrl}/tumor/${imageId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ approach })
    });
    if (!response.ok) throw new Error('Failed to analyze tumor');
    return response.json();
  }

  async predictMGMT(imageId: string) {
    const response = await fetch(`${this.baseUrl}/mgmt/${imageId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) throw new Error('Failed to predict MGMT status');
    return response.json();
  }

  // Ny metod för att hämta tillgängliga MRI-sekvenser
  async getAvailableSequences(studyId: string) {
    const response = await fetch(`${this.baseUrl}/sequences/${studyId}`);
    if (!response.ok) throw new Error('Failed to fetch available sequences');
    return response.json();
  }

  // Ny metod för att validera sekvenser innan MGMT-analys
  async validateSequences(studyId: string) {
    const response = await fetch(`${this.baseUrl}/validate-sequences/${studyId}`);
    if (!response.ok) throw new Error('Failed to validate sequences');
    return response.json();
  }

  async preprocessImages(imageId: string, options: PreprocessingOptions) {
    const response = await fetch(`${this.baseUrl}/preprocess/${imageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      throw new Error('Preprocessing failed');
    }
    return response.json();
  }

  async segmentTumor(imageId: string, options: SegmentationOptions) {
    const response = await fetch(`${this.baseUrl}/segment/${imageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      throw new Error('Segmentation failed');
    }
    return response.json();
  }

  async fuseSegmentations(imageId: string, options: { method: 'simple' | 'majority' }) {
    const response = await fetch(`${this.baseUrl}/fuse/${imageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      throw new Error('Fusion failed');
    }
    return response.json();
  }
}

export const tumorService = new TumorService(); 