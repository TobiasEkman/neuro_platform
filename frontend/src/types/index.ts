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

export interface DemoContextType {
  patient: Patient;
  icpReadings: ICPReading[];
  tumorAnalysis: TumorAnalysis;
}

export enum SimulationPhase {
  PREOP = 'PREOP',
  OPERATION = 'OPERATION',
  POSTOP = 'POSTOP'
}

export interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'area';
  value: number;
  unit: string;
}

export interface Tool {
  id: string;
  name: string;
  type: string;
}

export interface SurgicalStep {
  id: string;
  name: string;
  completed: boolean;
}

export interface CrisisType {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
} 