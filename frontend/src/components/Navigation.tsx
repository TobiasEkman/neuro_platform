import React from 'react';
import { Link } from 'react-router-dom';

export const Navigation: React.FC = () => {
  return (
    <nav className="main-nav">
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/dicom">DICOM Manager</Link>
      <Link to="/tumor-analysis">Tumor Analysis</Link>
      <Link to="/icp-monitoring">ICP Monitoring</Link>
      <Link to="/documentation">Medical Documentation</Link>
      <Link to="/preop-planning">Preop Planning</Link>
      <Link to="/simulator">3D Simulator</Link>
    </nav>
  );
}; 