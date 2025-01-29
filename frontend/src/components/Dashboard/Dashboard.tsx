import React from 'react';
import { useDemo } from '../../context/DemoContext';
import '../styles/Dashboard.css';
import ICPMonitoring from '../ICPMonitoring/ICPMonitoring';

const Dashboard: React.FC = () => {
  const { patient, icpReadings, tumorAnalysis } = useDemo();
  const latestICP = icpReadings[icpReadings.length - 1];

  const icpData = [
    { timestamp: new Date(), value: 15, location: 'Right frontal' },
    // ... more readings
  ];

  return (
    <div className="dashboard">
      <div className="card patient-summary">
        <h2>Patient Summary</h2>
        <div className="summary-details">
          <div className="detail-item">
            <label>Name:</label>
            <span>{patient.name}</span>
          </div>
          <div className="detail-item">
            <label>Age:</label>
            <span>{patient.age} years</span>
          </div>
          <div className="detail-item">
            <label>Diagnosis:</label>
            <span>{patient.diagnosis}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Current ICP</h3>
          <div className="metric-large">{latestICP.value.toFixed(1)} mmHg</div>
          <div className="metric-location">Location: {latestICP.location}</div>
        </div>

        <div className="card">
          <h3>Tumor Metrics</h3>
          <div className="metric-item">
            <label>Volume:</label>
            <span>{tumorAnalysis.volumeCc} cc</span>
          </div>
          <div className="metric-item">
            <label>Resection Rate:</label>
            <span>{tumorAnalysis.predictedResectionRate}%</span>
          </div>
        </div>
      </div>

      <div>
        <ICPMonitoring readings={icpData} />
      </div>
    </div>
  );
};

export default Dashboard; 