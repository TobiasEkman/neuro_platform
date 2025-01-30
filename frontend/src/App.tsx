import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import Dashboard from './components/Dashboard';
import PreopPlanning from './components/PreopPlanning/PreopPlanning';
import ICPMonitoring from './components/ICPMonitoring/ICPMonitoring';
import TumorAnalysis from './components/TumorAnalysis/TumorAnalysis';
import DicomManager from './components/DicomManager/DicomManager';
import LocalInference from './components/LocalInference';
import Navigation from './components/Navigation';
import { NeurosurgerySimulator } from './components/simulator/NeurosurgerySimulator';
import DicomViewer from './components/DicomViewer';
import Layout from './components/Layout';
import './styles/App.css';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyle } from './styles/global';
import { DicomDebug } from './components/DicomViewer/DicomDebug';

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <BrowserRouter>
        <DemoProvider>
          <Layout />
          <Route path="/inference" element={<LocalInference />} />
        </DemoProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App; 