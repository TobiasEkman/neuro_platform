import { Router } from 'express';
import { checkServicesHealth } from '../utils/serviceHealth';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const health = await checkServicesHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ message: 'Health check failed' });
  }
});

export default router; 