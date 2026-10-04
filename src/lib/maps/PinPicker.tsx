"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { getMapToken, MAP_STYLE, mapStrings } from "./config";
import { DEFAULT_CENTER, MARKER_COLORS, type MapPoint } from "./types";

type Props = {
  value: MapPoint | null;
  onChange: (point: MapPoint) => void;
  // Where the map opens when there is no value yet (e.g. the city or neighbourhood centre).
  initialCenter?: MapPoint;
  ariaLabel: string;
  className?: string;
};

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

// A small map where the user taps or drags a pin to choose a location.
// Renders a notice when no map token is configured, so callers should keep a fallback (e.g. device location).
export function PinPicker({ value, onChange, initialCenter, ariaLabel, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const changeRef = useRef(onChange);
  const initialRef = useRef({ value, initialCenter });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const token = getMapToken();
  const valueLat = value?.lat;
  const valueLng = value?.lng;
  const centerLat = initialCenter?.lat;
  const centerLng = initialCenter?.lng;

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  // Create the map once.
  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cancelled = false;
    const initial = initialRef.current;
    const start = initial.value ?? initial.initialCenter ?? DEFAULT_CENTER;

    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [start.lng, start.lat],
          zoom: initial.value ? 15 : initial.initialCenter ? 12 : 4,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (!cancelled) setReady(true);
        });
        map.on("error", () => {
          if (!cancelled && !map.loaded()) setFailed(true);
        });
        map.on("click", (event) => {
          changeRef.current({ lat: round6(event.lngLat.lat), lng: round6(event.lngLat.lng) });
        });
        mapboxRef.current = mapboxgl;
        mapRef.current = map;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Keep the pin on the current value.
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!ready || !map || !mapboxgl) return;
    if (valueLat === undefined || valueLng === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const marker = new mapboxgl.Marker({ draggable: true, color: MARKER_COLORS.workplace });
      marker.on("dragend", () => {
        const p = marker.getLngLat();
        changeRef.current({ lat: round6(p.lat), lng: round6(p.lng) });
      });
      markerRef.current = marker.setLngLat([valueLng, valueLat]).addTo(map);
    } else {
      markerRef.current.setLngLat([valueLng, valueLat]);
    }
    map.easeTo({ center: [valueLng, valueLat], zoom: Math.max(map.getZoom(), 14) });
  }, [ready, valueLat, valueLng]);

  // Follow a new starting centre (e.g. the user picked another city) while no pin is set.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || valueLat !== undefined || centerLat === undefined || centerLng === undefined) return;
    map.easeTo({ center: [centerLng, centerLat], zoom: 12 });
  }, [ready, valueLat, centerLat, centerLng]);

  if (!token || failed) {
    return (
      <p role="note" className={cn("rounded-xl border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground", className)}>
        {mapStrings.pickerUnavailable}
      </p>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative h-64 overflow-hidden rounded-xl border">
        <div ref={containerRef} role="application" aria-label={ariaLabel} className="absolute inset-0" />
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center bg-muted/60 text-sm text-muted-foreground">
            {mapStrings.loading}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{mapStrings.pickerHint}</p>
    </div>
  );
}
