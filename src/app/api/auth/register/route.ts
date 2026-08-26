import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, isSameOrigin, isValidEmail, noStoreJson, normalizeEmail, validatePasswordStrength } from '@/lib/security';
import { isSupabaseAuthConfigured, supabaseSignUpWithPassword } from '@/lib/supabase-auth';
import { verifyTurnstileFromRequest } from '@/lib/turnstile';
import { databaseUnavailableMessage, isPrismaDatabaseConnectivityError, isPrismaSchemaMissingError, schemaMissingMessage } from '@/lib/prisma-errors';

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return noStoreJson({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { email: rawEmail, password, name, turnstileToken } = await request.json();
    const email = normalizeEmail(rawEmail || "");
    const safeName = typeof name === "string" ? name.trim().slice(0, 80) : "";

    if (!email || !password) {
      return noStoreJson({ error: 'Email and password required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return noStoreJson({ error: 'Invalid email format' }, { status: 400 });
    }

    if (typeof password !== "string" || password.length > 1024) {
      return noStoreJson({ error: 'Invalid password input.' }, { status: 400 });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return noStoreJson({ error: passwordError }, { status: 400 });
    }

    if (!(await verifyTurnstileFromRequest(turnstileToken, request))) {
      return noStoreJson({ error: 'CAPTCHA validation failed.' }, { status: 403 });
    }

    const identifier = `${getClientIp(request)}:${email}`;
    const isAllowed = await checkRateLimit(identifier, 'register_attempt', 5, 15);
    if (!isAllowed) {
      return noStoreJson({ error: 'Too many registration attempts. Please try later.' }, { status: 429 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return noStoreJson({ error: 'User already exists' }, { status: 409 });
    }

    if (!isSupabaseAuthConfigured()) {
      return noStoreJson(
        { error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' },
        { status: 500 }
      );
    }

    const signUpResult = await supabaseSignUpWithPassword({
      email,
      password,
      name: safeName || undefined,
      captchaToken: typeof turnstileToken === "string" ? turnstileToken : undefined,
    });

    if (!signUpResult.ok) {
      return noStoreJson({ error: signUpResult.error }, { status: signUpResult.status || 400 });
    }

    await prisma.user.create({
      data: {
        email: email,
        name: safeName || null,
      }
    });

    return noStoreJson({
      success: true,
      message: 'User registered successfully. Check your email if confirmation is required.'
    });
  } catch (error) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const dbOrNetworkUnavailable =
      isPrismaDatabaseConnectivityError(error) ||
      message.includes("can't reach database server") ||
      message.includes("fetch failed") ||
      message.includes("econnrefused") ||
      message.includes("enotfound");

    if (dbOrNetworkUnavailable) {
      return noStoreJson(
        { error: databaseUnavailableMessage("Registration") },
        { status: 503 }
      );
    }

    if (isPrismaSchemaMissingError(error)) {
      return noStoreJson(
        { error: schemaMissingMessage("Registration") },
        { status: 503 }
      );
    }
    return noStoreJson({ error: 'Internal server error' }, { status: 500 });
  }
}
