import { Router } from 'express';
import axios from 'axios';
import { upload } from '../middlewares/upload';

const router = Router();

// Add more specific routes for DICOM operations
router.get('/series/:seriesId', async (req, res) => {
    try {
        console.log('Received request for series:', req.params.seriesId);
        const response = await axios.get(
            `http://localhost:5003/api/dicom/series/${req.params.seriesId}`
        );
        console.log('Flask response:', response.data);
        res.json(response.data);
    } catch (err) {
        console.error('Error fetching series:', err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.get('/image/:instanceUid', async (req, res) => {
    try {
        const response = await axios.get(
            `http://localhost:5003/api/dicom/image/${req.params.instanceUid}`,
            { responseType: 'stream' }
        );
        response.data.pipe(res);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

// Keep existing routes
router.post('/parse/folder', async (req, res) => {
    try {
        const response = await axios.post(
            'http://localhost:5003/api/dicom/parse/folder',
            req.body
        );
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.post('/parse/dicomdir', async (req, res) => {
    try {
        const response = await axios.post(
            'http://dicom_ingestion:5003/api/dicom/parse/dicomdir',
            req.body
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
        const response = await axios.get('http://localhost:5003/api/dicom/test');
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ 
            message,
            details: 'Make sure the Flask server is running on port 5003'
        });
    }
});

// Add this route to handle the list request
router.get('/list', async (req, res) => {
    try {
        console.log('Fetching DICOM list');
        const response = await axios.get('http://localhost:5003/api/dicom/list');
        console.log('Flask response:', response.data);
        res.json(response.data);
    } catch (err) {
        console.error('Error fetching DICOM list:', err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ 
            message,
            details: 'Make sure the Flask server is running on port 5003'
        });
    }
});

// Add these routes
router.get('/search', async (req, res) => {
    try {
        const response = await axios.get(
            `http://localhost:5003/api/search${req._parsedUrl.search || ''}`
        );
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:5003/api/dicom/stats');
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.get('/dataset/analyze', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:5003/api/dataset/analyze');
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

// Add these missing endpoints
router.get('/volume/:seriesId', async (req, res) => {
    try {
        const response = await axios.get(
            `http://localhost:5003/api/dicom/volume/${req.params.seriesId}`
        );
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.get('/series/:seriesId/metadata', async (req, res) => {
    try {
        const response = await axios.get(
            `http://localhost:5003/api/dicom/series/${req.params.seriesId}/metadata`
        );
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.post('/upload', upload.array('files'), async (req, res) => {
    try {
        const response = await axios.post(
            'http://imaging_data:5003/api/dicom/upload',
            req.files
        );
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router; 