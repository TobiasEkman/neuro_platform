import React, { useState } from 'react';
import { TumorAnalysis as TumorAnalysisType } from '../../types/medical';
import ThreeJSViewer from './components/ThreeJSViewer';
import { useDemo } from '../../context/DemoContext';
import {
  Container,
  Title,
  ApproachSelector,
  AnalysisResults,
  Metrics,
  MetricItem,
  RiskAnalysis,
  VesselInvolvement,
  RiskList,
  VesselList,
  Visualization
} from './components/styles';

const TumorAnalysis: React.FC = () => {
  const { patient, tumorAnalysis } = useDemo();
  const [analysis, setAnalysis] = useState<TumorAnalysisType | null>(null);
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
    <Container>
      <Title>Skull Base Tumor Analysis</Title>

      <ApproachSelector>
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
      </ApproachSelector>

      {analysis && (
        <AnalysisResults>
          <Metrics>
            <MetricItem>
              <label>Tumor Volume:</label>
              <span>{analysis.volumeCc} cc</span>
            </MetricItem>
            <MetricItem>
              <label>Predicted Resection Rate:</label>
              <span>{analysis.predictedResectionRate}%</span>
            </MetricItem>
          </Metrics>

          <RiskAnalysis>
            <h3>Critical Structures</h3>
            <RiskList>
              {analysis.eloquentAreas.map((area, index) => (
                <li key={index}>{area}</li>
              ))}
            </RiskList>
          </RiskAnalysis>

          <VesselInvolvement>
            <h3>Vascular Considerations</h3>
            <VesselList>
              {analysis.vesselInvolvement.map((vessel, index) => (
                <li key={index}>{vessel}</li>
              ))}
            </VesselList>
          </VesselInvolvement>
        </AnalysisResults>
      )}

      <Visualization>
        <ThreeJSViewer 
          dicomPath={selectedImage?.dicomPath}
          approach={selectedApproach}
          highlights={analysis?.eloquentAreas || []}
        />
      </Visualization>
    </Container>
  );
};

export default TumorAnalysis; 