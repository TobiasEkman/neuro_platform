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

export type CrisisType = 'bleeding' | 'seizure' | 'brain_swelling' | null;

export interface Medication {
  id: string;
  name: string;
  type: string;
  timestamp: number;
}

export enum SimulationPhase {
  PREOP = 'preop',
  SURGERY = 'surgery',
  POSTOP = 'postop',
  DIAGNOSIS = 'diagnosis'
} 