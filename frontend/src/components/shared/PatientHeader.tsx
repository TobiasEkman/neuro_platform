import React from 'react';
import { usePatient } from '../../context/PatientContext';

export const PatientHeader: React.FC = () => {
  const { patient } = usePatient();

  if (!patient) return null;

  return (
    <div className="patient-header">
      <h2>{patient.name}</h2>
      <div className="patient-info">
        <span>ID: {patient.id}</span>
        <span>DOB: {patient.dateOfBirth}</span>
        <span>Primary Diagnosis: {patient.primaryDiagnosis}</span>
      </div>
    </div>
  );
}; 