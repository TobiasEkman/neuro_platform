export interface Patient {
  _id: string;
  patient_id: string;  // PID
  name: string;
  dob: string | null;  // YYYY-MM-DD format
  sex: string;
  diagnosis: string;
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
  file_path: string;
  instance_number: number;
}

export interface DicomSeries {
  series_instance_uid: string;
  series_uid?: string;
  series_number: string;
  description: string;
  modality: string;
  instances: DicomInstance[];
  filePath: string;
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
  study_uid?: string;
  description: string;
  study_date: string;
  patient_id: string;
  series: DicomSeries[];
}

export interface DicomImportResult {
  message: string;
  studies?: DicomStudy[];
  error?: string;
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
  volume: number[];
  dimensions: Dimensions;
  spacing?: [number, number, number];
  windowCenter?: number;
  windowWidth?: number;
}

export interface WindowLevel {
  windowCenter: number;
  windowWidth: number;
} 