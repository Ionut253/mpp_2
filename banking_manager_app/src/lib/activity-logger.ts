import prisma from './prisma';
import { Prisma } from '@prisma/client';

// We need to use the enum values directly since the generated type might not be available yet
export type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

export interface LogActivityParams {
  userId: string;
  action: ActionType;
  entity: string;
  entityId: string;
  details?: string;
}

export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  details
}: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action: action as any, 
        entity,
        entityId,
        details
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Middleware to log API requests
export async function logApiActivity(
  req: Request,
  action: ActionType,
  entity: string,
  entityId: string,
  userId: string,
  details?: string
) {
  try {
    const url = new URL(req.url);
    const method = req.method;
    const logDetails = details || `${method} ${url.pathname}`;

    await logActivity({
      userId,
      action,
      entity,
      entityId,
      details: logDetails
    });
  } catch (error) {
    console.error('Error logging API activity:', error);
  }
} 