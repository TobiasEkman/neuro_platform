import { 
  VitalSigns, 
  CrisisType, 
  Medication,
  SimulationPhase,
  PatientInfo,
  PostopPlan
} from '../../../types'; 

import SimulatorPreopPlanning from './SimulatorPreopPlanning';

export const NeurosurgerySimulator: React.FC = () => {
  // ... component code ...

  case SimulationPhase.PREOP:
    return (
      <SimulatorPreopPlanning
        onComplete={handlePhaseComplete}
        patientInfo={patientInfo}
      />
    );
};

// Direct API calls instead of using simulatorApi
const fetchProcedures = async () => {
    const response = await fetch('/api/simulator/procedures');
    if (!response.ok) throw new Error('Failed to fetch procedures');
    return response.json();
};

const fetchVitalSigns = async () => {
    const response = await fetch('/api/simulator/vital-signs');
    if (!response.ok) throw new Error('Failed to fetch vital signs');
    return response.json();
}; 