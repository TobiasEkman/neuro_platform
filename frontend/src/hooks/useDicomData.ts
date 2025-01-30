import { useState, useEffect } from 'react';
import { CTFindings } from '../types/medical';
import { dicomManagerService } from '../services/dicomManagerService';
import { DicomStudy } from '../types/dicom';

interface UseDicomDataReturn {
    latestCTFindings: CTFindings | null;
    loading: boolean;
    error: string | null;
}

export const useDicomData = (patientId: string): UseDicomDataReturn => {
    const [latestCTFindings, setLatestCTFindings] = useState<CTFindings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const studies = await dicomManagerService.searchStudies(`patient:${patientId}`);
                
                // Find latest CT study
                const latestCTStudy = studies
                    .filter((study: DicomStudy) => study.type === 'CT')
                    .sort((a: DicomStudy, b: DicomStudy) => 
                        new Date(b.study_date).getTime() - new Date(a.study_date).getTime()
                    )[0];

                if (latestCTStudy) {
                    // Get CT analysis results
                    const response = await fetch(`/api/dicom/analyze/ct/${latestCTStudy.study_instance_uid}`);
                    if (!response.ok) throw new Error('Failed to analyze CT');
                    const findings = await response.json();
                    setLatestCTFindings(findings);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [patientId]);

    return { latestCTFindings, loading, error };
}; 