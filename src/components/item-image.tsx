"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "checklist-images";
const MAX_BYTES = 5 * 1024 * 1024;

export type ItemImageLabels = {
  add: string;
  change: string;
  remove: string;
  uploading: string;
  error: string;
};

export type ItemImageUpload = { path: string; token: string; publicUrl: string };

// Per-item image control for the edit screen. Uploads client-side straight to
// Supabase Storage (Server Actions cap request bodies at ~1MB, too small for
// images), then persists the resulting public URL via the onPersist action.
//
// The auth cookies are HttpOnly, so the browser Supabase client has no session
// of its own: onRequestUpload (a Server Action) checks ownership and returns a
// signed upload URL token, and the browser client only uses it to send the
// file with uploadToSignedUrl, which needs no session.
export function ItemImage({
  itemId,
  imageUrl,
  labels,
  onRequestUpload,
  onPersist,
}: {
  itemId: string;
  imageUrl: string | null;
  labels: ItemImageLabels;
  onRequestUpload: (
    itemId: string,
    fileName: string,
    contentType: string
  ) => Promise<ItemImageUpload>;
  onPersist: (itemId: string, imageUrl: string | null) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(imageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/") || file.size > MAX_BYTES) {
      setError(labels.error);
      return;
    }
    setUploading(true);
    try {
      // The server picks the {uid}/{gameId}/{itemId}/… path and signs it.
      const { path, token, publicUrl } = await onRequestUpload(
        itemId,
        file.name,
        file.type
      );
      const { error: upErr } = await createClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(path, token, file, {
          cacheControl: "3600",
          contentType: file.type,
        });
      if (upErr) throw upErr;
      await onPersist(itemId, publicUrl);
      setUrl(publicUrl);
    } catch {
      setError(labels.error);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      await onPersist(itemId, null);
      setUrl(null);
    } catch {
      setError(labels.error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {url && (
        <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
          <Image
            src={url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-contain"
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : url ? (
            <RefreshCw className="size-3.5" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {uploading ? labels.uploading : url ? labels.change : labels.add}
        </button>
        {url && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            {labels.remove}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
