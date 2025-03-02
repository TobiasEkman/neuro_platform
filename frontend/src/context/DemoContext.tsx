import React, { createContext, useState, useContext } from 'react';
import { demoPatient, demoICPReadings, demoTumorAnalysis } from '../utils/demoData';
import { DemoContextType } from '../types/demo';

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  toggleDemoMode: () => {},
  demoData: {
    patient: demoPatient,
    icpReadings: demoICPReadings,
    tumorAnalysis: demoTumorAnalysis
  }
});

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
  };

  return (
    <DemoContext.Provider 
      value={{
        isDemoMode,
        toggleDemoMode,
        demoData: {
          patient: demoPatient,
          icpReadings: demoICPReadings,
          tumorAnalysis: demoTumorAnalysis
        }
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);

export const useDemoContext = useDemo;

export default DemoContext; 