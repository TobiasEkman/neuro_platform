import { useState, useEffect } from 'react';
import { patientService } from '../services/patientService';
import { Patient, VitalSigns } from '../types/medical';

export const usePatient = (patientId: string | null) => {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [vitals, setVitals] = useState<VitalSigns | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatient = async () => {
            if (!patientId) {
                setPatient(null);
                setVitals(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Hämta patient och vitals parallellt
                const [patientData, vitalsData] = await Promise.all([
                    patientService.getPatientById(patientId),
                    patientService.getPatientVitals(patientId)
                ]);

                if (!patientData) {
                    throw new Error(`Patient med ID '${patientId}' hittades inte.`);
                }

                setPatient(patientData);
                setVitals(vitalsData);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod vid hämtning av patientdata';
                setError(errorMessage);
                console.error('Error fetching patient:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPatient();
    }, [patientId]);

    return { patient, vitals, loading, error };
}; 