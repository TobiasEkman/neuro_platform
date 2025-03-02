import axios from 'axios';
import { Patient, VitalSigns } from '../types/medical';

// Använd direkt URL till backend, precis som i dicomService
const baseUrl = 'http://localhost:4000/api';

export const patientService = {
  getPatients: async () => {
    try {
      console.log('Fetching patients...'); // Debug log
      const response = await axios.get(`${baseUrl}/patients`);
      console.log('Patient response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching patients:', error.response || error);
      } else {
        console.error('Error fetching patients:', error);
      }
      throw error;
    }
  },

  getPatientById: async (id: string) => {
    try {
      const response = await axios.get(`${baseUrl}/patients/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw error;
    }
  },

  getPatientByPid: async (patient_id: string) => {
    try {
      const response = await axios.get(`${baseUrl}/patients/pid/${patient_id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient by PID:', error);
      throw error;
    }
  },

  searchByPid: async (patient_id: string) => {
    try {
      const response = await axios.get(`${baseUrl}/patients?pid=${patient_id}`);
      return response.data;
    } catch (error) {
      console.error('Error searching patient by PID:', error);
      throw error;
    }
  },

  updatePatient: async (id: string, data: Partial<Patient>) => {
    try {
      const response = await axios.put(`${baseUrl}/patients/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  updatePatientByPid: async (pid: string, data: Partial<Patient>) => {
    try {
      const response = await axios.put(`${baseUrl}/patients/pid/${pid}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  bulkUpdate: async (updates: Partial<Patient>[]) => {
    try {
      const response = await axios.post(`${baseUrl}/patients/bulk`, updates);
      return response.data;
    } catch (error) {
      console.error('Error bulk updating patients:', error);
      throw error;
    }
  },

  deletePatient: async (id: string) => {
    try {
      const response = await axios.delete(`${baseUrl}/patients/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  },

  getPatientVitals: async (id: string): Promise<VitalSigns> => {
    // Temporär dummy-data tills backend är klar
    return {
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        heart_rate: 75,
        respiratory_rate: 16,
        oxygen_saturation: 98,
        temperature: 37
    };
  }
}; 