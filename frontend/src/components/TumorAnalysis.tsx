import React, { useState } from 'react';
import { TumorAnalysis } from '../types/medical';
import ThreeJSViewer from './ThreeJSViewer'; // 3D visualization component
import { useDemo } from '../context/DemoContext';

const TumorAnalysisComponent: React.FC = () => {
  const { patient, tumorAnalysis } = useDemo();
  const [analysis, setAnalysis] = useState<TumorAnalysis | null>(null);
  const [selectedApproach, setSelectedApproach] = useState<string>('pterional');
  const [selectedImage] = useState(patient.images[0]);

  const analyzeImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/analysis/tumor/${imageId}`, {
        method: 'POST',
        body: JSON.stringify({ approach: selectedApproach }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error analyzing tumor:', error);
    }
  };

  return (
    <div className="tumor-analysis">
      <h2>Skull Base Tumor Analysis</h2>

      <div className="approach-selector">
        <h3>Select Surgical Approach</h3>
        <select 
          value={selectedApproach}
          onChange={(e) => setSelectedApproach(e.target.value)}
        >
          <option value="pterional">Pterional Approach</option>
          <option value="retrosigmoid">Retrosigmoid Approach</option>
          <option value="subfrontal">Subfrontal Approach</option>
          <option value="transpetrosal">Transpetrosal Approach</option>
        </select>
      </div>

      {analysis && (
        <div className="analysis-results">
          <div className="metrics">
            <div className="metric">
              <label>Tumor Volume:</label>
              <span>{analysis.volumeCc} cc</span>
            </div>
            <div className="metric">
              <label>Predicted Resection Rate:</label>
              <span>{analysis.predictedResectionRate}%</span>
            </div>
          </div>

          <div className="risk-analysis">
            <h3>Critical Structures</h3>
            <ul>
              {analysis.eloquentAreas.map((area, index) => (
                <li key={index} className="risk-item">
                  {area}
                </li>
              ))}
            </ul>
          </div>

          <div className="vessel-involvement">
            <h3>Vascular Considerations</h3>
            <ul>
              {analysis.vesselInvolvement.map((vessel, index) => (
                <li key={index} className="vessel-item">
                  {vessel}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="visualization">
        <ThreeJSViewer 
          dicomPath={selectedImage?.dicomPath}
          approach={selectedApproach}
          highlights={analysis?.eloquentAreas || []}
        />
      </div>
    </div>
  );
};

export default TumorAnalysisComponent; 