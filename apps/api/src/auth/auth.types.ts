import type { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; displayName: string | null };
  sessionId?: string;
}
export const IS_PUBLIC = 'isPublic';
export const Public = () => (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
  Reflect.defineMetadata(IS_PUBLIC, true, descriptor?.value ?? target);
};