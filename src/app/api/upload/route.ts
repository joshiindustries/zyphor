import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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
import {
  assertSupabaseStorageConfigured,
  deleteSupabaseObject,
  isSupabaseStorageError,
  uploadSupabaseObject,
} from '@/lib/supabase-storage';

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return noStoreJson({ success: false, error: 'Invalid request origin' }, { status: 403 });
    }

    const formData = await request.formData();
    
    const files = formData.getAll('files') as File[];
    if (files.length === 0) {
      return noStoreJson({ success: false, error: 'At least one file is required.' }, { status: 400 });
    }

    if (files.length > 10) {
      return noStoreJson({ success: false, error: 'You can upload up to 10 files per transfer.' }, { status: 400 });
    }

    const maxDownloadsRaw = parseInt(formData.get('maxDownloads') as string, 10);
    const maxDownloads = Number.isFinite(maxDownloadsRaw) ? Math.max(0, Math.min(maxDownloadsRaw, 1000)) : 0;
    
    // Enforce authentication: Guest uploads are strictly prohibited
    const user = await getUser();
    if (!user) {
      return noStoreJson({ success: false, error: 'Unauthorized. Guest uploads are not allowed.' }, { status: 401 });
    }
    const userId = user.id;

    const uploadAllowed = await checkRateLimit(`${getClientIp(request)}:${userId}`, 'upload_attempt', 20, 15);
    if (!uploadAllowed) {
      return noStoreJson({ success: false, error: 'Too many uploads. Please try again later.' }, { status: 429 });
    }
    
    const customLinkId = formData.get('customLinkId') as string | null;
    let linkId = '';
    
    const allowSaveStr = formData.get('allowSave') as string;
    if (allowSaveStr !== "true" && allowSaveStr !== "false") {
      return noStoreJson({ success: false, error: 'Invalid allowSave flag.' }, { status: 400 });
    }
    const allowSave = allowSaveStr === 'false' ? 0 : 1;

    const authRequiredStr = formData.get('authRequired') as string;
    if (authRequiredStr !== "true" && authRequiredStr !== "false") {
      return noStoreJson({ success: false, error: 'Invalid authRequired flag.' }, { status: 400 });
    }
    const authRequired = authRequiredStr === "true" ? 1 : 0;
    
    if (customLinkId) {
      if (!isValidLinkId(customLinkId)) {
        return noStoreJson({ success: false, error: 'Custom link can only contain letters, numbers, and hyphens' }, { status: 400 });
      }
      
      const existingLink = await prisma.link.findUnique({ where: { id: customLinkId } });
      if (existingLink) {
        return noStoreJson({ success: false, error: 'Custom link is already taken' }, { status: 409 });
      }
      linkId = customLinkId;
    } else {
      linkId = crypto.randomBytes(8).toString('hex');
    }
    
    // Link expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const salts = formData.getAll('salt').map((value) => String(value || ''));
    const ivs = formData.getAll('iv').map((value) => String(value || ''));
    const originalNames = formData.getAll('originalName').map((value) => String(value || ''));
    const originalMimes = formData.getAll('originalMime').map((value) => String(value || '').toLowerCase());

    if (
      salts.length !== files.length ||
      ivs.length !== files.length ||
      originalNames.length !== files.length ||
      originalMimes.length !== files.length
    ) {
      return noStoreJson({ success: false, error: 'Invalid encryption metadata.' }, { status: 400 });
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = originalNames[i] || file.name || 'encrypted-file';

      // AES-GCM ciphertext has small overhead. Keep limit near 50MB while allowing encrypted payload.
      if (file.size > 50 * 1024 * 1024 + 1024) {
        return noStoreJson({ success: false, error: `File exceeds maximum allowed size (50MB): ${originalName}` }, { status: 413 });
      }
    }

    for (let i = 0; i < files.length; i++) {
      const salt = salts[i];
      const iv = ivs[i];
      if (!salt || !iv) {
        return noStoreJson({ success: false, error: 'Missing encryption salt/iv.' }, { status: 400 });
      }

      const saltBytes = Buffer.from(salt, 'base64');
      const ivBytes = Buffer.from(iv, 'base64');
      if (saltBytes.length !== 16 || ivBytes.length !== 12) {
        return noStoreJson({ success: false, error: 'Invalid encryption metadata format.' }, { status: 400 });
      }
    }

    await prisma.link.create({
      data: {
        id: linkId,
        user_id: userId,
        expires_at: expiresAt,
        max_downloads: maxDownloads,
        allow_save: allowSave,
        auth_required: authRequired,
      }
    });

    try {
      assertSupabaseStorageConfigured();
    } catch (storageError) {
      console.error("Storage is not configured:", storageError);
      const message = isSupabaseStorageError(storageError)
        ? storageError.message
        : "Storage is not configured. Set SUPABASE_STORAGE_BUCKET and Supabase credentials.";
      const status = isSupabaseStorageError(storageError) ? storageError.status : 503;
      return noStoreJson(
        { success: false, error: message },
        { status }
      );
    }
    const uploadedPaths: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = uuidv4();
        const salt = salts[i];
        const iv = ivs[i];
        const originalName = (originalNames[i] || file.name || 'encrypted-file').slice(0, 255);
        
        const storagePath = `uploads/${fileId}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await uploadSupabaseObject(storagePath, buffer, 'application/octet-stream');
        uploadedPaths.push(storagePath);

        await prisma.file.create({
          data: {
            id: fileId,
            link_id: linkId,
            original_name: originalName,
            size: file.size,
            storage_path: storagePath,
            salt: salt,
            iv: iv
          }
        });
      }
    } catch (uploadError) {
      for (const path of uploadedPaths) {
        try {
          await deleteSupabaseObject(path);
        } catch {
          // best-effort cleanup
        }
      }

      await prisma.link.delete({ where: { id: linkId } }).catch(() => {});
      throw uploadError;
    }

    return noStoreJson({ success: true, linkId });
  } catch (error) {
    console.error('Upload Error:', error);
    if (isPrismaClientOutOfSyncError(error)) {
      return noStoreJson({ success: false, error: prismaClientOutOfSyncMessage('Upload service') }, { status: 503 });
    }
    if (isPrismaDatabaseConnectivityError(error)) {
      return noStoreJson({ success: false, error: databaseUnavailableMessage('Upload service') }, { status: 503 });
    }
    if (isSupabaseStorageError(error)) {
      return noStoreJson(
        { success: false, error: error.message },
        { status: error.status || 503 }
      );
    }
    return noStoreJson({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
