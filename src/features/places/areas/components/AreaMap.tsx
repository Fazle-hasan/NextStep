"use client";

import { useRouter } from "next/navigation";

import { MapView, type MapMarker, type MapPoint } from "@/lib/maps";

type Props = {
  center: MapPoint;
  markers: MapMarker[];
  ariaLabel: string;
};

// Places around a neighbourhood. Tapping a marker opens the place page.
export function AreaMap({ center, markers, ariaLabel }: Props) {
  const router = useRouter();

  return (
    <MapView
      center={center}
      zoom={13}
      markers={markers}
      onMarkerClick={(id) => router.push(`/places/${id}`)}
      ariaLabel={ariaLabel}
      className="h-64 sm:h-80"
    />
  );
}
