import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { upload } from '../middleware/upload';
import { ParsedQs } from 'qs';
import multer from 'multer';
import { logger } from '../utils/logger';
import { DicomModel } from '../models/dicomModel';
import { Patient } from '../models/patientModel';

const router = Router();

const IMAGING_SERVICE_URL = 'http://imaging_data:5003';

// Helper function to handle service errors with proper typing
const handleServiceError = (err: unknown, res: Response) => {
    if (axios.isAxiosError(err)) {
        // Handle Axios error
        logger.error(new Error(`Imaging service error: ${err.message}`));
        const message = err.response?.data?.message || err.message || 'Service unavailable';
        res.status(err.response?.status || 500).json({ error: message });
    } else {
        // Handle other errors
        const error = err instanceof Error ? err : new Error('Internal server error');
        logger.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Add more specific routes for DICOM operations
router.get('/series/:seriesId', async (req, res) => {
    try {
        console.log('Received request for series:', req.params.seriesId);
        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/series/${req.params.seriesId}`
        );
        console.log('Flask response:', response.data);
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

router.get('/image/:instanceUid', async (req, res) => {
    try {
        // Get image directly from the mounted volume via imaging service
        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/image/${req.params.instanceUid}`,
            { responseType: 'stream' }
        );
        response.data.pipe(res);
    } catch (err) {
        handleServiceError(err, res);
    }
});

// Parse local DICOM folder
router.post('/parse/folder', async (req, res) => {
    try {
        const { folderPath } = req.body;
        // Call imaging service to scan the directory
        const response = await axios.post(
            `${IMAGING_SERVICE_URL}/api/dicom/parse/folder`,
            { folderPath }
        );
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

// Parse DICOMDIR file
router.post('/parse/dicomdir', async (req, res) => {
    try {
        const { dicomdirPath } = req.body;
        const response = await axios.post(
            `${IMAGING_SERVICE_URL}/api/dicom/parse/dicomdir`,
            { dicomdirPath }
        );
        res.json(response.data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

// Add this route
router.get('/test', async (req, res) => {
    try {
        const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/test`);
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

// Add this route to handle the list request
router.get('/list', async (req, res) => {
    try {
        console.log('Fetching DICOM list');
        const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/list`);
        console.log('Flask response:', response.data);
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

// Search studies
router.get('/search', async (req, res) => {
    try {
        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/search?q=${req.query.q}`
        );
        res.json(response.data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.get('/stats', async (req: Request, res: Response) => {
    try {
        const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/stats`);
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

// Dataset analysis
router.get('/dataset/analyze', async (req, res) => {
    try {
        const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dataset/analyze`);
        res.json(response.data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

// Add these missing endpoints
router.get('/volume/:seriesId', async (req, res) => {
    try {
        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/volume/${req.params.seriesId}`
        );
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

router.get('/series/:seriesId/metadata', async (req, res) => {
    try {
        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/series/${req.params.seriesId}/metadata`
        );
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

router.post('/metadata', async (req: Request, res: Response) => {
    try {
        const { patient, dicom } = req.body;
        
        // 1. Updates/creates record in Patient collection
        const patientUpdate = await Patient.findOneAndUpdate(
            { id: patient.patient_id },
            {
                $addToSet: {
                    images: patient.images
                }
            },
            { upsert: true, new: true }
        );

        // 2. Creates record in DicomModel collection
        const dicomMetadata = await DicomModel.create({
            patientId: patientUpdate._id,
            study_instance_uid: dicom.study_instance_uid,
            series_instance_uid: dicom.series_instance_uid,
            modality: dicom.modality,
            study_date: dicom.study_date,
            series_description: dicom.series_description,
            filePath: dicom.filePath,
            metadata: dicom.metadata
        });

        res.json({
            message: 'Metadata stored successfully',
            patient: patientUpdate,
            dicom: dicomMetadata
        });
    } catch (err) {
        handleServiceError(err, res);
    }
});

export default router; 