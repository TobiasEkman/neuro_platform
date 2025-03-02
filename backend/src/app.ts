import express from 'express';
import cors from 'cors';
import mongoose, { ConnectOptions } from 'mongoose';
import { errorHandler } from './middleware/errorHandler';
import patientRoutes from './routes/patients';
import analysisRoutes from './routes/analysis';
import icpRoutes from './routes/icp';
import dicomRouter from './routes/dicom';

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
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// All routes are public during development
app.use('/api/patients', patientRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/icp', icpRoutes);
app.use('/api/dicom', dicomRouter);

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