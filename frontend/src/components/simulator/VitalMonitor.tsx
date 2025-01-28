import React from 'react';
import styled from 'styled-components';
import { VitalSigns } from '../../types/simulator';

const MonitorContainer = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: #000;
  padding: 15px;
  border-radius: 10px;
  color: #00ff00;
  font-family: monospace;
  min-width: 200px;
  z-index: 1000;
`;

interface VitalRowProps {
  $alert?: boolean;
}

const VitalRow = styled.div<VitalRowProps>`
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
  ${(props: VitalRowProps) => props.$alert && `
    color: #ff0000;
    animation: blink 1s infinite;
  `}

  @keyframes blink {
    50% { opacity: 0.5; }
  }
`;

interface VitalMonitorProps {
  vitalSigns: VitalSigns;
  activeCrisis: string | null;
}

const VitalMonitor: React.FC<VitalMonitorProps> = ({ vitalSigns, activeCrisis }) => {
  const isAbnormal = (vital: string, value: number): boolean => {
    const ranges: Record<string, [number, number]> = {
      systolic: [90, 140],
      diastolic: [60, 90],
      heartRate: [60, 100],
      o2sat: [95, 100],
      icp: [5, 15]
    };
    
    if (!ranges[vital]) return false;
    return value < ranges[vital][0] || value > ranges[vital][1];
  };

  return (
    <MonitorContainer>
      <VitalRow $alert={isAbnormal('systolic', vitalSigns.bp.systolic)}>
        <span>BP:</span>
        <span>{vitalSigns.bp.systolic}/{vitalSigns.bp.diastolic}</span>
      </VitalRow>
      <VitalRow $alert={isAbnormal('heartRate', vitalSigns.heartRate)}>
        <span>HR:</span>
        <span>{vitalSigns.heartRate}</span>
      </VitalRow>
      <VitalRow $alert={isAbnormal('o2sat', vitalSigns.o2sat)}>
        <span>SpO2:</span>
        <span>{vitalSigns.o2sat}%</span>
      </VitalRow>
      <VitalRow $alert={isAbnormal('icp', vitalSigns.icp)}>
        <span>ICP:</span>
        <span>{vitalSigns.icp} mmHg</span>
      </VitalRow>
      {activeCrisis && (
        <VitalRow $alert={true}>
          <span>ALERT:</span>
          <span>{activeCrisis.toUpperCase()}</span>
        </VitalRow>
      )}
    </MonitorContainer>
  );
};

export default VitalMonitor; 