import React, { useState } from 'react';
import styled from 'styled-components';

const PlanningContainer = styled.div`
  padding: 40px;
  background: white;
  min-height: 100vh;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 30px;
`;

const Section = styled.div`
  margin-bottom: 30px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  margin-bottom: 10px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 14px;
`;

const Button = styled.button`
  background: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface PreopPlanningProps {
  onComplete: () => void;
  patientInfo: {
    age: number;
    gender: string;
    medicalHistory: string[];
  };
}

interface SurgicalPlan {
  approach: string;
  patientPosition: string;
  expectedDuration: string;
  notes: string;
}

const SimulatorPreopPlanning: React.FC<PreopPlanningProps> = ({ onComplete, patientInfo }) => {
  const [surgicalPlan, setSurgicalPlan] = useState<SurgicalPlan>({
    approach: '',
    patientPosition: '',
    expectedDuration: '',
    notes: ''
  });
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: keyof SurgicalPlan, value: string) => {
    setSurgicalPlan(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSubmit = () => {
    const required = ['approach', 'patientPosition', 'expectedDuration'];
    const missing = required.filter(field => !surgicalPlan[field as keyof SurgicalPlan]);
    
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    
    onComplete();
  };

  return (
    <PlanningContainer>
      <Title>Simulation - Pre-operative Planning</Title>
      
      <Section>
        <h2>Patient Information</h2>
        <p>Age: {patientInfo.age}</p>
        <p>Gender: {patientInfo.gender}</p>
        <p>Medical History: {patientInfo.medicalHistory.join(', ')}</p>
      </Section>

      <Section>
        <h2>Surgical Approach</h2>
        
        <FormGroup>
          <Label>Surgical Approach</Label>
          <Select 
            value={surgicalPlan.approach}
            onChange={(e) => handleInputChange('approach', e.target.value)}
          >
            <option value="">Select approach...</option>
            <option value="pterional">Pterional</option>
            <option value="suboccipital">Suboccipital</option>
            <option value="transcortical">Transcortical</option>
            <option value="transsylvian">Transsylvian</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Patient Position</Label>
          <Select
            value={surgicalPlan.patientPosition}
            onChange={(e) => handleInputChange('patientPosition', e.target.value)}
          >
            <option value="">Select position...</option>
            <option value="supine">Supine</option>
            <option value="prone">Prone</option>
            <option value="lateral">Lateral</option>
            <option value="park-bench">Park Bench</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Expected Duration (hours)</Label>
          <Input
            type="number"
            min="1"
            max="12"
            value={surgicalPlan.expectedDuration}
            onChange={(e) => handleInputChange('expectedDuration', e.target.value)}
          />
        </FormGroup>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <Button onClick={handleSubmit}>
          Proceed to Surgery
        </Button>
      </Section>
    </PlanningContainer>
  );
};

export default SimulatorPreopPlanning; 