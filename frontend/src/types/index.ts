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