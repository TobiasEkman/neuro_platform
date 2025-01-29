import React from 'react';
import styled from 'styled-components';
import { CrisisType, Medication } from '../../types/simulator';

const CrisisPanel = styled.div`
  position: absolute;
  right: 320px;
  top: 20px;
  background: rgba(255, 0, 0, 0.9);
  padding: 20px;
  border-radius: 10px;
  color: white;
`;

const MedicationButton = styled.button<{ $selected?: boolean }>`
  margin: 5px;
  padding: 8px 15px;
  background: ${props => props.$selected ? '#007bff' : '#fff'};
  color: ${props => props.$selected ? '#fff' : '#000'};
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;

const MedicationList = styled.div`
  margin-top: 10px;
  font-size: 0.9em;
`;

interface CrisisManagerProps {
  crisisType: CrisisType;
  onMedicationAdminister: (medication: Medication) => void;
  medications: Medication[];
}

const CRISIS_MEDICATIONS: Record<string, Medication[]> = {
  bleeding: [
    { id: 'tranexamic', name: 'Tranexamic Acid', type: 'antifibrinolytic', timestamp: 0 },
    { id: 'norepinephrine', name: 'Norepinephrine', type: 'vasopressor', timestamp: 0 }
  ],
  seizure: [
    { id: 'lorazepam', name: 'Lorazepam', type: 'antiepileptic', timestamp: 0 },
    { id: 'phenytoin', name: 'Phenytoin', type: 'antiepileptic', timestamp: 0 }
  ],
  brain_swelling: [
    { id: 'mannitol', name: 'Mannitol', type: 'osmotic', timestamp: 0 },
    { id: 'dexamethasone', name: 'Dexamethasone', type: 'steroid', timestamp: 0 }
  ]
};

const CrisisManager: React.FC<CrisisManagerProps> = ({ 
  crisisType, 
  onMedicationAdminister, 
  medications 
}) => {
  const [selectedMed, setSelectedMed] = React.useState<Medication | null>(null);

  const handleMedicationSelect = (medication: Medication) => {
    setSelectedMed(medication);
    onMedicationAdminister({
      ...medication,
      timestamp: Date.now()
    });
  };

  if (!crisisType) return null;

  return (
    <CrisisPanel>
      <h3>CRISIS: {crisisType.toUpperCase()}</h3>
      <div>
        <h4>Available Medications:</h4>
        {CRISIS_MEDICATIONS[crisisType]?.map(med => (
          <MedicationButton
            key={med.id}
            $selected={selectedMed?.id === med.id}
            onClick={() => handleMedicationSelect(med)}
          >
            {med.name}
          </MedicationButton>
        ))}
      </div>
      <MedicationList>
        <h4>Recent Medications:</h4>
        {medications.slice(-3).map((med, idx) => (
          <div key={idx}>
            {med.name} - {new Date(med.timestamp).toLocaleTimeString()}
          </div>
        ))}
      </MedicationList>
    </CrisisPanel>
  );
};

export default CrisisManager; 