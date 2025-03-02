export interface ImageStudy {
  id: string;
  type: 'MRI' | 'CT' | 'fMRI' | 'DTI';
  date: Date;
  dicomPath: string;
  sequences?: MRISequence[];
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
  waveform?: number[];
}

export interface TumorAnalysis {
  volumeCc: number;
  location: string;
  eloquentAreas: string[];
  vesselInvolvement: string[];
  predictedResectionRate: number;
}

export interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'area';
  value: number;
  unit: string;
  points: { x: number; y: number }[];
}

export interface DicomImage {
  id: string;
  url: string;
}

export type Tool = 'measure' | 'window' | 'zoom' | 'pan';
export type SurgicalStep = 'planning' | 'execution' | 'closure';

export enum CrisisType {
  BLEEDING = 'bleeding',
  PRESSURE = 'pressure',
  CARDIAC = 'cardiac'
}

export interface Medication {
  name: string;
  dosage: string;
}

export interface PatientInfo {
  id: string;
  name: string;
  condition: string;
}

export interface PostopPlan {
  monitoring: string[];
  medications: Medication[];
}



export enum SimulationPhase {
  PREOP = 'PREOP',
  OPERATION = 'OPERATION',
  POSTOP = 'POSTOP'
} 