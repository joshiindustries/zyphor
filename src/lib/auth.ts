import { AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { getAvatarFromSupabaseUser, getNameFromSupabaseUser, isSupabaseAuthConfigured, supabaseSignInWithPassword } from "@/lib/supabase-auth";
import { isValidEmail, normalizeEmail } from "@/lib/security";
import { databaseUnavailableMessage, isPrismaDatabaseConnectivityError, isPrismaSchemaMissingError, schemaMissingMessage } from "@/lib/prisma-errors";
import { cookies } from "next/headers";
import { sendOtpEmail } from "@/lib/email";

function sanitizeDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().slice(0, 80);
  return value || null;
}

function sanitizeAvatarUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value || value.length > 2048) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function shouldEnforceTurnstile(): boolean {
  if (process.env.TURNSTILE_ENFORCE === "true") return true;
  if (process.env.TURNSTILE_ENFORCE === "false") return false;
  return process.env.NODE_ENV === "production";
}

async function verifyTurnstile(token?: string | null): Promise<boolean> {
  if (!shouldEnforceTurnstile()) {
    // In local/dev environments, allow auth flow to continue even if Turnstile is blocked.
    return true;
  }

  if (!token) return false;

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is missing.");
    return false;
  }

  const formData = new URLSearchParams();
  formData.append("secret", secretKey);
  formData.append("response", token);

  try {
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!verifyRes.ok) return false;

    const verifyData = await verifyRes.json();
    return Boolean(verifyData?.success);
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
        fingerprintHash: { label: "Fingerprint Hash", type: "text" }
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email || "";
        const password = credentials?.password || "";
        const turnstileToken = credentials?.turnstileToken;
        const fingerprintHash = credentials?.fingerprintHash || "unknown";
        const email = normalizeEmail(rawEmail);

        if (!email || !password || !isValidEmail(email)) return null;

        // Rate Limiter: maximum of 5 attempts per 15 minutes per email to prevent vertical brute force
        const isAllowed = await checkRateLimit(email, "login_attempt", 5, 15);
        if (!isAllowed) {
          throw new Error("Too many failed login attempts. Please try again later.");
        }

        const turnstileOk = await verifyTurnstile(turnstileToken);
        if (!turnstileOk) {
          throw new Error("CAPTCHA validation failed.");
        }

        try {
          if (isSupabaseAuthConfigured()) {
            const authResult = await supabaseSignInWithPassword({
              email,
              password,
              captchaToken: turnstileToken,
            });

            if (authResult.ok) {
              let dbUser = await prisma.user.findUnique({
                where: { email },
              });

              const name = getNameFromSupabaseUser(authResult.user);
              const avatar = getAvatarFromSupabaseUser(authResult.user);
              const safeName = sanitizeDisplayName(name);
              const safeAvatar = sanitizeAvatarUrl(avatar);

              if (!dbUser) {
                dbUser = await prisma.user.create({
                  data: {
                    email,
                    name: safeName,
                    avatar: safeAvatar,
                  },
                });
              } else if (safeName || safeAvatar) {
                dbUser = await prisma.user.update({
                  where: { id: dbUser.id },
                  data: {
                    name: safeName || dbUser.name,
                    avatar: safeAvatar || dbUser.avatar,
                  },
                });
              }

              const returnUser = { id: dbUser.id, email: dbUser.email, name: dbUser.name, image: dbUser.avatar };
              return await verifyDeviceAndReturn(returnUser, fingerprintHash);
            }

            if (authResult.status >= 500) {
              throw new Error(authResult.error || databaseUnavailableMessage("Supabase authentication"));
            }
          }

          // Legacy fallback: supports existing local password_hash users until migration is complete.
          const legacyUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!legacyUser || !legacyUser.password_hash) return null;

          const [salt, hash] = legacyUser.password_hash.split(":");
          const verifyHash = crypto.scryptSync(password, salt, 64).toString("hex");

          const returnUser = {
            id: legacyUser.id,
            email: legacyUser.email,
            name: legacyUser.name,
            image: legacyUser.avatar,
          };
          return await verifyDeviceAndReturn(returnUser, fingerprintHash);
        } catch (error: any) {
          if (isPrismaDatabaseConnectivityError(error)) {
            throw new Error(databaseUnavailableMessage("Authentication"));
          }
          if (isPrismaSchemaMissingError(error)) {
            throw new Error(schemaMissingMessage("Authentication"));
          }
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (!user.email || !isValidEmail(user.email)) return false;
      const normalizedEmail = normalizeEmail(user.email);

      try {
        // Check if user exists
        let dbUser = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
        
        const socialName =
          sanitizeDisplayName(user.name) ||
          sanitizeDisplayName(profile?.name) ||
          sanitizeDisplayName(profile?.login) ||
          sanitizeDisplayName(profile?.preferred_username) ||
          null;
        const socialAvatar =
          sanitizeAvatarUrl(user.image) ||
          sanitizeAvatarUrl(profile?.picture) ||
          sanitizeAvatarUrl(profile?.avatar_url) ||
          null;

        const userId = dbUser?.id || crypto.randomUUID();

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              id: userId,
              name: socialName,
              email: normalizedEmail,
              avatar: socialAvatar,
            }
          });
        } else if (account?.provider !== "credentials") {
          // Update profile details from social providers.
          dbUser = await prisma.user.update({
            where: { id: userId },
            data: {
              name: socialName || dbUser.name || null,
              avatar: socialAvatar || dbUser.avatar || null,
            }
          });
        }

        // If social login, link account identity only (no access token persistence by default).
        if (account && account.provider !== "credentials") {
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              }
            }
          });

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: userId,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              }
            });
          }
        }

        user.id = dbUser.id;
        user.email = dbUser.email;
        user.name = dbUser.name || user.name;
        user.image = dbUser.avatar || user.image;

        return true;
      } catch (error) {
        console.error("NextAuth signIn callback failed:", error);
        if (isPrismaDatabaseConnectivityError(error)) {
          return "/login?error=database_unavailable";
        }
        if (isPrismaSchemaMissingError(error)) {
          return "/login?error=schema_missing";
        }
        return false;
      }
    },
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      if (trigger === "update" && session?.image) {
        token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.image = (token.picture as string) || session.user.image;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET as string
};

