import { UserPayload } from '../../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      files?: Express.Multer.File[];
    }
  }
}

export {}; 