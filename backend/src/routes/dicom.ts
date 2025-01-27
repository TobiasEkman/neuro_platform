import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.post('/parse/folder', async (req, res) => {
    try {
        const response = await axios.post(
            'http://dicom_ingestion:5003/api/dicom/parse/folder',
            req.body
        );
        res.json(response.data);
    } catch (err: unknown) {
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

export default router; 