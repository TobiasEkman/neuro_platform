import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthError } from '../utils/errors';
import { logger } from '../utils/logger';

interface UserPayload {
  id: string;
  email: string;
  // add other user properties you need
}

const isDevelopment = process.env.NODE_ENV === 'development';
const PUBLIC_ROUTES = [
  '/api/dicom/debug',
  '/api/dicom/test',
  '/api/dicom/list',
  '/api/dicom/series',
  '/api/dicom/image',
  '/api/health'
];

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip auth for public routes in development
  if (isDevelopment && PUBLIC_ROUTES.some(route => req.path.startsWith(route))) {
    logger.info('Skipping auth for development route:', req.path);
    return next();
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AuthError('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as UserPayload;
    req.user = decoded;
    logger.info('User authenticated', { userId: decoded.id });
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new AuthError('Invalid token'));
    } else {
      next(err);
    }
  }
}; 