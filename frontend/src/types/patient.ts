export interface Patient {
  _id: string;
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  admission_date?: string;
  discharge_date?: string;
  studies?: Study[];
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