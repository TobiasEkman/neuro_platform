// Service for interacting with icp_monitoring Flask service (port 5006)
class ICPService {
  private baseUrl = 'http://localhost:5006/api/monitoring';

  async predictICP(patientData: {
    readings: any[];
    ct_findings: any;
    vital_signs: any;
  }) {
    const response = await fetch(`${this.baseUrl}/icp/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) throw new Error('Failed to predict ICP');
    return response.json();
  }
}

export const icpService = new ICPService(); 