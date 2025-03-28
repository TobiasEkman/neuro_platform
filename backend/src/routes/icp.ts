import { Router } from 'express';
import Patient from '../models/Patient';
import axios from 'axios';

const router = Router();

router.get('/current/:patientId', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const readings = patient.icpReadings.slice(-100); // Last 100 readings
    res.json(readings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

router.post('/predict', async (req, res) => {
  try {
    const response = await axios.post(
      'http://localhost:5006/api/monitoring/icp/predict',
      req.body
    );
    res.json(response.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

export default router; 