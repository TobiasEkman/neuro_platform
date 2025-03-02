import { Patient, ICPReading, TumorAnalysis } from '../types/medical';

export const demoPatient: Patient = {
  _id: 'demo_id',
  patient_id: 'PID_DEMO',
  name: 'Demo Patient',
  age: 45,
  gender: 'M',
  diagnosis: 'Glioblastoma',
  admission_date: '2024-03-20',
  studies: []
};

export const demoICPReadings: ICPReading[] = [
  {
    timestamp: new Date(),
    value: 15,
    location: 'Right frontal',
    waveform: [14, 15, 16, 15, 14, 15, 16, 15, 14, 15]
  }
];

export const demoTumorAnalysis: TumorAnalysis = {
  volumeCc: 45.2,
  location: 'Right temporal',
  eloquentAreas: ['Motor cortex', 'Speech area'],
  vesselInvolvement: ['MCA'],
  predictedResectionRate: 0.85
}; 