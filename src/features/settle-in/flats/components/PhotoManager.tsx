"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS, LISTING_MAX_PHOTOS, listingPhotoUrl, PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/supabase/storage";
import { reencodeImage } from "@/lib/utils/image";

import { addListingPhoto, removeListingPhoto, reorderListingPhotos } from "../actions";
import { flatsStrings } from "../strings";
import type { ListingPhoto } from "../types";

const s = flatsStrings.photos;

type Props = { listingId: string; initialPhotos: ListingPhoto[] };

// Every photo is re-encoded in the browser before upload, which strips EXIF data such as GPS
// coordinates (D-019), then uploaded to '{listingId}/{uuid}.jpg' in the public listing-photos bucket.
export function PhotoManager({ listingId, initialPhotos }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = photos.length >= LISTING_MAX_PHOTOS;

  function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);
    if (photos.length + files.length > LISTING_MAX_PHOTOS) {
      setError(s.limit(LISTING_MAX_PHOTOS));
      return;
    }
    if (files.some((file) => !(PHOTO_MIME_TYPES as readonly string[]).includes(file.type))) {
      setError(s.wrongType);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      for (const file of files) {
        try {
          const blob = await reencodeImage(file);
          if (blob.size > PHOTO_MAX_BYTES) {
            setError(s.tooLarge);
            continue;
          }
          const path = `${listingId}/${crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from(BUCKETS.listingPhotos)
            .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (uploadError) {
            setError(s.failed);
            continue;
          }
          const result = await addListingPhoto({ listingId, path });
          if (!result.ok) {
            setError(result.error);
            continue;
          }
          setPhotos((current) => [...current, result.data]);
        } catch {
          setError(s.failed);
        }
      }
      router.refresh();
    });
  }

  function remove(photo: ListingPhoto) {
    setError(null);
    startTransition(async () => {
      const result = await removeListingPhoto({ listingId, photoId: photo.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhotos((current) => current.filter((p) => p.id !== photo.id));
      toast.success(s.removed);
      router.refresh();
    });
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setPhotos(next);
    setError(null);
    startTransition(async () => {
      const result = await reorderListingPhotos({ listingId, photoIds: next.map((p) => p.id) });
      if (!result.ok) {
        setError(result.error);
        setPhotos(photos);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{s.intro(LISTING_MAX_PHOTOS)}</p>

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="space-y-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- listing photo served from Supabase Storage */}
                <img
                  src={listingPhotoUrl(photo.storage_path) ?? ""}
                  alt={s.alt(index + 1)}
                  loading="lazy"
                  className="size-full object-cover"
                />
                {index === 0 && <Badge variant="secondary" className="absolute top-1.5 left-1.5">{s.cover}</Badge>}
              </div>
              <div className="flex justify-between">
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={s.moveUp(index + 1)}
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={s.moveDown(index + 1)}
                    disabled={pending || index === photos.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 text-destructive"
                  aria-label={s.remove(index + 1)}
                  disabled={pending}
                  onClick={() => remove(photo)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        id="listing-photos"
        type="file"
        multiple
        accept={PHOTO_MIME_TYPES.join(",")}
        className="sr-only"
        aria-label={s.add}
        onChange={onFiles}
        disabled={pending || full}
        tabIndex={-1}
      />
      <Button type="button" variant="outline" className="h-11" disabled={pending || full} onClick={() => inputRef.current?.click()}>
        <ImagePlus aria-hidden="true" />
        {pending ? s.uploading : s.add}
      </Button>
      {full && <p className="text-sm text-muted-foreground">{s.limit(LISTING_MAX_PHOTOS)}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
