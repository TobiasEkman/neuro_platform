import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';
import { DicomModel } from '../models/DicomModel';
import PatientModel from '../models/Patient';

// Lägg till dessa typdefinitioner för DicomViewerProps
export interface DicomViewerProps {
  seriesId: string | undefined;
  segmentationMask: number[] | null;
  showSegmentation: boolean;
  onSeriesSelect?: (seriesId: string) => void;
}

const router = Router();

const IMAGING_SERVICE_URL = process.env.IMAGING_SERVICE_URL || 'http://localhost:5003';

logger.info(`Configured imaging service URL: ${IMAGING_SERVICE_URL}`);


router.use((req, res, next) => {
  console.log('\x1b[35m%s\x1b[0m', '[Backend DICOM Route]', {
    method: req.method,
    path: req.path,
    targetUrl: `${IMAGING_SERVICE_URL}${req.path}`
  });
  next();
});

// Helper function to handle service errors with proper typing
const handleServiceError = (err: unknown, res: Response, defaultMessage = 'Service unavailable') => {
    if (axios.isAxiosError(err)) {
        // Handle Axios error
        logger.error(new Error(`Imaging service error: ${err.message}`));
        const message = err.response?.data?.message || err.message || defaultMessage;
        res.status(err.response?.status || 500).json({ error: message });
    } else {
        // Handle other errors
        const error = err instanceof Error ? err : new Error('Internal server error');
        logger.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


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




router.post('/parse/folder', async (req: Request, res: Response) => {
    try {
        const { folderPath } = req.body;
        
        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
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

// Uppdatera health endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    console.log('[Backend] Health check request received');
    console.log('[Backend] Calling imaging service at:', `${IMAGING_SERVICE_URL}/health`);
    
    const response = await axios.get(`${IMAGING_SERVICE_URL}/health`);
    console.log('[Backend] Imaging service response:', response.data);
    
    res.json({ 
      status: 'ok', 
      message: 'DICOM routes working',
      imaging_service: response.data 
    });
  } catch (err) {
    console.error('[Backend] Health check failed:', err);
    res.status(500).json({ error: 'Failed to connect to imaging service' });
  }
});

// Debug endpoint
router.get('/debug', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/debug`, {
      params: req.query
    });
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Test endpoint
router.get('/test', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${IMAGING_SERVICE_URL}/test`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});


router.post('/config', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${IMAGING_SERVICE_URL}/api/dicom/config`,
      req.body
    );
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});



// Add volume endpoint
router.get('/volume/:seriesId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${IMAGING_SERVICE_URL}/api/dicom/volume/${req.params.seriesId}`
    );
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Add metadata endpoints
router.get('/metadata/:studyId', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${IMAGING_SERVICE_URL}/api/dicom/metadata/${req.params.studyId}`
    );
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Add stats endpoint
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/stats`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

router.get('/window-presets', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/window-presets`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Add study endpoint
router.get('/study/:studyId', async (req: Request, res: Response) => {
  try {
    console.log('[Backend] Study request received for:', req.params.studyId);
    console.log('[Backend] Calling imaging service at:', `${IMAGING_SERVICE_URL}/api/dicom/study/${req.params.studyId}`);
    
    const response = await axios.get(
      `${IMAGING_SERVICE_URL}/api/dicom/study/${req.params.studyId}`,
      { 
        // Lägg till timeout och extra headers för debugging
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'X-Debug': 'true'
        }
      }
    );
    
    console.log('[Backend] Imaging service response:', response.data);
    res.json(response.data);
  } catch (err) {
    console.error('[Backend] Study fetch error:', err);
    if (axios.isAxiosError(err)) {
      console.error('[Backend] Axios error details:', {
        status: err.response?.status,
        data: err.response?.data,
        config: err.config
      });
    }
    handleServiceError(err, res);
  }
});

// Add series endpoint
router.get('/series', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${IMAGING_SERVICE_URL}/api/dicom/series`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Add studies endpoint
router.get('/studies', async (req: Request, res: Response) => {
  try {
    const patientId = req.query.patientId;
    console.log('[Backend] Fetching studies for patient:', patientId);
    
    const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/studies`, {
      params: { patientId }
    });
    
    console.log('[Backend] Found studies:', response.data.length);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});



router.post('/import', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${IMAGING_SERVICE_URL}/dicom/import`,
      req.body
    );
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

router.get('/patients', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${IMAGING_SERVICE_URL}/patients`);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Hämta imageIds för Cornerstone
router.get('/imageIds', async (req: Request, res: Response) => {
  try {
    console.log('[Backend] Fetching imageIds with params:', req.query);
    const response = await axios.get(`${IMAGING_SERVICE_URL}/api/dicom/imageIds`, {
      params: req.query
    });
    console.log('[Backend] Found imageIds:', response.data.length);
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Hämta DICOM-instans (binärdata)
router.get('/instance/:sopInstanceUid', async (req: Request, res: Response) => {
  try {
    console.log('[Backend] Fetching DICOM instance:', req.params.sopInstanceUid);
    const response = await axios.get(
      `${IMAGING_SERVICE_URL}/api/dicom/instance/${req.params.sopInstanceUid}`,
      { responseType: 'arraybuffer' } // Viktigt: Hämta som binärdata
    );
    
    // Kopiera headers från imaging-service
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) res.setHeader(key, value);
    });
    
    // Skicka binärdata direkt till klienten
    res.send(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// Hämta metadata för DICOM-instans
router.get('/metadata/:sopInstanceUid', async (req: Request, res: Response) => {
  try {
    console.log('[Backend] Fetching metadata for instance:', req.params.sopInstanceUid);
    const response = await axios.get(
      `${IMAGING_SERVICE_URL}/api/dicom/metadata/${req.params.sopInstanceUid}`
    );
    res.json(response.data);
  } catch (err) {
    handleServiceError(err, res);
  }
});

export default router; 