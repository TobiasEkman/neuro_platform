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

// Middleware
app.use(cors());
app.use(express.json());

// All routes are public during development
app.use('/api/health', healthRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/icp', icpRoutes);
app.use('/api/dicom', dicomRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Express server is running' });
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