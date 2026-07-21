"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Upload an image directly to S3 via a presigned PUT (no bytes through our API),
 * then hand the stored object key back to the parent. Accepts a file pick, a
 * drag-drop, OR a paste — snip a screenshot and Ctrl+V straight into the box.
 */
export function ImageUpload({ onChange, label = "Click, paste, or drop a screenshot" }: { onChange: (key: string | null) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Please choose an image.");
    if (file.size > MAX_BYTES) return setError("Image must be under 5 MB.");
    setBusy(true);
    try {
      const { key, uploadUrl } = await apiFetch<{ key: string; uploadUrl: string }>("/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ filename: file.name || "screenshot.png", contentType: file.type }),
      });
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Upload failed — check the bucket's CORS config");
      setPreview(URL.createObjectURL(file));
      onChange(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  const clear = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (preview) {
    return (
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Proof preview" className="h-14 w-14 rounded-lg border border-border object-cover" />
        <Button size="sm" variant="ghost" onClick={clear} type="button">Remove</Button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={(e) => {
          const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
          const file = item?.getAsFile();
          if (file) {
            e.preventDefault();
            void upload(file);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center text-xs outline-none transition-colors",
          dragging ? "border-brand bg-brand/[0.06] text-brand" : "border-border text-muted hover:border-brand/50 hover:text-fg",
          "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20",
        )}
      >
        {busy ? (
          <span>Uploading…</span>
        ) : (
          <>
            <span>{label}</span>
            <span className="text-[10px] text-muted/70">PNG, JPG, WEBP or GIF · up to 5 MB</span>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-down">{error}</p>}
    </>
  );
}
