const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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

async function refresh(): Promise<boolean> {
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

/** Typed fetch wrapper: attaches the access token and retries once on 401. */
export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });

  if (res.status === 401 && retry) {
    if (await refresh()) return apiFetch<T>(path, init, false);
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
