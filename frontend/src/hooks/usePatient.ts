import { useState, useEffect } from 'react';
import { Patient, VitalSigns } from '../types/medical';

interface UsePatientReturn {
    patient: Patient | null;
    vitals: VitalSigns | null;
    loading: boolean;
    error: string | null;
}

export const usePatient = (patientId: string): UsePatientReturn => {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [vitals, setVitals] = useState<VitalSigns | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                setLoading(true);
                // Fetch patient data
                const patientResponse = await fetch(`/api/patients/${patientId}`);
                if (!patientResponse.ok) throw new Error('Failed to fetch patient');
                const patientData = await patientResponse.json();
                setPatient(patientData);

                // Fetch latest vitals
                const vitalsResponse = await fetch(`/api/patients/${patientId}/vitals/latest`);
                if (!vitalsResponse.ok) throw new Error('Failed to fetch vitals');
                const vitalsData = await vitalsResponse.json();
                setVitals(vitalsData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchPatientData();
        // Poll for new vitals every 30 seconds
        const interval = setInterval(fetchPatientData, 30000);
        return () => clearInterval(interval);
    }, [patientId]);

    return { patient, vitals, loading, error };
}; 