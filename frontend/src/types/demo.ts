import type { Patient, ICPReading, TumorAnalysis } from './medical';

export interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  demoData: {
    patient: Patient;
    icpReadings: ICPReading[];
    tumorAnalysis: TumorAnalysis;
  };
} 