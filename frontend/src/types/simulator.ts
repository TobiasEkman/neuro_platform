export interface VitalSigns {
  bp: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  o2sat: number;
  icp: number;
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
}

export interface SurgicalStep {
  id: number;
  name: string;
  description: string;
  validTools: string[];
}

export enum CrisisType {
  BLEEDING = 'bleeding',
  SEIZURE = 'seizure',
  BRAIN_SWELLING = 'brain_swelling'
}

export interface Medication {
  id: string;
  name: string;
  type: string;
  timestamp: number;
}

export interface PatientInfo {
  age: number;
  gender: string;
  medicalHistory: string[];
}

export interface PostopPlan {
  recoveryPlan: {
    mobilization: string;
    nutrition: string;
    woundCare: string;
    painManagement: string;
    monitoring: string[];
  };
}

export enum SimulationPhase {
  PREOP = 'PREOP',
  OPERATION = 'OPERATION',
  POSTOP = 'POSTOP',
  DIAGNOSIS = 'diagnosis'
} 