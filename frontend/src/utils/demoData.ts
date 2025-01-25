import { Patient, ICPReading, TumorAnalysis } from '../types/medical';

export const generateDemoData = () => {
  const demoPatient: Patient = {
    id: 'DEMO-001',
    name: 'John Doe',
    age: 45,
    diagnosis: 'Right frontal glioblastoma with mass effect',
    studyDate: new Date(),
    images: [
      {
        id: 'IMG-001',
        type: 'MRI',
        date: new Date(),
        dicomPath: '/demo/mri_t1.dcm',
        sequences: [
          {
            name: 'T1 with contrast',
            parameters: {
              TR: 500,
              TE: 20,
              sliceThickness: 1.5
            }
          }
        ]
      }
    ]
  };

  const demoICPReadings: ICPReading[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: new Date(Date.now() - (100 - i) * 60000),
    value: Math.sin(i / 10) * 3 + 15 + Math.random() * 2,
    location: 'Right frontal',
    waveform: Array.from({ length: 10 }, () => Math.random() * 5 + 10)
  }));

  const demoTumorAnalysis: TumorAnalysis = {
    volumeCc: 45.3,
    location: 'Right frontal lobe',
    eloquentAreas: ['Motor cortex', 'Speech area'],
    vesselInvolvement: ['M3 branch of MCA'],
    predictedResectionRate: 85
  };

  return {
    patient: demoPatient,
    icpReadings: demoICPReadings,
    tumorAnalysis: demoTumorAnalysis
  };
}; 