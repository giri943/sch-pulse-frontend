const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
/** Public API base — used to build stable, auth-free asset URLs (e.g. uploaded images). */
export const apiBaseUrl = API_URL;

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("pulse_at", token);
    else localStorage.removeItem("pulse_at");
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") accessToken = localStorage.getItem("pulse_at");
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// Single-flight refresh: a burst of 401s (e.g. several polling queries firing at
// once after the access token expires) all share ONE /auth/refresh request
// instead of stampeding the endpoint.
let refreshPromise: Promise<boolean> | null = null;
function refresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** The session can't be refreshed (refresh token expired/revoked) → clear it and go to login. */
function handleSessionExpired(): void {
  setAccessToken(null);
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

/** Typed fetch wrapper: attaches the access token and silently refreshes once on 401. */
export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Abort if the server doesn't respond in time so the UI never spins forever
  // (e.g. a cold-starting/free-tier backend). Surfaces a clear, actionable error.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: init.signal ?? controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "The server took too long to respond — it may be waking up. Please try again.");
    }
    throw new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  // Auto-refresh on 401 for protected endpoints. Auth endpoints (login/refresh/
  // google) own their 401s — refreshing on those would loop or hide the real error.
  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refresh()) return apiFetch<T>(path, init, false);
    handleSessionExpired(); // refresh failed → session is genuinely over
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string; details?: unknown } }).error;
    throw new ApiError(res.status, err?.code ?? "ERROR", err?.message ?? "Request failed", err?.details);
  }
  return body as T;
}

export { API_URL };
