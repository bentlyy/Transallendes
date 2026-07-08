import 'express';
import { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '../types/index.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload & {
      id: number;
      email: string;
      role: UserRole;
      name?: string;
      phone?: string;
      tenant_id?: string;
    };
    tenant_id?: string;
    locale?: string;
  }
}
