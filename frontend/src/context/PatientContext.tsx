import React, { createContext, useContext, ReactNode } from 'react';

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  studies: Study[];
}

interface Study {
  studyInstanceUid: string;
  studyDate: string;
  studyDescription: string;
  series: Series[];
}

interface Series {
  seriesInstanceUid: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
}

interface PatientContextType {
  patient: Patient | null;
  setPatient: (patient: Patient | null) => void;
  loading: boolean;
  error: string | null;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patient, setPatient] = React.useState<Patient | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <PatientContext.Provider value={{ patient, setPatient, loading, error }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}; 