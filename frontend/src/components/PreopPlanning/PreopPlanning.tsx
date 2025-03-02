import React, { useState } from 'react';
import { useDemoContext as useDemo } from '../../context/DemoContext';
import './styles/PreopPlanning.css';

interface TumorAnalysis {
  eloquentAreas: string[];
  vesselInvolvement: string[];
}

const PreopPlanning: React.FC = () => {
  const { patient, tumorAnalysis } = useDemo();
  const [selectedApproach, setSelectedApproach] = useState('pterional');

  const approaches = {
    pterional: {
      name: 'Pterional Approach',
      risks: ['Facial nerve injury', 'Temporal muscle atrophy'],
      benefits: ['Good exposure of frontal lobe', 'Access to sylvian fissure']
    },
    transcortical: {
      name: 'Transcortical Approach',
      risks: ['White matter tract injury', 'Seizure risk'],
      benefits: ['Direct trajectory', 'Minimal vessel manipulation']
    }
  };

  return (
    <div className="preop-planning">
      <div className="card approach-selector">
        <h2>Surgical Approach Planning</h2>
        <select 
          value={selectedApproach}
          onChange={(e) => setSelectedApproach(e.target.value)}
          className="approach-select"
        >
          {Object.entries(approaches).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>
      </div>

      <div className="planning-grid">
        <div className="card">
          <h3>Risk Analysis</h3>
          <ul className="risk-list">
            {approaches[selectedApproach as keyof typeof approaches].risks.map((risk, index) => (
              <li key={index}>{risk}</li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Benefits</h3>
          <ul className="benefit-list">
            {approaches[selectedApproach as keyof typeof approaches].benefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3>Critical Structures</h3>
        <div className="structures-list">
          {tumorAnalysis.eloquentAreas.map((area: string, index: number) => (
            <div key={index} className="structure-item warning">
              {area}
            </div>
          ))}
          {tumorAnalysis.vesselInvolvement.map((vessel: string, index: number) => (
            <div key={index} className="structure-item danger">
              {vessel}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreopPlanning; 