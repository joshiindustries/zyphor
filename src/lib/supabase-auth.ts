import { normalizeEmail } from "@/lib/security";

type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

type SupabaseAuthResponse = {
  user?: SupabaseUser | null;
  access_token?: string;
  refresh_token?: string;
  msg?: string;
  error?: string;
  error_description?: string;
};

function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !anonKey) {
    return null;
  }

  let url = rawUrl.replace(/\/+$/, "");
  // Accept legacy values like .../rest/v1 or .../auth/v1 and normalize to project base URL.
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/auth\/v1$/i, "");
  if (/your-project-ref|<project-ref>/i.test(url)) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

function getErrorMessage(payload: any, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  return payload.msg || payload.error_description || payload.error || payload.message || fallback;
}

async function parseJsonSafe(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

export async function supabaseSignUpWithPassword(params: {
  email: string;
  password: string;
  name?: string;
  captchaToken?: string | null;
}): Promise<{ ok: true; user: SupabaseUser | null } | { ok: false; error: string; status: number }> {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, error: "Supabase auth is not configured.", status: 500 };
  }

  const body: Record<string, any> = {
    email: normalizeEmail(params.email),
    password: params.password,
  };

  if (params.name) body.data = { name: params.name };
  if (params.captchaToken) body.captcha_token = params.captchaToken;

  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error: "Unable to reach Supabase Auth. Check SUPABASE_URL and network access.",
      status: 503,
    };
  }

  const payload = (await parseJsonSafe(response)) as SupabaseAuthResponse | null;
  if (!response.ok) {
    return {
      ok: false,
      error: getErrorMessage(payload, "Supabase sign-up failed."),
      status: response.status,
    };
  }

  return { ok: true, user: payload?.user || null };
}

export async function supabaseSignInWithPassword(params: {
  email: string;
  password: string;
  captchaToken?: string | null;
}): Promise<{ ok: true; user: SupabaseUser | null } | { ok: false; error: string; status: number }> {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, error: "Supabase auth is not configured.", status: 500 };
  }

  const body: Record<string, any> = {
    email: normalizeEmail(params.email),
    password: params.password,
  };

  if (params.captchaToken) body.captcha_token = params.captchaToken;

  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error: "Unable to reach Supabase Auth. Check SUPABASE_URL and network access.",
      status: 503,
    };
  }

  const payload = (await parseJsonSafe(response)) as SupabaseAuthResponse | null;
  if (!response.ok) {
    return {
      ok: false,
      error: getErrorMessage(payload, "Invalid credentials."),
      status: response.status,
    };
  }

  return { ok: true, user: payload?.user || null };
}

export function getNameFromSupabaseUser(user: SupabaseUser | null | undefined): string | null {
  const metadata = user?.user_metadata || {};
  const name = metadata.name || metadata.full_name || metadata.user_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function getAvatarFromSupabaseUser(user: SupabaseUser | null | undefined): string | null {
  const metadata = user?.user_metadata || {};
  const avatar = metadata.avatar_url || metadata.picture;
  return typeof avatar === "string" && avatar.trim() ? avatar.trim() : null;
}
