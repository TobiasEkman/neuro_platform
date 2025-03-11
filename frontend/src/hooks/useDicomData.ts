import { useState, useEffect } from 'react';
import dicomService from '../services/dicomService';
import { DicomStudy} from '../types/medical';

export const useDicomData = (patientId?: string) => {
    const [studies, setStudies] = useState<DicomStudy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStudies = async () => {
            try {
                setLoading(true);
                const query = patientId ? `patient:${patientId}` : '';
                const results = await dicomService.searchStudies(query);
                
                // Filtrera sökresultat för att få endast studier
                const studyResults = results
                    .filter(result => result.type === 'study' && result.studyData)
                    .map(result => result.studyData as DicomStudy);
                
                setStudies(studyResults);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch studies');
            } finally {
                setLoading(false);
            }
        };

        fetchStudies();
    }, [patientId]);

    return { studies, loading, error };
};

const udytoDicomStudy = (study: DicomStudy): DicomStudy => {
    return {
        ...study,
        _id: study.study_instance_uid,
        modalities: study.modality ? [study.modality] : [],
        num_series: study.series.length,
        num_instances: study.series.reduce((sum, s) => sum + s.instances.length, 0),
        series: study.series.map(s => ({
            ...s,
            series_uid: s.series_uid,
            filePath: s.instances[0]?.file_path || ''
        }))
    };
}; 