import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err, req);
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ 
      status: 'error',
      message: err.message 
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      status: 'error',
      message: err.message 
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      status: 'error',
      message: 'Unauthorized' 
    });
  }
  
  // Default error
  res.status(500).json({ 
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}; 