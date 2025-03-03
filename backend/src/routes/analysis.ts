import { Router } from 'express';
import axios from 'axios';

const router = Router();
const TUMOR_ANALYSIS_URL = 'http://tumor_analysis:5005';  // Updated service name and port

router.post('/tumor/:imageId', async (req, res) => {
  try {
    const response = await axios.post(
      `${TUMOR_ANALYSIS_URL}/api/analysis/tumor/${req.params.imageId}`,
      req.body
    );
    res.json(response.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

// Uppdaterad MGMT endpoint för att matcha tumor_analysis service
router.post('/mgmt/:imageId', async (req, res) => {
  try {
    const response = await axios.post(
      `${TUMOR_ANALYSIS_URL}/api/analysis/mgmt/${req.params.imageId}`,
      req.body
    );
    res.json(response.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

// Lägg till en endpoint för att hämta tillgängliga MRI-sekvenser
router.get('/sequences/:studyId', async (req, res) => {
  try {
    const response = await axios.get(
      `${TUMOR_ANALYSIS_URL}/api/analysis/sequences/${req.params.studyId}`
    );
    res.json(response.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

// Lägg till en endpoint för att validera att alla nödvändiga sekvenser finns
router.get('/validate-sequences/:studyId', async (req, res) => {
  try {
    const response = await axios.get(
      `${TUMOR_ANALYSIS_URL}/api/analysis/validate-sequences/${req.params.studyId}`
    );
    res.json(response.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

export default router; 