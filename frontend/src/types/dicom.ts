export interface DicomStudy {
    study_instance_uid: string;
    patient_id: string;
    study_date: string;
    study_time: string;
    study_description: string;
}

export interface DicomSeries {
    seriesUID: string;
    studyUID: string;
    modality: string;
    description: string;
    numberOfImages: number;
    baseDirectory: string;  // Base directory for all images in series
}

export interface DicomInstance {
    sop_instance_uid: string;
    series_instance_uid: string;
    instance_number: number;
    file_path: string;
}

export interface DicomImage {
    instanceUID: string;
    seriesUID: string;
    studyUID: string;
    filePath: string;      // Path to the actual DICOM file
    rows: number;
    columns: number;
    windowCenter: number;
    windowWidth: number;
    pixelSpacing: [number, number];
}

export interface DicomImportResult {
    message: string;
    studies: {
        patient_id: string;
        study_instance_uid: string;
    }[];
} 