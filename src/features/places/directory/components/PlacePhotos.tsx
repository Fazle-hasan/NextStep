import { publicFileUrl } from "@/lib/supabase/storage";

import { placesStrings } from "../strings";

const s = placesStrings.detail;
const BUCKET = "place-photos";

type Props = { name: string; paths: string[] };

// A swipeable strip on phones (scroll-snap, no JavaScript) and a grid on wider screens.
export function PlacePhotos({ name, paths }: Props) {
  if (paths.length === 0) return null;

  return (
    <section aria-labelledby="place-photos" className="space-y-2">
      <h2 id="place-photos" className="text-lg font-semibold">
        {s.photos}
      </h2>
      <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl sm:grid sm:grid-cols-3 sm:overflow-visible">
        {paths.map((path, index) => (
          <li key={path} className="w-4/5 shrink-0 snap-center sm:w-auto">
            {/* eslint-disable-next-line @next/next/no-img-element -- public bucket URL, no image optimisation configured */}
            <img
              src={publicFileUrl(BUCKET, path)}
              alt={s.photoAlt(name, index + 1)}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
