import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'customer' | 'agent' | 'admin';
      };
    }
  }
}

export function verifyJWT(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const token = header.slice(7);

  let payload: { sub: string; email: string; role: 'customer' | 'agent' | 'admin' };
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as typeof payload;
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}
