import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';
import { Request, Response } from 'express';

const router = express.Router();

// Debug logging
router.use((req, res, next) => {
  console.log('\nPatients Route:', {
    originalUrl: req.originalUrl,
    path: req.path,
    method: req.method
  });
  next();
});

// Proxy alla patient-requests till patient management service
router.use('/', createProxyMiddleware({
  target: 'http://localhost:5008',
  changeOrigin: true,
  pathRewrite: {
    '^/api/patients': '/patients'  // Ta bort /api/patients prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('\nProxying request:', {
      from: req.originalUrl,
      to: proxyReq.path
    });
  }
}));

// Lägg till en endpoint för bulk-uppdateringar
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { patients } = req.body;
    
    if (!Array.isArray(patients)) {
      return res.status(400).json({ error: 'Invalid patients data' });
    }
    
    // Skicka vidare till patient management service
    const response = await axios.post(
      `${PATIENT_SERVICE_URL}/patients/bulk`,
      { patients }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error bulk updating patients:', error);
    res.status(500).json({ error: 'Failed to update patients' });
  }
});

export default router; 