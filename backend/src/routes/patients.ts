import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

const router = Router();

// Hämta URL från miljövariabel eller använd standardvärde
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://localhost:5008';

logger.info(`Konfigurerad patient service URL: ${PATIENT_SERVICE_URL}`);

// Lägg till debug-logging för att se alla inkommande requests
router.use((req, res, next) => {
  console.log('\x1b[36m%s\x1b[0m', '[Backend Patient Route]', {
    method: req.method,
    path: req.path,
    targetUrl: `${PATIENT_SERVICE_URL}${req.path}`
  });
  next();
});

// Helper function to handle service errors with proper typing
const handleServiceError = (err: unknown, res: Response, defaultMessage = 'Service unavailable') => {
  if (axios.isAxiosError(err)) {
    // Handle Axios error
    logger.error(new Error(`Patient service error: ${err.message}`));
    const message = err.response?.data?.message || err.message || defaultMessage;
    res.status(err.response?.status || 500).json({ error: message });
  } else {
    // Handle other errors
    const error = err instanceof Error ? err : new Error('Internal server error');
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Hämta alla patienter
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[Backend] Hämtar alla patienter');
    const response = await axios.get(`${PATIENT_SERVICE_URL}/patients`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Hämta en specifik patient med ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Kontrollera om id är "undefined" eller tom sträng
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ 
        error: 'Invalid patient ID', 
        message: 'A valid patient ID is required'
      });
    }
    
    const response = await axios.get(`${PATIENT_SERVICE_URL}/patients/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Hämta en patient med patient_id (PID)
router.get('/pid/:pid', async (req: Request, res: Response) => {
  try {
    // Kontrollera om pid är "undefined" eller tom sträng
    if (!req.params.pid || req.params.pid === 'undefined') {
      return res.status(400).json({ 
        error: 'Invalid patient ID', 
        message: 'A valid patient ID (PID) is required'
      });
    }
    
    const response = await axios.get(`${PATIENT_SERVICE_URL}/patients/pid/${req.params.pid}`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Skapa en ny patient
router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${PATIENT_SERVICE_URL}/patients`, req.body);
    res.status(201).json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Uppdatera en patient
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(
      `${PATIENT_SERVICE_URL}/patients/${req.params.id}`, 
      req.body
    );
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Ta bort en patient
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const response = await axios.delete(`${PATIENT_SERVICE_URL}/patients/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Bulk-uppdatering av patienter
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${PATIENT_SERVICE_URL}/patients/bulk`, req.body);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Hälsokontroll
router.get('/health', async (req: Request, res: Response) => {
  try {
    console.log('[Backend] Patient health check request received');
    const response = await axios.get(`${PATIENT_SERVICE_URL}/health`);
    res.json({ 
      status: 'ok', 
      message: 'Patient routes working',
      patient_service: response.data 
    });
  } catch (err) {
    console.error('[Backend] Health check failed:', err);
    res.status(500).json({ error: 'Failed to connect to patient service' });
  }
});

export default router; 