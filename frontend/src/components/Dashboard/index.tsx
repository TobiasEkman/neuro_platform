import React from 'react';
import styled from 'styled-components';
import { Card } from '../shared/Card';
import { usePatients } from '../../hooks/usePatients';
import { useStudies } from '../../hooks/useStudies';
import { FaUserMd, FaFileMedical, FaBrain, FaChartLine } from 'react-icons/fa';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
`;

const StatsCard = styled(Card)`
  padding: 1.5rem;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.875rem;
`;

const AlertCard = styled(StatsCard)<{ $severity?: 'warning' | 'danger' }>`
  background: ${props => 
    props.$severity === 'danger' ? '#fcefee' :
    props.$severity === 'warning' ? '#fff3e0' : 
    'white'};
  border-color: ${props => 
    props.$severity === 'danger' ? '#e67e7e' :
    props.$severity === 'warning' ? '#ffb74d' : 
    'var(--border-color)'};
  border-width: ${props => props.$severity ? '2px' : '1px'};
`;

const QuickActionButton = styled.button`
  padding: 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--primary-dark);
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: transform 0.2s;

  &:hover {
    transform: translateX(5px);
  }
`;

const ActivityIcon = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: ${props => {
    switch (props.$type) {
      case 'patient': return '#e3f2fd';
      case 'study': return '#f3e5f5';
      case 'procedure': return '#e8f5e9';
      case 'alert': return '#fff3e0';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'patient': return '#1976d2';
      case 'study': return '#7b1fa2';
      case 'procedure': return '#388e3c';
      case 'alert': return '#f57c00';
      default: return '#757575';
    }
  }};
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-weight: 500;
  color: var(--text-primary);
`;

const ActivityMeta = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
  display: flex;
  gap: 1rem;
`;

const ActivityTime = styled.span`
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const Dashboard: React.FC = () => {
  const { patients, isLoading: patientsLoading } = usePatients();
  const { studies, isLoading: studiesLoading } = useStudies();

  // Mock ICP data for demo
  const mockICP = {
    value: 22.5,
    trend: 'increasing',
    timestamp: new Date()
  };

  const getICPSeverity = (value: number): 'warning' | 'danger' | undefined => {
    if (value > 20) return 'danger';
    if (value > 15) return 'warning';
    return undefined;
  };

  // Mock activity data
  const recentActivity = [
    {
      id: 1,
      type: 'patient',
      title: 'New patient admitted',
      description: 'John Doe - Glioblastoma',
      time: '5 minutes ago',
      icon: <FaUserMd />
    },
    {
      id: 2,
      type: 'study',
      title: 'MRI scan completed',
      description: 'T1 with contrast, T2, FLAIR sequences',
      time: '15 minutes ago',
      icon: <FaFileMedical />
    },
    {
      id: 3,
      type: 'procedure',
      title: 'Tumor resection planned',
      description: 'OR scheduled for tomorrow, 09:00',
      time: '1 hour ago',
      icon: <FaBrain />
    },
    {
      id: 4,
      type: 'alert',
      title: 'ICP Alert resolved',
      description: 'Patient responded to treatment',
      time: '2 hours ago',
      icon: <FaChartLine />
    }
  ];

  return (
    <div>
      <h1>Neurosurgical Dashboard</h1>
      
      <DashboardGrid>
        <AlertCard $severity={getICPSeverity(mockICP.value)}>
          <StatNumber style={{ 
            color: mockICP.value > 20 ? '#750000' : 
                   mockICP.value > 15 ? '#f57c00' : 
                   'var(--primary)' 
          }}>
            {mockICP.value.toFixed(1)}
          </StatNumber>
          <StatLabel>Current ICP (mmHg)</StatLabel>
          <div style={{ 
            fontSize: '0.8rem', 
            color: mockICP.trend === 'increasing' ? '#d32f2f' : '#388e3c'
          }}>
            {mockICP.trend === 'increasing' ? '↑ Trending Up' : '↓ Stable'}
          </div>
        </AlertCard>

        <StatsCard>
          <StatNumber>{patientsLoading ? '...' : patients?.length || 0}</StatNumber>
          <StatLabel>Active Patients</StatLabel>
        </StatsCard>

        <StatsCard>
          <StatNumber>{studiesLoading ? '...' : studies?.length || 0}</StatNumber>
          <StatLabel>Today's Studies</StatLabel>
        </StatsCard>

        <StatsCard>
          <StatNumber>3</StatNumber>
          <StatLabel>Scheduled Procedures</StatLabel>
        </StatsCard>
      </DashboardGrid>

      <h2>Quick Actions</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <QuickActionButton>Open Patient Record</QuickActionButton>
        <QuickActionButton>View Latest Imaging</QuickActionButton>
        <QuickActionButton>Start New Case</QuickActionButton>
      </div>

      <h2>Recent Activity</h2>
      <ActivityList>
        {recentActivity.map(activity => (
          <ActivityItem key={activity.id}>
            <ActivityIcon $type={activity.type}>
              {activity.icon}
            </ActivityIcon>
            <ActivityContent>
              <ActivityTitle>{activity.title}</ActivityTitle>
              <ActivityMeta>
                <span>{activity.description}</span>
                <ActivityTime>{activity.time}</ActivityTime>
              </ActivityMeta>
            </ActivityContent>
          </ActivityItem>
        ))}
      </ActivityList>
    </div>
  );
};

export default Dashboard; 