type DynamicServerUsageError = {
  digest?: string;
};

function isDynamicServerUsageError(error: unknown): error is DynamicServerUsageError {
  if (!error || typeof error !== "object") return false;
  return (error as DynamicServerUsageError).digest === "DYNAMIC_SERVER_USAGE";
}

export async function getUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;
    return session.user as any;
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      throw error;
    }
    console.error('Auth error:', error);
    return null;
  }
}

async function verifyDeviceAndReturn(user: any, fingerprintHash: string) {
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get("zyphor_device_token")?.value;

  let isTrusted = false;

  if (deviceToken) {
    const tokenHash = crypto.createHash("sha256").update(deviceToken).digest("hex");
    const trustedDevice = await prisma.trustedDevice.findUnique({
      where: { device_id: tokenHash }
    });

    if (trustedDevice && trustedDevice.user_id === user.id && trustedDevice.trusted) {
      if (!trustedDevice.expires_at || trustedDevice.expires_at > new Date()) {
        isTrusted = true;
        // Update last active
        await prisma.trustedDevice.update({
          where: { id: trustedDevice.id },
          data: { last_active: new Date(), fingerprint_hash: fingerprintHash }
        });
      }
    }
  }

  if (!isTrusted) {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clear old OTPs
    await prisma.deviceOtp.deleteMany({ where: { user_id: user.id } });

    await prisma.deviceOtp.create({
      data: {
        user_id: user.id,
        email: user.email,
        otp: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    console.log(`\n\n========================================`);
    console.log(`ðŸ”’ NEW DEVICE LOGIN DETECTED`);
    console.log(`ðŸ“§ To: ${user.email}`);
    console.log(`ðŸ”‘ OTP: ${otp}`);
    console.log(`========================================\n\n`);

    // Send the actual email
    await sendOtpEmail(user.email, otp);

    throw new Error("device_verification_required");
  }

  return user;
}
