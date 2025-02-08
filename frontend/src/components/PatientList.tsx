import React, { useState, useEffect } from 'react';
import { patientService } from '../services/patientService';

export const PatientList: React.FC = () => {
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await patientService.getPatients();
        setPatients(data);
        setError(null);
      } catch (err) {
        setError('Failed to load patients. Please ensure the Patient Management Service is running.');
        console.error('Patient loading error:', err);
      }
    };

    loadPatients();
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div>
      {/* Patient list rendering */}
    </div>
  );
}; 