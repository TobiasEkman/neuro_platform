import React from 'react';
import styled from 'styled-components';

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
`;

export interface DicomControlsProps {
  onRefresh?: () => void;
  onClear?: () => void;
}

export const DicomControls: React.FC<DicomControlsProps> = ({
  onRefresh,
  onClear
}) => {
  return (
    <ControlsContainer>
      {onRefresh && (
        <button onClick={onRefresh}>
          Refresh Studies
        </button>
      )}
      {onClear && (
        <button onClick={onClear}>
          Clear Selection
        </button>
      )}
    </ControlsContainer>
  );
}; 