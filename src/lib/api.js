const TOKEN_KEY = "zyphor_token";
const USER_KEY = "zyphor_user";

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};

export const auth = {
  token: () => store.get(TOKEN_KEY),
  user() { try { return JSON.parse(store.get(USER_KEY) || "null"); } catch { return null; } },
  save(token, user) { store.set(TOKEN_KEY, token); store.set(USER_KEY, JSON.stringify(user)); },
  clear() { store.del(TOKEN_KEY); store.del(USER_KEY); },
};

export class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

// Where the API lives. Read at startup from backend.json next to the site, so the backend can move
// (e.g. a laptop whose tunnel address changes on restart) without rebuilding the site; falls back to
// the build-time VITE_API_BASE, then to this same origin (dev proxy, or a backend serving the site).
let runtimeBase = null;

// Request deduplication cache for GET requests
const inflightRequests = new Map();

async function readBackendFile() {
  const r = await fetch(`${import.meta.env.BASE_URL}backend.json`, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return typeof j.api === "string" ? j.api.trim().replace(/\/$/, "") : null;
}

export async function loadBackendConfig() {
  try {
    const base = await Promise.race([readBackendFile(), new Promise((res) => setTimeout(() => res(null), 4000))]);
    if (base !== null) runtimeBase = base;
  } catch { /* keep the build-time default */ }
}

/** The backend may have moved since this page loaded; true if it has (and switch to the new address). */
async function backendMoved() {
  try {
    const base = await readBackendFile();
    if (base !== null && base !== apiBase()) { runtimeBase = base; return true; }
  } catch { /* the site itself is unreachable too */ }
  return false;
}

/** A link the API hands out (e.g. a logo at /api/...) made absolute, since the site may live elsewhere. */
export function apiUrl(path) {
  return path && path.startsWith("/api/") ? apiBase() + path : path;
}

function apiBase() {
  if (runtimeBase !== null) return runtimeBase;
  const configured = import.meta.env.VITE_API_BASE;
  if (configured) return configured.replace(/\/$/, "");
  return "";
}

function errorMessage(data, status) {
  if ([502, 503, 504, 530].includes(status)) return "The server is temporarily unavailable. Please retry in a moment.";
  if (status === 413) return "This file is too large. Please upload a smaller file.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (!data) return `Request failed (${status})`;
  if (typeof data.detail === "string") return /<(!doctype|html|body)/i.test(data.detail) ? `The server returned an unexpected response (${status}). Please try again.` : data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((d) => `${(d.loc || []).filter((x) => x !== "body").join(".")}: ${d.msg}`)
      .join("; ");
  }
  return data.error || `Request failed (${status})`;
}

/** Fired on 401 so the router can bounce to the login screen. */
export const onUnauthorized = { handler: null };

/**
 * Creates a deduplication key for a request.
 * Only GET requests with the same path and query params are deduplicated.
 */
function dedupeKey(method, path, body) {
  if (method !== "GET") return null;
  return `${method}:${path}:${JSON.stringify(body || {})}`;
}

/**
 * Main API function with retry logic, backend failover, and request deduplication.
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {any} body - Request body
 * @param {Object} opts - Options
 * @param {boolean} opts.retry - Whether to retry on failure (default: true for GET)
 * @param {number} opts.timeoutMs - Request timeout in ms (default: 45000)
 * @param {boolean} opts.keepalive - Use keepalive for fetch
 * @param {boolean} opts.raw - Return raw Response instead of parsed JSON
 * @param {boolean} opts.noRedirect - Don't redirect on 401
 * @param {Object} opts.headers - Additional headers
 * @param {AbortSignal} opts.signal - External abort signal
 * @param {boolean} opts.dedupe - Enable request deduplication for GET (default: true)
 */
export async function api(method, path, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = auth.token();
  if (token) headers.Authorization = "Bearer " + token;

  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  // Request deduplication for GET requests
  const dedupe = opts.dedupe !== false && method === "GET";
  const key = dedupe ? dedupeKey(method, path, body) : null;

  if (key && inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  // Reads (and calls marked safe to repeat) retry through a dropped connection or a busy server,
  // which is what a whole lab signing in at once looks like.
  const attempts = method === "GET" || opts.retry ? 4 : 1;
  let res;
  let followed = false;  // re-read backend.json at most once per call

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs || 45000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Allow external signal to abort our request
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort());
  }

  const executeRequest = async (attempt) => {
    try {
      res = await fetch(apiBase() + path, { method, headers, body: payload, keepalive: !!opts.keepalive, signal: controller.signal });
      // 530: Cloudflare can't reach the tunnel - the server restarted under a new address
      if (res.status === 530 && !followed && await backendMoved()) { followed = true; return executeRequest(1); }
      if (![502, 503, 504].includes(res.status) || attempt >= attempts) return res;
    } catch (error) {
      if (error.name === "AbortError") throw new ApiError(0, "The request timed out. Please check the status before trying again.");
      // The old address is gone: if the server has moved, the request never reached it, so it's safe to resend
      if (!followed && await backendMoved()) { followed = true; return executeRequest(1); }
      if (attempt >= attempts) throw new ApiError(0, "Cannot reach the server. Check your connection.");
    }
    finally { clearTimeout(timeout); }
    await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1) + Math.random() * 300));
    return executeRequest(attempt + 1);
  };

  try {
    const promise = executeRequest(1);

    if (dedupe && key) {
      inflightRequests.set(key, promise);
      promise.finally(() => inflightRequests.delete(key));
    }

    res = await promise;
  } finally {
    clearTimeout(timeout);
  }

  if (opts.raw) {
    if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
    return res;
  }

  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { detail: text }; } }

  if (!res.ok) {
    if (res.status === 401 && token === auth.token() && !opts.noRedirect && !path.includes("/auth/login")) {
      auth.clear();
      if (onUnauthorized.handler) onUnauthorized.handler();
    }
    throw new ApiError(res.status, errorMessage(data, res.status), data);
  }
  return data;
}

export function qs(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
  }
  return parts.length ? "?" + parts.join("&") : "";
}

export async function download(path, filename) {
  const res = await api("GET", path, null, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCSV(filename, header, rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const homeFor = (role) => role === "student" ? "/student" : role === "coordinator" ? "/coordinator" : "/console";

/** Clear all inflight request cache (useful for logout or major state changes) */
export function clearInflightCache() {
  inflightRequests.clear();
}