import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.post('/decrypt', async (req, res) => {
    try {
        const response = await axios.post(
            'http://localhost:5004/get_decryption_key',
            req.body
        );
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.get('/model/:filename', async (req, res) => {
    try {
        const response = await axios.get(
            `http://localhost:5004/get_decrypted_model/${req.params.filename}`,
            { responseType: 'stream' }
        );
        response.data.pipe(res);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

router.post('/track', async (req, res) => {
    try {
        const response = await axios.post(
            'http://localhost:5004/track',
            req.body
        );
        res.json(response.data);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        res.status(500).json({ message });
    }
});

export default router; 