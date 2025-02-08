import axios from 'axios';

const PATIENT_SERVICE_URL = process.env.REACT_APP_PATIENT_SERVICE_URL || 'http://localhost:5004';

export const patientService = {
  getPatients: async () => {
    const response = await axios.get(`${PATIENT_SERVICE_URL}/patients`);
    return response.data;
  },

  updatePatient: async (id: string, data: any) => {
    const response = await axios.put(`${PATIENT_SERVICE_URL}/patients/${id}`, data);
    return response.data;
  },

  bulkUpdate: async (updates: any[]) => {
    const response = await axios.post(`${PATIENT_SERVICE_URL}/bulk-upload`, updates);
    return response.data;
  },

  deletePatient: async (id: string) => {
    const response = await axios.delete(`${PATIENT_SERVICE_URL}/patients/${id}`);
    return response.data;
  }
}; 