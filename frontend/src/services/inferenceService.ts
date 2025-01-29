// Service for interacting with local_inference Flask service (port 5004)
class InferenceService {
  private baseUrl = 'http://localhost:5004';

  async getDecryptionKey(keyData: string) {
    const response = await fetch(`${this.baseUrl}/get_decryption_key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: keyData }),
    });

    if (!response.ok) throw new Error('Failed to get decryption key');
    return response.json();
  }

  async getDecryptedModel(filename: string) {
    const response = await fetch(`${this.baseUrl}/get_decrypted_model/${filename}`);
    if (!response.ok) throw new Error('Failed to get decrypted model');
    return response.blob();
  }

  async trackUsage(data: any) {
    const response = await fetch(`${this.baseUrl}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to track usage');
    return response.json();
  }
}

export const inferenceService = new InferenceService(); 