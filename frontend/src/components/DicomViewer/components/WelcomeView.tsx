import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FaUpload, FaUsers, FaImages, FaQuestionCircle } from 'react-icons/fa';

const WelcomeContainer = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
`;

const Title = styled.h2`
  margin-bottom: 2rem;
  color: ${props => props.theme.colors.text.primary};
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
`;

const Option = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  border-radius: 8px;
  background: ${props => props.theme.colors.background.secondary};
  text-decoration: none;
  color: ${props => props.theme.colors.text.primary};
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-5px);
  }

  svg {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: ${props => props.theme.colors.primary};
  }
`;

const HelpText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 2rem;
`;

export const WelcomeView: React.FC = () => {
  return (
    <WelcomeContainer>
      <Title>Welcome to DICOM Viewer</Title>
      
      <OptionsGrid>
        <Option to="/dicom-manager">
          <FaUpload />
          <h3>Upload DICOM Files</h3>
          <p>Import new DICOM studies from your computer</p>
        </Option>

        <Option to="/patients">
          <FaUsers />
          <h3>Patient Explorer</h3>
          <p>Browse patients and their associated studies</p>
        </Option>

        <Option to="/dicom-manager">
          <FaImages />
          <h3>DICOM Manager</h3>
          <p>Manage and organize your DICOM files</p>
        </Option>

        <Option to="/documentation">
          <FaQuestionCircle />
          <h3>Documentation</h3>
          <p>Learn how to use the DICOM viewer</p>
        </Option>
      </OptionsGrid>

      <HelpText>
        Select an option above to get started, or check the documentation for more information.
      </HelpText>
    </WelcomeContainer>
  );
}; 