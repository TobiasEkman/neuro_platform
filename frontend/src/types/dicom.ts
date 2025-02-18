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