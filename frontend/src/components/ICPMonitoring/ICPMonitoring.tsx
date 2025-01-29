import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styled from 'styled-components';
import { ICPReading } from '../../types/medical';

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

interface ICPMonitoringProps {
  readings?: {
    timestamp: Date;
    value: number;
    location: string;
  }[];
}

const ICPMonitoring: React.FC<ICPMonitoringProps> = ({ readings = [] }) => {
  const chartRef = useRef<ChartJS<"line", number[], unknown>>(null);

  // Clean up chart instance on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const data = {
    labels: readings.map(r => new Date(r.timestamp).toLocaleTimeString()),
    datasets: [{
      label: 'ICP Reading (mmHg)',
      data: readings.map(r => r.value),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Pressure (mmHg)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'ICP Monitoring'
      }
    }
  };

  return (
    <Container>
      <Line 
        ref={chartRef}
        data={data} 
        options={options}
      />
    </Container>
  );
};

const Container = styled.div`
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  height: 400px;
`;

export default ICPMonitoring; 