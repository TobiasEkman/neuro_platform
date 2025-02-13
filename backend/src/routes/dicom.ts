import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { upload } from '../middleware/upload';
import { ParsedQs } from 'qs';
import multer from 'multer';
import { logger } from '../utils/logger';
import { DicomModel } from '../models/dicomModel';

const router = Router();

const IMAGING_SERVICE_URL = process.env.IMAGING_SERVICE_URL || 'http://localhost:5003';

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
        const response = await axios.get(
            `${IMAGING_SERVICE_URL}/api/dicom/image/${req.params.instanceUid}`,
            { responseType: 'stream' }
        );
        response.data.pipe(res);
    } catch (err) {
        handleServiceError(err, res);
    }
});

// Keep existing routes
router.post('/parse/folder', async (req, res) => {
    try {
        const response = await axios.post(
            `${IMAGING_SERVICE_URL}/api/dicom/parse/folder`,
            req.body
        );
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
    }
});

router.post('/parse/dicomdir', async (req, res) => {
    try {
        const response = await axios.post(
            `${IMAGING_SERVICE_URL}/api/dicom/parse/dicomdir`,
            req.body
        );
        res.json(response.data);
    } catch (err: unknown) {
        handleServiceError(err, res);
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

// Add these routes
router.get('/search', async (req: Request<{}, any, any, ParsedQs>, res: Response) => {
    try {
        const searchQuery = req.query.q ? `?q=${req.query.q}` : '';
        const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/search${searchQuery}`);
        res.json(response.data);
    } catch (err) {
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

router.get('/dataset/analyze', async (req, res) => {
    try {
        const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dataset/analyze`);
        res.json(response.data);
    } catch (err) {
        handleServiceError(err, res);
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
        const { metadata, patientId } = req.body;
        
        // Store only metadata in MongoDB
        const result = await DicomModel.create(
            metadata.map((item: any) => ({
                ...item,
                patientId,
                // Store relative path instead of full path
                filePath: item.localPath
            }))
        );

        res.json({
            message: 'Metadata stored successfully',
            studies: result
        });
    } catch (err) {
        handleServiceError(err, res);
    }
});

export default router; 