import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import '../styles/Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { patient } = useDemo();

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1>NeuroSurgery Platform</h1>
        <div className="patient-info">
          <span className="patient-name">{patient.name}</span>
          <span className="patient-id">ID: {patient.id}</span>
        </div>
      </div>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link to="/preop-planning" className={location.pathname === '/preop-planning' ? 'active' : ''}>
          Preop Planning
        </Link>
        <Link to="/icp-monitoring" className={location.pathname === '/icp-monitoring' ? 'active' : ''}>
          ICP Monitoring
        </Link>
        <Link to="/tumor-analysis" className={location.pathname === '/tumor-analysis' ? 'active' : ''}>
          Tumor Analysis
        </Link>
      </div>
    </nav>
  );
};

export default Navigation; 