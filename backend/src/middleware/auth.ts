import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthError } from '../utils/errors';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface UserPayload {
  id: string;
  email: string;
  // add other user properties you need
}

// Add paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/health',
  '/api/dicom/search',
  '/api/dicom/upload',
  '/api/dicom/stats',
  '/api/dicom/series',
  '/api/dicom/image',
  '/api/patients'
];

const isDevelopment = process.env.NODE_ENV === 'development';
const PUBLIC_ROUTES = [
  '/api/dicom/debug',
  '/api/dicom/test',
  '/api/dicom/list',
  '/api/dicom/series',
  '/api/dicom/image',
  '/api/health',
  '/api/patients'
];

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if path is public
  if (PUBLIC_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip auth for public routes in development
  if (isDevelopment && PUBLIC_ROUTES.some(route => req.path.startsWith(route))) {
    logger.info('Skipping auth for development route:', req.path);
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new AuthError('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    logger.info('User authenticated', { userId: decoded.id });
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token');
    } else {
      next(err);
    }
  }
}; 