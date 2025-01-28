import React, { useState } from 'react';
import styled from 'styled-components';

const WorkupContainer = styled.div`
  padding: 20px;
  background: white;
  height: 100vh;
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 30px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin-bottom: 20px;
`;

const TestButton = styled.button<{ $completed?: boolean }>`
  padding: 10px 20px;
  margin: 5px;
  background: ${props => props.$completed ? '#2ecc71' : '#3498db'};
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: ${props => props.$completed ? '#27ae60' : '#2980b9'};
  }

  &:disabled {
    background: #95a5a6;
    cursor: not-allowed;
  }
`;

const ResultsPanel = styled.div`
  background: white;
  padding: 15px;
  border-radius: 5px;
  margin-top: 10px;
  border: 1px solid #e0e0e0;
`;

const InfoText = styled.p`
  color: #7f8c8d;
  margin: 5px 0;
`;

interface DiagnosticTests {
  bloodwork: boolean;
  mri: boolean;
  biopsy: boolean;
}

interface DiagnosticWorkupProps {
  onComplete: () => void;
  voCase: {
    patientInfo: {
      age: number;
      gender: string;
      symptoms: {
        duration: string;
      };
    };
    riskFactors: string[];
    labResults: {
      wbc: number;
      esr: number;
      crp: number;
    };
    imaging: {
      mri: {
        t1: string;
        t2: string;
        contrast: string;
      };
    };
  };
}

const DiagnosticWorkup: React.FC<DiagnosticWorkupProps> = ({ onComplete, voCase }) => {
  const [diagnosticTests, setDiagnosticTests] = useState<DiagnosticTests>({
    bloodwork: false,
    mri: false,
    biopsy: false
  });
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});

  const handleTest = (test: keyof DiagnosticTests) => {
    setDiagnosticTests(prev => ({
      ...prev,
      [test]: true
    }));
    setShowResults(prev => ({
      ...prev,
      [test]: true
    }));
  };

  const canProceedToTreatment = () => {
    return diagnosticTests.bloodwork && diagnosticTests.mri && diagnosticTests.biopsy;
  };

  return (
    <WorkupContainer>
      <Title>Diagnostic Workup</Title>
      
      <Section>
        <Title>Patient Presentation</Title>
        <InfoText>Age: {voCase.patientInfo.age}</InfoText>
        <InfoText>Gender: {voCase.patientInfo.gender}</InfoText>
        <InfoText>Duration of Symptoms: {voCase.patientInfo.symptoms.duration}</InfoText>
        <InfoText>Risk Factors: {voCase.riskFactors.join(', ')}</InfoText>
      </Section>

      <Section>
        <Title>Available Tests</Title>
        <TestButton 
          onClick={() => handleTest('bloodwork')}
          $completed={diagnosticTests.bloodwork}
        >
          Order Blood Tests
        </TestButton>
        <TestButton 
          onClick={() => handleTest('mri')}
          $completed={diagnosticTests.mri}
        >
          Order MRI
        </TestButton>
        <TestButton 
          onClick={() => handleTest('biopsy')}
          $completed={diagnosticTests.biopsy}
          disabled={!diagnosticTests.mri}
        >
          Perform Biopsy
        </TestButton>
      </Section>

      {showResults.bloodwork && (
        <Section>
          <Title>Blood Test Results</Title>
          <ResultsPanel>
            <InfoText>WBC: {voCase.labResults.wbc} x10⁹/L</InfoText>
            <InfoText>ESR: {voCase.labResults.esr} mm/hr</InfoText>
            <InfoText>CRP: {voCase.labResults.crp} mg/L</InfoText>
          </ResultsPanel>
        </Section>
      )}

      {showResults.mri && (
        <Section>
          <Title>MRI Results</Title>
          <ResultsPanel>
            <InfoText>T1: {voCase.imaging.mri.t1}</InfoText>
            <InfoText>T2: {voCase.imaging.mri.t2}</InfoText>
            <InfoText>Contrast: {voCase.imaging.mri.contrast}</InfoText>
          </ResultsPanel>
        </Section>
      )}

      {showResults.biopsy && (
        <Section>
          <Title>Biopsy Results</Title>
          <ResultsPanel>
            <InfoText>Organism: Staphylococcus aureus</InfoText>
            <InfoText>Sensitivity: Methicillin-sensitive</InfoText>
          </ResultsPanel>
        </Section>
      )}

      {canProceedToTreatment() && (
        <TestButton onClick={onComplete}>
          Proceed to Treatment Planning
        </TestButton>
      )}
    </WorkupContainer>
  );
};

export default DiagnosticWorkup; 