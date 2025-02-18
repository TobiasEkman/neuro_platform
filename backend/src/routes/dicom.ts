import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { upload } from '../middleware/upload';
import { ParsedQs } from 'qs';
import multer from 'multer';
import { logger } from '../utils/logger';
import { DicomModel } from '../models/DicomModel';
import PatientModel from '../models/Patient';

const router = Router();

const IMAGING_SERVICE_URL = process.env.IMAGING_SERVICE_URL || 'http://localhost:5003';

logger.info(`Configured imaging service URL: ${IMAGING_SERVICE_URL}`);

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

router.get('/image', async (req, res) => {
    try {
        const { path } = req.query;
        if (!path) {
            throw new Error('No path provided');
        }

        // Just normalize slashes and decode
        const normalizedPath = decodeURIComponent(path as string).replace(/\\/g, '/');
        
        console.log('[Backend] Forwarding image request for path:', normalizedPath);

        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/image`,
            {
                params: { path: normalizedPath },
                responseType: 'stream'
            }
        );

        res.setHeader('Content-Type', 'application/octet-stream');
        response.data.pipe(res);
    } catch (err) {
        console.error('Error serving image:', err);
        handleServiceError(err, res);
    }
});

// Route to forward folder parsing to the imaging service
router.post('/parse/folder', async (req: Request, res: Response) => {
    try {
        const { folderPath } = req.body;
        
        // Set headers for streaming response
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // Make request to imaging service with streaming response
        const response = await axios({
            method: 'post',
            url: `${IMAGING_SERVICE_URL}/api/dicom/parse/folder`,
            data: { folderPath },
            responseType: 'stream'
        });

        // Pipe the imaging service response directly to our response
        response.data.pipe(res);
        
        // Handle errors in the stream
        response.data.on('error', (error: Error) => {
            console.error('Stream error:', error);
            // Only send error if headers haven't been sent
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error occurred' });
            }
        });

    } catch (error) {
        console.error('Error connecting to imaging service:', error);
        res.status(500).json({ error: 'Failed to connect to imaging service' });
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
        console.log('Search query:', req.query.q);
        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/search?q=${req.query.q}`
        );
        console.log('Imaging service response:', response.data);
        res.json(response.data);
    } catch (err) {
        console.error('Search error:', err);
        handleServiceError(err, res);
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
        
        // Update to use patient_id
        const patientUpdate = await PatientModel.findOneAndUpdate(
            { patient_id: patient.patient_id },
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

// Add a health check endpoint
router.get('/health', async (req, res) => {
    try {
        logger.info('Health check request received');
        const response = await axios.get(`${IMAGING_SERVICE_URL}/health`);
        logger.info('Health check successful', {
            status: response.status,
            imagingServiceUrl: IMAGING_SERVICE_URL
        });
        res.json({ status: 'ok' });
    } catch (err) {
        logger.error(new Error('Health check failed'), {
            error: err instanceof Error ? err.message : 'Unknown error',
            imagingServiceUrl: IMAGING_SERVICE_URL
        });
        handleServiceError(err, res);
    }
});

export default router; 