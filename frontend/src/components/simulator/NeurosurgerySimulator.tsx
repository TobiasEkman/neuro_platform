import React, { useState } from 'react';
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
  const [phase, setPhase] = useState<SimulationPhase>(SimulationPhase.PREOP);

  const handlePhaseComplete = () => {
    // Handle phase completion logic
  };

  switch (phase) {
    case SimulationPhase.PREOP:
      return (
        <SimulatorPreopPlanning
          onComplete={handlePhaseComplete}
        />
      );
    // Add other cases
    default:
      return <div>Unknown phase</div>;
  }
};

export default NeurosurgerySimulator;

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