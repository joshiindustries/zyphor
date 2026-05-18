import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, isSameOrigin, isValidLinkId } from '@/lib/security';
import { isPrismaDatabaseConnectivityError } from '@/lib/prisma-errors';
import { deleteSupabaseObject, isSupabaseStorageError } from '@/lib/supabase-storage';

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'CSRF attempt blocked' }, { status: 403 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url), 303);
    }

    const allowed = await checkRateLimit(`${getClientIp(request)}:${user.id}`, 'delete_link', 30, 5);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const formData = await request.formData();
    const linkId = formData.get('id') as string;

    if (!linkId || !isValidLinkId(linkId)) {
      return NextResponse.redirect(new URL('/dashboard', request.url), 303);
    }

    // Verify ownership
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: { files: true }
    });
    
    if (!link || link.user_id !== user.id) {
      return NextResponse.redirect(new URL('/dashboard', request.url), 303);
    }

    // Delete files from file system transactionally
    let allDeleted = true;
    for (const file of link.files) {
      try {
        if (file.storage_path) {
          await deleteSupabaseObject(file.storage_path);
        }
      } catch (err) {
        if (isSupabaseStorageError(err) && err.status === 404) continue;
        console.error('Failed to delete file from Supabase Storage:', err);
        allDeleted = false;
      }
    }

    if (!allDeleted) {
      return NextResponse.json({ error: 'Failed to sync storage deletion, aborting database removal' }, { status: 500 });
    }

    // Delete link (Cascading delete will remove files and savedLinks)
    await prisma.link.delete({
      where: { id: linkId }
    });

    // Redirect back to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url), 303);
  } catch (error) {
    console.error('Delete error:', error);
    if (isPrismaDatabaseConnectivityError(error)) {
      return NextResponse.redirect(new URL('/dashboard?error=db_unavailable', request.url), 303);
    }
    return NextResponse.redirect(new URL('/dashboard', request.url), 303);
  }
}
