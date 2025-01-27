export interface DicomStudy {
    study_instance_uid: string;
    patient_id: string;
    study_date: string;
    study_time: string;
    study_description: string;
}

export interface DicomSeries {
    series_instance_uid: string;
    study_instance_uid: string;
    series_number: number;
    series_description: string;
    modality: string;
}

export interface DicomInstance {
    sop_instance_uid: string;
    series_instance_uid: string;
    instance_number: number;
    file_path: string;
}

export interface DicomImportResult {
    message: string;
    studies: {
        patient_id: string;
        study_instance_uid: string;
        series_instance_uid: string;
        sop_instance_uid: string;
    }[];
} 