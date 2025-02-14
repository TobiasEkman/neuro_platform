export interface DicomStudy {
    study_instance_uid: string;
    study_date: string;
    study_description?: string;
    modality?: string;
    type?: string;
    series?: DicomSeries[];
}

export interface DicomSeries {
    series_instance_uid: string;
    modality: string;
    series_number: number;
    series_description?: string;
}

export interface DicomInstance {
    sop_instance_uid: string;
    series_instance_uid: string;
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
} 