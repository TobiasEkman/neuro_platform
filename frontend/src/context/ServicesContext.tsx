import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ServicesState {
  activeServices: string[];
  serviceStatus: Record<string, 'online' | 'offline'>;
  lastUpdated: Record<string, Date>;
}

interface ServicesContextType {
  services: ServicesState;
  updateServiceStatus: (service: string, status: 'online' | 'offline') => void;
  updateLastUpdated: (service: string) => void;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const ServicesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<ServicesState>({
    activeServices: [
      'tumor_analysis',
      'icp_monitoring',
      'medical_documentation',
      'imaging_data',
      'model_training'
    ],
    serviceStatus: {},
    lastUpdated: {}
  });

  const updateServiceStatus = (service: string, status: 'online' | 'offline') => {
    setServices(prev => ({
      ...prev,
      serviceStatus: {
        ...prev.serviceStatus,
        [service]: status
      }
    }));
  };

  const updateLastUpdated = (service: string) => {
    setServices(prev => ({
      ...prev,
      lastUpdated: {
        ...prev.lastUpdated,
        [service]: new Date()
      }
    }));
  };

  return (
    <ServicesContext.Provider value={{ services, updateServiceStatus, updateLastUpdated }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
}; 