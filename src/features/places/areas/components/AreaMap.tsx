"use client";

import { useRouter } from "next/navigation";

import { MapLegend } from "@/features/places/map/components/MapLegend";
import { MapView, type MapMarker, type MapPoint } from "@/lib/maps";

type Props = {
  center: MapPoint;
  markers: MapMarker[];
  ariaLabel: string;
};

// Places around a neighbourhood. Tapping a marker opens the place page. The key lists the marker kinds shown.
export function AreaMap({ center, markers, ariaLabel }: Props) {
  const router = useRouter();
  const kinds = Array.from(new Set(markers.map((m) => m.kind)));

  return (
    <div className="space-y-2">
      <MapView
        center={center}
        zoom={13}
        markers={markers}
        onMarkerClick={(id) => router.push(`/places/${id}`)}
        ariaLabel={ariaLabel}
        className="h-64 sm:h-80"
      />
      {kinds.length > 1 && <MapLegend kinds={kinds} />}
    </div>
  );
}
