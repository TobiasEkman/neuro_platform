import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import Dashboard from './components/Dashboard';
import PreopPlanning from './components/PreopPlanning';
import ICPMonitoring from './components/ICPMonitoring';
import TumorAnalysis from './components/TumorAnalysis';
import DicomManager from './components/DicomManager';
import Navigation from './components/Navigation';
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
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </DemoProvider>
  );
};

export default App; 