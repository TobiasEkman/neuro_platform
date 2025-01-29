import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SimulationPhase, CrisisType } from '../../types/simulator';
import PreopPlanning from './PreopPlanning';
import BrainModel from './BrainModel';
import SurgicalTools from './SurgicalTools';
import VitalMonitor from './VitalMonitor';
import ControlPanel from './ControlPanel';
import CrisisManager from './CrisisManager';
import PostopCare from './PostopCare';

export const NeurosurgerySimulator: React.FC = () => {
  const [phase, setPhase] = useState<SimulationPhase>(SimulationPhase.PREOP);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [vitalSigns, setVitalSigns] = useState({
    bp: { systolic: 120, diastolic: 80 },
    heartRate: 75,
    o2sat: 98,
    icp: 10
  });
  const [activeCrisis, setActiveCrisis] = useState<CrisisType | null>(null);

  const handlePhaseComplete = () => {
    switch (phase) {
      case SimulationPhase.PREOP:
        setPhase(SimulationPhase.OPERATION);
        break;
      case SimulationPhase.OPERATION:
        setPhase(SimulationPhase.POSTOP);
        break;
      case SimulationPhase.POSTOP:
        // Handle simulation completion
        break;
    }
  };

  switch (phase) {
    case SimulationPhase.PREOP:
      return (
        <PreopPlanning
          onComplete={handlePhaseComplete}
          patientInfo={{
            age: 45,
            gender: "male",
            medicalHistory: ["Hypertension", "Diabetes"]
          }}
        />
      );
    case SimulationPhase.OPERATION:
      return (
        <>
          <VitalMonitor vitalSigns={vitalSigns} activeCrisis={activeCrisis} />
          <ControlPanel 
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            currentStep={1}
          />
          {activeCrisis && (
            <CrisisManager 
              crisisType={activeCrisis}
              onMedicationAdminister={() => {}}
              medications={[]}
            />
          )}
          <div style={{ width: '100%', height: '100vh' }}>
            <Canvas>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <BrainModel />
              <SurgicalTools selectedTool={selectedTool} brainMesh={null} />
            </Canvas>
          </div>
        </>
      );
    case SimulationPhase.POSTOP:
      return (
        <PostopCare 
          onComplete={handlePhaseComplete}
          postopData={{
            recoveryPlan: {
              mobilization: "",
              nutrition: "",
              woundCare: "",
              painManagement: "",
              monitoring: []
            }
          }}
          setPostopData={() => {}}
        />
      );
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