import { DicomStudy as MedicalDicomStudy, DicomSeries as MedicalDicomSeries } from './medical';

export interface DicomStudy {
    _id: string;
    study_instance_uid: string;
    description: string;
    study_date: string;  // Format: "YYYY-MM-DD"
    study_time?: string; // Format: "HH:MM:SS"
    accession_number?: string;
    patient_id: string;
    modalities: string[];
    num_series: number;
    num_instances: number;
    series: DicomSeries[];
}

export interface DicomSeries {
    series_uid: string;
    series_number: number;
    series_instance_uid: string;  // Added this field
    description: string;
    modality: string;
    instances: DicomInstance[];
}

export interface DicomInstance {
    sop_instance_uid: string;
    instance_number: number;
    file_path: string;
}

export interface DicomImage {
    sop_instance_uid: string;
    instance_number: number;
    rows: number;
    columns: number;
    file_path: string;
}

export interface DicomImportResult {
    message: string;
    studies: DicomStudy[];
    path: string;
}

export interface VolumeData {
    volume: Float32Array;
    dimensions: [number, number, number];
    spacing?: [number, number, number];
    windowCenter?: number;
    windowWidth?: number;
}

// Helper function to convert types
export const convertStudy = (study: any): MedicalDicomStudy => ({
  study_instance_uid: study.study_instance_uid || study.study_uid,
  study_uid: study.study_uid,
  description: study.description || '',
  study_date: study.study_date || '',
  patient_id: study.patient_id || '',
  series: study.series?.map((s: any) => ({
    series_instance_uid: s.series_instance_uid || s.series_uid,
    series_uid: s.series_uid,
    series_number: String(s.series_number), // Convert to string
    description: s.description || s.series_description || '',
    modality: s.modality || 'unknown',
    instances: s.instances || [],
    filePath: s.filePath || s.file_path || s.instances?.[0]?.file_path
  })) || []
}); 