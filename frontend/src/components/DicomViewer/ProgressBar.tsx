import React from 'react';
import styled from 'styled-components';

const ProgressContainer = styled.div`
  width: 100%;
  background: #eee;
  border-radius: 4px;
  padding: 2px;
  position: relative;
  margin: 1rem 0;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 20px;
  width: ${props => props.progress}%;
  background: ${props => props.theme.colors.primary};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const ProgressText = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
`;

interface Props {
  progress: number;
  text?: string;
}

export const ProgressBar: React.FC<Props> = ({ progress, text }) => (
  <ProgressContainer>
    <ProgressFill progress={progress} />
    <ProgressText>{text || `${progress.toFixed(1)}%`}</ProgressText>
  </ProgressContainer>
); 