import { Router } from 'express';
import Patient from '../models/Patient';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const patient = new Patient(req.body);
  try {
    const newPatient = await patient.save();
    res.status(201).json(newPatient);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router; 