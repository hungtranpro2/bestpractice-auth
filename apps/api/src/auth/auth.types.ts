import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; displayName: string | null };
  sessionId?: string;
}