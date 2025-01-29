import React from 'react';
import styled from 'styled-components';
import { Tool, SurgicalStep } from '../../types/simulator';

const Panel = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  width: 300px;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin-bottom: 20px;
`;

const Section = styled.div`
  margin-bottom: 25px;
`;

const ToolButton = styled.button<{ $selected?: boolean }>`
  width: 100%;
  padding: 10px;
  margin: 5px 0;
  background: ${props => props.$selected ? '#3498db' : '#fff'};
  color: ${props => props.$selected ? '#fff' : '#2c3e50'};
  border: 2px solid #3498db;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$selected ? '#2980b9' : '#ecf0f1'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StepInfo = styled.div`
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin: 10px 0;
`;

const StepDescription = styled.p`
  color: #7f8c8d;
  font-size: 14px;
`;

interface ControlPanelProps {
  selectedTool: string | null;
  setSelectedTool: (tool: string | null) => void;
  currentStep: number;
  score?: number;
}

const SURGICAL_TOOLS: Tool[] = [
  { id: 'scalpel', name: 'Scalpel', icon: '🔪' },
  { id: 'drill', name: 'Surgical Drill', icon: '🔄' },
  { id: 'forceps', name: 'Forceps', icon: '✄' }
];

const SURGICAL_STEPS: SurgicalStep[] = [
  { 
    id: 1, 
    name: 'Initial Incision',
    description: 'Make the initial scalp incision following the marked line',
    validTools: ['scalpel']
  },
  { 
    id: 2, 
    name: 'Skull Access',
    description: 'Create burr holes and connect them',
    validTools: ['drill']
  },
  { 
    id: 3, 
    name: 'Dura Management',
    description: 'Carefully open and retract the dura',
    validTools: ['forceps']
  }
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedTool,
  setSelectedTool,
  currentStep,
  score = 0
}) => {
  const currentStepInfo = SURGICAL_STEPS[currentStep - 1];

  return (
    <Panel>
      <Title>Surgical Control Panel</Title>
      
      <Section>
        <StepInfo>
          <Title>Step {currentStep}/{SURGICAL_STEPS.length}</Title>
          <StepDescription>
            {currentStepInfo?.description || 'Complete current step to proceed'}
          </StepDescription>
        </StepInfo>
      </Section>

      <Section>
        <Title>Tools</Title>
        {SURGICAL_TOOLS.map(tool => (
          <ToolButton
            key={tool.id}
            $selected={selectedTool === tool.id}
            onClick={() => setSelectedTool(tool.id)}
            disabled={currentStepInfo?.validTools && !currentStepInfo.validTools.includes(tool.id)}
          >
            {tool.icon} {tool.name}
          </ToolButton>
        ))}
      </Section>

      <Section>
        <Title>Score: {score}</Title>
        <StepDescription>
          Select appropriate tools and complete each step carefully to maximize your score.
        </StepDescription>
      </Section>
    </Panel>
  );
};

export default ControlPanel; 