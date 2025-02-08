// Service for interacting with simulator service (port 5007)
class SimulatorService {
  private baseUrl = '/api/simulator';

  async createSession() {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to create simulation session');
    return response.json();
  }

  async trackMetrics(sessionId: string, metrics: any) {
    const response = await fetch(`${this.baseUrl}/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, ...metrics }),
    });
    if (!response.ok) throw new Error('Failed to track metrics');
    return response.json();
  }

  async getProcedures() {
    const response = await fetch(`${this.baseUrl}/procedures`);
    if (!response.ok) throw new Error('Failed to get procedures');
    return response.json();
  }

  async getVitalSigns(sessionId: string) {
    const response = await fetch(`${this.baseUrl}/vital-signs?sessionId=${sessionId}`);
    if (!response.ok) throw new Error('Failed to get vital signs');
    return response.json();
  }
}

export const simulatorService = new SimulatorService(); 