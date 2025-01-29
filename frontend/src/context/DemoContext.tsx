import React, { createContext, useContext, useState } from 'react';
import type { DemoContextType } from './types/demo';
import { generateDemoData } from '../utils/demoData';

const DemoContext = createContext<DemoContextType | null>(null);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [demoData] = useState<DemoContextType>(generateDemoData());

  return (
    <DemoContext.Provider value={demoData}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = (): DemoContextType => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}; 