import { Router, Request, Response } from 'express';
import axios from 'axios';
import Patient from '../models/Patient';
import Study from '../models/Study';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
  const patient = new Patient(req.body);
  try {
    const newPatient = await patient.save();
    res.status(201).json(newPatient);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:id/journal', async (req: Request, res: Response) => {
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
                    name: patient.name,
                    id: patient.id,
                    age: patient.age,
                    diagnosis: patient.diagnosis
                },
                studies: studies.map(s => ({
                    study_instance_uid: s.study_instance_uid,
                    study_description: s.study_description,
                    study_date: s.study_date,
                    series: s.series
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