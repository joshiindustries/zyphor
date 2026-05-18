import { NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, isSameOrigin, isValidLinkId, noStoreJson } from '@/lib/security';
import {
  databaseUnavailableMessage,
  isPrismaClientOutOfSyncError,
  isPrismaDatabaseConnectivityError,
  prismaClientOutOfSyncMessage,
} from '@/lib/prisma-errors';

export async function PATCH(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return noStoreJson({ error: 'Invalid request origin' }, { status: 403 });
    }

    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowed = await checkRateLimit(`${getClientIp(request)}:${user.id}`, 'edit_link', 60, 5);
    if (!allowed) {
      return noStoreJson({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id, maxDownloads, expiresAt, allowSave, authRequired } = await request.json();

    if (!id || !isValidLinkId(id) || maxDownloads === undefined || !expiresAt) {
      return noStoreJson({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedMaxDownloads = Number(maxDownloads);
    if (!Number.isFinite(parsedMaxDownloads) || parsedMaxDownloads < 0 || parsedMaxDownloads > 1000) {
      return noStoreJson({ error: 'maxDownloads must be between 0 and 1000.' }, { status: 400 });
    }

    if (allowSave !== undefined && typeof allowSave !== 'boolean') {
      return noStoreJson({ error: 'allowSave must be a boolean.' }, { status: 400 });
    }
    if (authRequired !== undefined && typeof authRequired !== 'boolean') {
      return noStoreJson({ error: 'authRequired must be a boolean.' }, { status: 400 });
    }

    // Verify ownership
    const link = await prisma.link.findUnique({
      where: { id }
    });
    
    if (!link || link.user_id !== user.id) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
    }

    // Update metadata
    const date = new Date(expiresAt);
    if (isNaN(date.getTime())) {
      return noStoreJson({ error: 'Invalid date format' }, { status: 400 });
    }
    if (date.getTime() < Date.now() - 60_000) {
      return noStoreJson({ error: 'Expiration time cannot be in the past.' }, { status: 400 });
    }
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if (date.getTime() > Date.now() + oneYearMs) {
      return noStoreJson({ error: 'Expiration cannot be more than 1 year from now.' }, { status: 400 });
    }
    
    const allowSaveInt = allowSave === false ? 0 : 1;
    const authRequiredInt = authRequired === true ? 1 : 0;

    await prisma.link.update({
      where: { id },
      data: {
        max_downloads: Math.floor(parsedMaxDownloads),
        expires_at: date,
        allow_save: allowSaveInt,
        ...(authRequired !== undefined ? { auth_required: authRequiredInt } : {}),
      }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error('Update link error:', error);
    if (isPrismaClientOutOfSyncError(error)) {
      return noStoreJson({ error: prismaClientOutOfSyncMessage('Link update') }, { status: 503 });
    }
    if (isPrismaDatabaseConnectivityError(error)) {
      return noStoreJson({ error: databaseUnavailableMessage('Link update') }, { status: 503 });
    }
    return noStoreJson({ error: 'Internal server error' }, { status: 500 });
  }
}
