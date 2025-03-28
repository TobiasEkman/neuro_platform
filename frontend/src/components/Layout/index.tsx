import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import styled from 'styled-components';

// Components
import Navigation from '../Navigation';
import Dashboard from '../Dashboard';
import DicomViewer from '../DicomViewer/DicomViewer';
import PreopPlanning from '../PreopPlanning';
import ICPMonitoring from '../ICPMonitoring';
import TumorAnalysis from '../TumorAnalysis';
import { DicomManager } from '../DicomManager';
import LocalInference from '../LocalInference';
import NeurosurgerySimulator from '../simulator/NeurosurgerySimulator';
import MedicalDocumentation from '../MedicalDocumentation';
import { PatientExplorer } from '../PatientExplorer';

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

  // Standardvärden för DicomViewer
  const defaultDicomViewerProps = {
    seriesId: undefined,
    segmentationMask: null,
    showSegmentation: false
  };

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
          <Route path="/dicom-viewer" element={<DicomViewer {...defaultDicomViewerProps} />} />
          <Route path="/dicom-viewer/:studyId" element={<DicomViewer {...defaultDicomViewerProps} />} />
          <Route path="/documentation" element={<MedicalDocumentation />} />
          <Route path="/patients" element={<PatientExplorer />} />
        </Routes>
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout; 