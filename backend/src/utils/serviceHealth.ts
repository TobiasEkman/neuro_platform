import axios from 'axios';

const services = {
  tumor_analysis: 'http://localhost:5005',
  icp_monitoring: 'http://localhost:5006',
  model_training: 'http://localhost:5001',
  medical_documentation: 'http://localhost:5002',
  imaging_data: 'http://localhost:5003',
  simulator: 'http://localhost:5007'
} as const;

type ServiceName = keyof typeof services;
type ServiceStatus = 'healthy' | 'unhealthy';
type HealthStatus = Record<ServiceName, ServiceStatus>;

export const checkServicesHealth = async (): Promise<HealthStatus> => {
  const health = {} as HealthStatus;
  
  for (const [service, url] of Object.entries(services)) {
    try {
      await axios.get(`${url}/health`);
      health[service as ServiceName] = 'healthy';
    } catch (err) {
      health[service as ServiceName] = 'unhealthy';
    }
  }
  
  return health;
}; 