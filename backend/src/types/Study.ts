export interface Study {
  study_instance_uid: string;
  patient_id: string; // This should match the type of the Patient ID
  study_date: Date;
  study_description?: string;
  series: Series[];
}

export interface Series {
  series_instance_uid: string;
  series_number?: number;
  series_description?: string;
  modality?: string;
} 