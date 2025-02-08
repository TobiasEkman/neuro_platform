// Service for interacting with model training service (port 5001)
class TrainingService {
  private baseUrl = '/api/training';

  async trainTumorModel(data: {
    training_images: any[];
    labels: any[];
    epochs?: number;
    batch_size?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/tumor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to train tumor model');
    return response.json();
  }

  async trainICPModel(data: {
    icp_readings: any[];
    patient_features: any[];
    epochs?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/icp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to train ICP model');
    return response.json();
  }
}

export const trainingService = new TrainingService(); 