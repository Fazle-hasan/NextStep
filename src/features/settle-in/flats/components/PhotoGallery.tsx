import { Home } from "lucide-react";

import { listingPhotoUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

import { flatsStrings } from "../strings";
import type { ListingPhoto } from "../types";

const s = flatsStrings.detail;

type Props = { title: string; photos: ListingPhoto[] };

// A swipeable strip on phones (scroll-snap, no JavaScript) and a grid on wider screens.
export function PhotoGallery({ title, photos }: Props) {
  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground">
        <Home className="size-10" aria-hidden="true" />
        <p className="text-sm">{s.noPhotos}</p>
      </div>
    );
  }

  return (
    <ul
      aria-label={s.photos}
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl sm:grid sm:grid-cols-3 sm:overflow-visible"
    >
      {photos.map((photo, index) => (
        <li
          key={photo.id}
          className={cn(
            "aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-muted sm:w-auto",
            index === 0 && "sm:col-span-2 sm:row-span-2",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- listing photo served from Supabase Storage */}
          <img
            src={listingPhotoUrl(photo.storage_path) ?? ""}
            alt={s.photoAlt(title, index + 1)}
            loading={index === 0 ? "eager" : "lazy"}
            className="size-full object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
