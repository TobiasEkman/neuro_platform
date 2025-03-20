export interface Patient {
  _id: string;
  patient_id: string;  // PID
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  admission_date?: string;
  discharge_date?: string;
  studyDate?: Date;
  images?: ImageStudy[];
  studies?: string[];  // Array of study UIDs
}

export interface ImageStudy {
  id: string;
  type: 'MRI' | 'CT' | 'fMRI' | 'DTI';
  date: Date;
  sequences?: MRISequence[];
  dicomPath: string;
}

export interface MRISequence {
  name: string;
  parameters: {
    TR: number;
    TE: number;
    sliceThickness: number;
  };
}

export interface ICPReading {
  timestamp: Date;
  value: number;
  location: string;
}

export interface CTFindings {
  edema_level: 'none' | 'mild' | 'moderate' | 'severe';
  midline_shift: number;  // in millimeters
  ventricle_compression: boolean;
  hemorrhage_present: boolean;
  hemorrhage_volume?: number;  // in milliliters
}

export interface VitalSigns {
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  temperature: number;
}

export interface VitalSignsShort {
  systolic: number;
  diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  temperature: number;
}

export interface ICPPrediction {
  predictions: number[];
  riskFactors: {
    trending_up: boolean;
    current_icp: number;
    compliance_decreasing: boolean;
  };
  recommendedActions: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    details: string;
  }[];
}

export interface TumorAnalysis {
  volumeCc: number;
  location: string;
  eloquentAreas: string[];
  vesselInvolvement: string[];
  predictedResectionRate: number;
}

export interface DicomInstance {
  sop_instance_uid: string;
  instance_number: number;
  file_path: string;
  rows?: number;
  columns?: number;
  pixel_spacing?: string;
}

export interface DicomSeries {
  series_uid: string;
  series_number: string;
  description: string;
  modality: string;
  instances: any[];
}

export interface DicomImage {
  sop_instance_uid: string;
  instance_number?: number;
  image_position?: number[];
  image_orientation?: number[];
  pixel_spacing?: number[];
  rows?: number;
  columns?: number;
  window_center?: number;
  window_width?: number;
  rescale_slope?: number;
  rescale_intercept?: number;
}

export interface DicomStudy {
  study_instance_uid: string;
  patient_name: string;
  study_date: string;
  study_time?: string;
  study_description?: string;
  accession_number?: string;
  patient_id: string;
}

export interface SearchResult {
  type: 'patient' | 'study' | 'series';
  id: string;
  text: string;
  patientId?: string;
  studyId?: string;
  studyData?: DicomStudy;
}

export interface DicomImportResult {
  message: string;
  studies?: DicomStudy[];
  error?: string;
  path?: string;
}

// Konverteringsfunktion om det behövs
export const convertVitalSigns = (vitals: VitalSigns): VitalSignsShort => ({
  systolic: vitals.blood_pressure_systolic,
  diastolic: vitals.blood_pressure_diastolic,
  heart_rate: vitals.heart_rate,
  respiratory_rate: vitals.respiratory_rate,
  oxygen_saturation: vitals.oxygen_saturation,
  temperature: vitals.temperature
});

export type Dimensions = [number, number, number];

export interface VolumeData {
  volume: Float32Array | number[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  spacing?: [number, number, number];
}

export interface WindowLevel {
  windowCenter: number;
  windowWidth: number;
}

export interface WindowPreset {
  name: string;
  windowCenter: number;
  windowWidth: number;
}

export interface DicomPatientSummary {
  patient_id: string;
  patient_name: string;
  birth_date?: string;
  sex?: string;
} 