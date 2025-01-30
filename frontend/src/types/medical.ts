export interface Patient {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  studyDate: Date;
  images: ImageStudy[];
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

export interface DicomStudy {
  id: string;
  type: 'MRI' | 'CT' | 'fMRI' | 'DTI';
  date: Date;
  study_instance_uid: string;
  patient_id: string;
  study_description?: string;
  series?: DicomSeries[];
} 