// Service for interacting with icp_monitoring Flask service (port 5006)
import { ICPReading, ICPPrediction } from '../types/medical';

export const icpService = {
    getCurrentReadings: async (patientId: string): Promise<ICPReading[]> => {
        const response = await fetch(`/api/icp/current/${patientId}`);
        if (!response.ok) throw new Error('Failed to fetch ICP readings');
        return response.json();
    },

    getPredictions: async (data: {
        readings: ICPReading[];
        ct_findings: any;
        vital_signs: any;
    }): Promise<ICPPrediction> => {
        const response = await fetch('/api/icp/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to get ICP predictions');
        return response.json();
    }
}; 