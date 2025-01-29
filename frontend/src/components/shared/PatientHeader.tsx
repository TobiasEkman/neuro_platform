import React from 'react';
import { Patient } from '../../types/medical';

interface PatientHeaderProps {
  patient: Patient;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient }) => {
  return (
    <div className="patient-header">
      <div className="patient-info">
        <span>ID: {patient.id}</span>
        <span>Name: {patient.name}</span>
        <span>Age: {patient.age}</span>
        <span>Diagnosis: {patient.diagnosis}</span>
      </div>
    </div>
  );
}; 