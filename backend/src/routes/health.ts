import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend service is healthy' });
});

export default router; 