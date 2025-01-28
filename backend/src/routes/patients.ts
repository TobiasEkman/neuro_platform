import { Router } from 'express';
import axios from 'axios';
import Patient from '../models/Patient';
import Study from '../models/Study';

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

router.get('/:id/journal', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Get patient's studies
        const studies = await Study.find({ patient_id: patient._id });
        
        // Forward request to clinical coding service
        const response = await axios.post(
            'http://clinical_coding:5002/api/journal/generate',
            {
                patient: {
                    patient_name: patient.name,
                    patient_id: patient.id,
                },
                studies: studies.map((s: Study) => ({
                    study_description: s.description,
                    study_date: s.date
                }))
            },
            { responseType: 'stream' }
        );

        // Stream response back to client
        response.data.pipe(res);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router; 