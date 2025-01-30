import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { FaBrain } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

// Components
import Navigation from '../Navigation';
import Dashboard from '../Dashboard';
import DicomViewer from '../DicomViewer';
import PreopPlanning from '../PreopPlanning';
import ICPMonitoring from '../ICPMonitoring';
import TumorAnalysis from '../TumorAnalysis';
import { DicomManager } from '../DicomManager';
import LocalInference from '../LocalInference';
import NeurosurgerySimulator from '../simulator/NeurosurgerySimulator';
import MedicalDocumentation from '../MedicalDocumentation';
import { DicomDebug } from '../DicomViewer/DicomDebug';

// Styles
import { GlobalStyle } from '../../styles/global';

const Container = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
`;

const MainContent = styled.main`
  padding: 2rem;
  background: ${props => props.theme.colors.background.primary};
`;

const Layout: React.FC = () => {
  // Get patientId from URL or context
  const { patientId = 'default' } = useParams();

  return (
    <Container>
      <Navigation />
      <MainContent>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dicom-manager" element={<DicomManager patientId={patientId} />} />
          <Route path="/tumor-analysis" element={<TumorAnalysis />} />
          <Route path="/icp-monitoring" element={<ICPMonitoring patientId={patientId} />} />
          <Route path="/preop-planning" element={<PreopPlanning />} />
          <Route path="/simulator" element={<NeurosurgerySimulator />} />
          <Route path="/local-inference" element={<LocalInference />} />
          <Route path="/dicom-viewer" element={<DicomViewer seriesId="default" />} />
          <Route path="/documentation" element={<MedicalDocumentation />} />
          <Route path="/debug" element={<DicomDebug />} />
        </Routes>
        <NavLink to="/inference">
          <FaBrain /> Local Inference
        </NavLink>
      </MainContent>
    </Container>
  );
};

export default Layout; 