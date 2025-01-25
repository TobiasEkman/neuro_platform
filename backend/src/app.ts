import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import patientRoutes from './routes/patients';
import analysisRoutes from './routes/analysis';
import icpRoutes from './routes/icp';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/neuro_platform', {
} as mongoose.ConnectOptions);

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/icp', icpRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

export default app; 