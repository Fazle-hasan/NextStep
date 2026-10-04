"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES, publicFileUrl } from "@/lib/supabase/storage";
import { reencodeImage } from "@/lib/utils/image";

import { addPlacePhoto, deletePlacePhoto } from "../actions";
import { MAX_PLACE_PHOTOS } from "../schemas";
import { placesAdminStrings } from "../strings";
import type { AdminPlacePhoto } from "../types";

const s = placesAdminStrings.photos;
const BUCKET = "place-photos";
// Before re-encoding; the re-encoded JPEG must fit the bucket limit.
const RAW_MAX_BYTES = 20 * 1024 * 1024;

type Props = { placeId: string; placeName: string; photos: AdminPlacePhoto[] };

// Upload (re-encoded in the browser, which also drops EXIF) and remove photos of a place.
export function PlacePhotoManager({ placeId, placeName, photos }: Props) {
  const inputId = useId();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    let position = photos.reduce((max, photo) => Math.max(max, photo.position), -1) + 1;
    let count = photos.length;
    try {
      for (const file of Array.from(files)) {
        if (count >= MAX_PLACE_PHOTOS || position >= MAX_PLACE_PHOTOS) {
          setError(s.errors.limit);
          break;
        }
        if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
          setError(s.errors.type);
          continue;
        }
        if (file.size > RAW_MAX_BYTES) {
          setError(s.errors.size);
          continue;
        }
        const blob = await reencodeImage(file);
        if (blob.size > PHOTO_MAX_BYTES) {
          setError(s.errors.size);
          continue;
        }
        const storagePath = `${placeId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadError) {
          setError(s.errors.upload);
          continue;
        }
        const result = await addPlacePhoto({ placeId, storagePath, position });
        if (!result.ok) {
          setError(result.error);
          continue;
        }
        position += 1;
        count += 1;
      }
    } catch {
      setError(s.errors.upload);
    } finally {
      setUploading(false);
      router.refresh();
    }
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deletePlacePhoto({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.removed);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="space-y-3">
      <h2 id={`${inputId}-title`} className="text-lg font-semibold">
        {s.title}
      </h2>
      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- public bucket image, same as other uploads */}
              <img
                src={publicFileUrl(BUCKET, photo.storagePath)}
                alt={s.alt(placeName, index + 1)}
                loading="lazy"
                className="aspect-4/3 w-full rounded-lg border object-cover"
              />
              <Button type="button" variant="outline" className="h-11 w-full" disabled={pending} onClick={() => remove(photo.id)}>
                {s.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {s.add}
        </label>
        <input
          id={inputId}
          type="file"
          accept={PHOTO_MIME_TYPES.join(",")}
          multiple
          disabled={uploading || photos.length >= MAX_PLACE_PHOTOS}
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
          className="block w-full text-sm file:mr-3 file:h-11 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3"
        />
        <p className="text-sm text-muted-foreground">{uploading ? s.uploading : s.hint}</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
