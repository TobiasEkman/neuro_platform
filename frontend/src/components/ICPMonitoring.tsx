import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { ICPReading } from '../types/medical';

const ICPMonitoring: React.FC = () => {
  const [icpData, setIcpData] = useState<ICPReading[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    // Fetch ICP data from backend
    fetchICPData();
    // Set up real-time monitoring
    const interval = setInterval(fetchICPData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchICPData = async () => {
    try {
      const response = await fetch('/api/icp/current');
      const data = await response.json();
      setIcpData(data);
      analyzeICPTrends(data);
    } catch (error) {
      console.error('Error fetching ICP data:', error);
    }
  };

  const analyzeICPTrends = (data: ICPReading[]) => {
    const newAlerts = [];
    const recentReadings = data.slice(-5);
    const latestICP = recentReadings[recentReadings.length - 1].value;

    if (latestICP > 20) {
      newAlerts.push('CRITICAL: ICP elevation above 20 mmHg');
    }

    // Detect trending increase
    const trend = calculateTrend(recentReadings);
    if (trend > 2) {
      newAlerts.push('WARNING: Rising ICP trend detected');
    }

    setAlerts(newAlerts);
  };

  const calculateTrend = (readings: ICPReading[]): number => {
    // Simple linear regression implementation
    // Returns rate of change in mmHg/hour
    // ... implementation details
    return 0;
  };

  return (
    <div className="icp-monitoring">
      <h2>Real-time ICP Monitoring</h2>
      
      <div className="current-values">
        <div className="value-box">
          <h3>Current ICP</h3>
          <div className="large-value">
            {icpData.length > 0 ? `${icpData[icpData.length - 1].value} mmHg` : 'Loading...'}
          </div>
        </div>
      </div>

      <div className="alerts-section">
        {alerts.map((alert, index) => (
          <div key={index} className="alert">
            {alert}
          </div>
        ))}
      </div>

      <div className="chart-container">
        <Line
          data={{
            labels: icpData.map(reading => new Date(reading.timestamp).toLocaleTimeString()),
            datasets: [{
              label: 'ICP (mmHg)',
              data: icpData.map(reading => reading.value),
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          }}
          options={{
            scales: {
              y: {
                beginAtZero: true,
                max: 40
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default ICPMonitoring; 