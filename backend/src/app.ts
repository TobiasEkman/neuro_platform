import express from 'express';
import cors from 'cors';
import mongoose, { ConnectOptions } from 'mongoose';
import { errorHandler } from './middleware/errorHandler';
import patientRoutes from './routes/patients';
import analysisRoutes from './routes/analysis';
import icpRoutes from './routes/icp';
import dicomRoutes from './routes/dicom';
import healthRoutes from './routes/health';

const app = express();

// Add this before other middleware
app.use((req, res, next) => {
  console.log('\nExpress Backend Request:', {
    path: req.path,
    method: req.method,
    headers: req.headers,
    url: req.url
  });
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// All routes are public during development
app.use('/patients', patientRoutes);
app.use('/analysis', analysisRoutes);
app.use('/icp', icpRoutes);
app.use('/dicom', dicomRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Express backend test route',
    path: req.path,
    method: req.method
  });
});

// Add this before the routes
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'Debug endpoint reached',
    path: req.path,
    headers: req.headers
  });
});

// Error handling
app.use(errorHandler);

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/neuro_platform', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
} as ConnectOptions).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

export default app; 