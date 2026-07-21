import { apiBaseUrl, getAccessToken, apiFetch } from "@/lib/api-client";

/** Extract the S3 object key from an embedded image URL (CDN or /uploads/view). */
function keyFromSrc(src: string): string | null {
  try {
    const u = new URL(src, apiBaseUrl);
    const q = u.searchParams.get("key");
    if (q) return q; // /uploads/view?key=proofs/...
    const path = u.pathname.replace(/^\//, ""); // CDN: /proofs/... → proofs/...
    const idx = path.indexOf("proofs/");
    return idx >= 0 ? path.slice(idx) : null;
  } catch {
    return null;
  }
}

/** Delete an uploaded image from S3 given its embedded URL (best-effort). */
export async function deleteImage(src: string): Promise<void> {
  const key = keyFromSrc(src);
  if (!key || !key.startsWith("proofs/")) return;
  try {
    await apiFetch(`/uploads?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch {
    /* best-effort cleanup */
  }
}

/**
 * Upload an image and return a stable URL to embed. The bytes go through our API
 * (which streams them to S3), so there's no browser→S3 CORS to configure. The
 * returned URL is the CDN when set, else the backend's on-demand signing redirect.
 * Returns null on failure.
 */
export async function uploadImage(file: File): Promise<string | null> {
  try {
    const token = getAccessToken();
    const res = await fetch(`${apiBaseUrl}/uploads`, {
      method: "POST",
      headers: { "Content-Type": file.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
      body: file,
    });
    if (!res.ok) throw new Error("upload failed");
    const data = (await res.json()) as { key: string; viewUrl: string | null };
    return data.viewUrl ?? `${apiBaseUrl}/uploads/view?key=${encodeURIComponent(data.key)}`;
  } catch {
    return null;
  }
}
