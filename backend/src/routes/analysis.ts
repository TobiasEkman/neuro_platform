import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.post('/tumor/:imageId', async (req, res) => {
  try {
    const response = await axios.post(
      `http://ai_analysis:5000/api/analysis/tumor/${req.params.imageId}`,
      req.body
    );
    res.json(response.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

export default router; 