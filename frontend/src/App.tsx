import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import Dashboard from './components/Dashboard';
import PreopPlanning from './components/PreopPlanning';
import ICPMonitoring from './components/ICPMonitoring';
import TumorAnalysis from './components/TumorAnalysis';
import DicomManager from './components/DicomManager';
import LocalInference from './components/LocalInference';
import { Navigation } from './components/Navigation';
import { NeurosurgerySimulator } from './components/simulator/NeurosurgerySimulator';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <DemoProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/preop-planning" element={<PreopPlanning />} />
              <Route path="/icp-monitoring" element={<ICPMonitoring />} />
              <Route path="/tumor-analysis" element={<TumorAnalysis />} />
              <Route path="/dicom-manager" element={<DicomManager />} />
              <Route path="/local-inference" element={<LocalInference />} />
              <Route path="/simulator" element={<NeurosurgerySimulator />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </DemoProvider>
  );
};

export default App; 