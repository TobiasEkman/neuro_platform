// Service for interacting with local_inference Flask service (port 5004)
export const inferenceService = {
  decryptModel: async (keyData: string) => {
    const response = await fetch('/api/inference/decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyData })
    });
    if (!response.ok) throw new Error('Failed to decrypt model');
    return response.json();
  },

  getModel: async (filename: string) => {
    const response = await fetch(`/api/inference/model/${filename}`);
    if (!response.ok) throw new Error('Failed to get model');
    return response.blob();
  },

  trackUsage: async (data: { action: string; details?: any }) => {
    const response = await fetch('/api/inference/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to track usage');
    return response.json();
  }
}; 