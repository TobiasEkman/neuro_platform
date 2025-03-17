export interface Patient {
  patient_id: string;
  patient_name: string;
  age?: number;
  gender?: string;
  diagnosis?: string;
}

export interface Study {
  studyInstanceUID: string;
  studyDate: string;
  description?: string;
  modality?: string;
  series: Array<{
    seriesInstanceUID: string;
    modality: string;
    description?: string;
    filePath: string;
  }>;
} 