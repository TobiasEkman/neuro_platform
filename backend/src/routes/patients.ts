import { Router, Request, Response } from 'express';
import axios from 'axios';
import Patient, { 
  IPatient, 
  ImageStudyDocument, 
  ICPReadingDocument,
  ImageStudyData,
  ICPReadingData
} from '../models/Patient';
import Study from '../models/Study';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/pid/:pid', async (req: Request, res: Response) => {
  try {
    const patient = await Patient.findOne({ id: req.params.pid });
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

router.post('/pid/:pid/data/:dataType', async (req: Request, res: Response) => {
  try {
    const { pid, dataType } = req.params;
    const patient = await Patient.findOne({ id: pid });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    switch (dataType) {
      case 'images':
        if (!Array.isArray(req.body)) {
          return res.status(400).json({ message: 'Images data must be an array' });
        }
        // Validate image data structure
        for (const image of req.body) {
          if (!image.type || !['MRI', 'CT', 'fMRI', 'DTI'].includes(image.type)) {
            return res.status(400).json({ message: 'Invalid image type' });
          }
          if (!image.dicomPath || !image.date) {
            return res.status(400).json({ message: 'Missing required image fields' });
          }
        }
        // Use Mongoose's array methods
        patient.images.addToSet(...req.body.map(img => patient.images.create(img)));
        break;

      case 'icpReadings':
        if (!Array.isArray(req.body)) {
          return res.status(400).json({ message: 'ICP readings must be an array' });
        }
        // Validate ICP reading structure
        for (const reading of req.body) {
          if (!reading.value || !reading.location || !reading.timestamp) {
            return res.status(400).json({ message: 'Missing required ICP reading fields' });
          }
          if (reading.value < 0 || reading.value > 100) {
            return res.status(400).json({ message: 'ICP value out of range (0-100)' });
          }
          if (!['Right frontal', 'Left frontal', 'Right temporal', 'Left temporal', 'Ventricles']
              .includes(reading.location)) {
            return res.status(400).json({ message: 'Invalid ICP reading location' });
          }
        }
        // Use Mongoose's array methods
        patient.icpReadings.addToSet(...req.body.map(reading => patient.icpReadings.create(reading)));
        break;

      default:
        return res.status(400).json({ message: 'Unsupported data type' });
    }

    await patient.save();
    res.json({ message: `${dataType} added successfully`, patient });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/pid/:pid', async (req: Request, res: Response) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { id: req.params.pid },
      { $set: {
        name: req.body.name,
        age: req.body.age,
        diagnosis: req.body.diagnosis,
        studyDate: req.body.studyDate
      }},
      { new: true, runValidators: true }
    );
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/pid/:pid', async (req: Request, res: Response) => {
  try {
    const patient = await Patient.findOneAndDelete({ id: req.params.pid });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json({ message: 'Patient deleted' });
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

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedPatient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(updatedPatient);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    const operations = updates.map((update: any) => ({
      updateOne: {
        filter: { _id: update._id },
        update: { $set: update.data }
      }
    }));
    
    const result = await Patient.bulkWrite(operations);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/pid/:pid/data/:dataType/:itemId', async (req: Request, res: Response) => {
  try {
    const { pid, dataType, itemId } = req.params;
    const patient = await Patient.findOne({ id: pid });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    switch (dataType) {
      case 'images':
        await Patient.updateOne(
          { id: pid },
          { $pull: { images: { id: itemId } } }
        );
        break;
      case 'icpReadings':
        await Patient.updateOne(
          { id: pid },
          { $pull: { icpReadings: { _id: new Types.ObjectId(itemId) } } }
        );
        break;
      default:
        return res.status(400).json({ message: 'Unsupported data type' });
    }

    res.json({ message: `${dataType} item removed successfully` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/pid/:pid/data/:dataType/bulk', async (req: Request, res: Response) => {
  try {
    const { pid, dataType } = req.params;
    const patient = await Patient.findOne({ id: pid });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (!Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Bulk update data must be an array' });
    }

    switch (dataType) {
      case 'images':
        await Patient.updateOne(
          { id: pid },
          { 
            $set: { 
              images: req.body.map(img => ({
                ...img,
                _id: new Types.ObjectId()
              }))
            } 
          }
        );
        break;

      case 'icpReadings':
        await Patient.updateOne(
          { id: pid },
          { 
            $set: { 
              icpReadings: req.body.map(reading => ({
                ...reading,
                _id: new Types.ObjectId()
              }))
            } 
          }
        );
        break;

      default:
        return res.status(400).json({ message: 'Unsupported data type' });
    }

    const updatedPatient = await Patient.findOne({ id: pid });
    res.json({ message: `${dataType} bulk updated successfully`, patient: updatedPatient });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 