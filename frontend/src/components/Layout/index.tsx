import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import styled from 'styled-components';

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
import { PatientExplorer } from '../PatientExplorer';

// Styles
import { GlobalStyle } from '../../styles/global';

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
`;

const Sidebar = styled.div`
  width: 250px;
  flex-shrink: 0;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
`;

const Layout: React.FC = () => {
  // Get patientId from URL or context
  const { patientId = 'default' } = useParams();

  return (
    <LayoutContainer>
      <Sidebar>
        <Navigation />
      </Sidebar>
      <MainContent>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dicom-manager" element={<DicomManager patientId={patientId} />} />
          <Route path="/tumor-analysis" element={<TumorAnalysis />} />
          <Route path="/icp-monitoring" element={<ICPMonitoring patientId={patientId} />} />
          <Route path="/preop-planning" element={<PreopPlanning />} />
          <Route path="/simulator" element={<NeurosurgerySimulator />} />
          <Route path="/inference" element={<LocalInference />} />
          <Route path="/dicom-viewer" element={<DicomViewer seriesId="default" />} />
          <Route path="/documentation" element={<MedicalDocumentation />} />
          <Route path="/debug" element={<DicomDebug />} />
          <Route path="/patients" element={<PatientExplorer />} />
        </Routes>
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout; 