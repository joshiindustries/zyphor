import { NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { noStoreJson } from '@/lib/security';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getUser(request);
    if (!sessionUser?.id) {
      return noStoreJson({ user: null });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        username: true,
        bio: true,
      },
    });

    if (!dbUser) {
      return noStoreJson({ user: sessionUser });
    }

    return noStoreJson({
      user: {
        ...sessionUser,
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || sessionUser.name || null,
        image: dbUser.avatar || sessionUser.image || null,
        avatar: dbUser.avatar || sessionUser.image || null,
        username: dbUser.username || null,
        bio: dbUser.bio || null,
      },
    });
  } catch {
    // Keep the frontend stable if auth/session lookup fails temporarily.
    return noStoreJson({ user: null });
  }
}
