import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styled from 'styled-components';
import { ICPReading, ICPPrediction } from '../../types/medical';
import { icpService } from '../../services/icpService';
import { usePatient } from '../../hooks/usePatient';
import { useDicomData } from '../../hooks/useDicomData';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  readings?: ICPReading[];
  patientId?: string;
}

export const ICPMonitoring: React.FC<Props> = ({ 
  readings = [],
  patientId 
}) => {
  const [localReadings, setLocalReadings] = useState<ICPReading[]>([]);
  const [predictions, setPredictions] = useState<ICPPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<any>(null);
  const { patient, vitals } = usePatient(patientId || null);
  const { latestCTFindings } = useDicomData(patientId || '');

  useEffect(() => {
    const fetchReadings = async () => {
      if (!patientId || readings.length > 0) return;
      
      try {
        const data = await icpService.getCurrentReadings(patientId);
        setLocalReadings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch readings');
      }
    };

    fetchReadings();
    const interval = setInterval(fetchReadings, 5000);
    return () => clearInterval(interval);
  }, [patientId, readings]);

  const currentReadings = readings.length > 0 ? readings : localReadings;

  useEffect(() => {
    const fetchPredictions = async () => {
      if (currentReadings.length === 0) return;

      try {
        const predictionData = await icpService.getPredictions({
          readings: currentReadings,
          ct_findings: {
            edema_level: latestCTFindings?.edema_level || 'none',
            midline_shift: latestCTFindings?.midline_shift || 0,
            ventricle_compression: latestCTFindings?.ventricle_compression || false,
            hemorrhage_present: latestCTFindings?.hemorrhage_present || false,
            hemorrhage_volume: latestCTFindings?.hemorrhage_volume
          },
          vital_signs: {
            blood_pressure_systolic: vitals?.blood_pressure_systolic || 120,
            blood_pressure_diastolic: vitals?.blood_pressure_diastolic || 80,
            heart_rate: vitals?.heart_rate || 75,
            respiratory_rate: vitals?.respiratory_rate || 16,
            oxygen_saturation: vitals?.oxygen_saturation || 98,
            temperature: vitals?.temperature || 37
          }
        });
        setPredictions(predictionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
      }
    };

    fetchPredictions();
  }, [currentReadings, latestCTFindings, vitals]);

  // Definiera typen för dataset
  type DatasetType = {
    label: string;
    data: number[];
    borderColor: string;
    tension: number;
    borderDash?: number[];
  };

  // Skapa data med korrekt typning och filtrera bort null
  const data: ChartData<'line'> = {
    labels: currentReadings.map(r => new Date(r.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Current ICP (mmHg)',
        data: currentReadings.map(r => r.value),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      predictions && {
        label: 'Predicted ICP (mmHg)',
        data: predictions.predictions,
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        tension: 0.1
      }
    ].filter((dataset): dataset is DatasetType => dataset !== null)
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Pressure (mmHg)' }
      },
      x: {
        title: { display: true, text: 'Time' }
      }
    },
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'ICP Monitoring' }
    }
  };

  return (
    <Container>
      <Header>
        <h2>ICP Monitoring</h2>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Header>

      <GridLayout>
        <ChartSection>
          <Line ref={chartRef} data={data} options={chartOptions} />
        </ChartSection>

        <InfoSection>
          {predictions && (
            <>
              <RiskFactors>
                <h3>Risk Factors</h3>
                <RiskItem $warning={predictions.riskFactors.current_icp > 20}>
                  Current ICP: {predictions.riskFactors.current_icp} mmHg
                </RiskItem>
                <RiskItem $warning={predictions.riskFactors.trending_up}>
                  Trend: {predictions.riskFactors.trending_up ? '↑ Rising' : '↓ Stable'}
                </RiskItem>
                <RiskItem $warning={predictions.riskFactors.compliance_decreasing}>
                  Brain Compliance: {predictions.riskFactors.compliance_decreasing ? 'Decreasing' : 'Normal'}
                </RiskItem>
              </RiskFactors>

              <Recommendations>
                <h3>Recommended Actions</h3>
                {predictions.recommendedActions.map((action, index) => (
                  <RecommendationItem key={index} $priority={action.priority.toLowerCase()}>
                    <strong>{action.action}</strong>
                    <p>{action.details}</p>
                  </RecommendationItem>
                ))}
              </Recommendations>
            </>
          )}
        </InfoSection>
      </GridLayout>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Header = styled.div`
  margin-bottom: 20px;
`;

const ErrorMessage = styled.div`
  color: red;
  margin-top: 10px;
`;

const GridLayout = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
`;

const ChartSection = styled.div`
  height: 400px;
`;

const InfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const RiskFactors = styled.div`
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
`;

const RiskItem = styled.div<{ $warning: boolean }>`
  padding: 10px;
  margin: 5px 0;
  background: ${props => props.$warning ? '#fff3cd' : '#e9ecef'};
  border-radius: 4px;
  color: ${props => props.$warning ? '#856404' : 'inherit'};
`;

const Recommendations = styled.div`
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
`;

const RecommendationItem = styled.div<{ $priority: string }>`
  padding: 10px;
  margin: 5px 0;
  background: ${props => 
    props.$priority === 'high' ? '#f8d7da' :
    props.$priority === 'medium' ? '#fff3cd' :
    '#d4edda'};
  border-radius: 4px;
`;

export default ICPMonitoring; 