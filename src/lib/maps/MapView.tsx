"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { getMapToken, MAP_STYLE, mapStrings } from "./config";
import { DEFAULT_CENTER, MARKER_COLORS, type MapBounds, type MapMarker, type MapPoint } from "./types";

type Props = {
  markers: MapMarker[];
  center?: MapPoint;
  zoom?: number;
  // Highlighted marker (e.g. the list item being hovered or opened).
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  // Fired after the user pans or zooms.
  onBoundsChange?: (bounds: MapBounds) => void;
  // Move the camera to include every marker whenever the markers change.
  fitToMarkers?: boolean;
  ariaLabel: string;
  className?: string;
};

function markerElement(marker: MapMarker, selected: boolean, onClick: (id: string) => void): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.title = marker.label;
  el.setAttribute("aria-label", marker.label);
  const size = selected ? 22 : 16;
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    `background:${MARKER_COLORS[marker.kind]}`,
    "border:2px solid #fff",
    `border-radius:${marker.kind === "flat" ? "4px" : "9999px"}`,
    "box-shadow:0 1px 3px rgba(0,0,0,.45)",
    "cursor:pointer",
    "padding:0",
  ].join(";");
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick(marker.id);
  });
  return el;
}

// A map with markers. Renders a notice instead when no map token is configured.
export function MapView({
  markers,
  center,
  zoom = 12,
  selectedId = null,
  onMarkerClick,
  onBoundsChange,
  fitToMarkers = false,
  ariaLabel,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRefs = useRef<MapboxMarker[]>([]);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const clickRef = useRef(onMarkerClick);
  const boundsRef = useRef(onBoundsChange);
  const initialRef = useRef({ center, zoom });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const token = getMapToken();
  const centerLat = center?.lat;
  const centerLng = center?.lng;

  useEffect(() => {
    clickRef.current = onMarkerClick;
    boundsRef.current = onBoundsChange;
  }, [onMarkerClick, onBoundsChange]);

  // Create the map once.
  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cancelled = false;
    const initial = initialRef.current;
    const start = initial.center ?? DEFAULT_CENTER;

    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [start.lng, start.lat],
          zoom: initial.center ? initial.zoom : 4,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (!cancelled) setReady(true);
        });
        map.on("error", () => {
          if (!cancelled && !map.loaded()) setFailed(true);
        });
        map.on("moveend", () => {
          const b = map.getBounds();
          if (b) {
            boundsRef.current?.({ minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() });
          }
        });
        mapboxRef.current = mapboxgl;
        mapRef.current = map;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Draw markers.
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!ready || !map || !mapboxgl) return;

    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = markers.map((marker) =>
      new mapboxgl.Marker({ element: markerElement(marker, marker.id === selectedId, (id) => clickRef.current?.(id)) })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map),
    );
  }, [ready, markers, selectedId]);

  // Fit the camera to the markers when asked.
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!ready || !map || !mapboxgl || !fitToMarkers || markers.length === 0) return;
    const first = markers[0];
    if (markers.length === 1 && first) {
      map.easeTo({ center: [first.lng, first.lat], zoom: Math.max(map.getZoom(), 13) });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach((m) => bounds.extend([m.lng, m.lat]));
    map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 400 });
  }, [ready, markers, fitToMarkers]);

  // Follow centre changes from the parent (e.g. a new city).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || fitToMarkers || centerLat === undefined || centerLng === undefined) return;
    map.easeTo({ center: [centerLng, centerLat], zoom });
  }, [ready, centerLat, centerLng, zoom, fitToMarkers]);

  if (!token || failed) {
    return (
      <div
        role="note"
        className={cn(
          "flex min-h-40 items-center justify-center rounded-xl border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {mapStrings.unavailable}
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-64 overflow-hidden rounded-xl border", className)}>
      <div ref={containerRef} role="application" aria-label={ariaLabel} className="absolute inset-0" />
      {!ready && (
        <p className="absolute inset-0 flex items-center justify-center bg-muted/60 text-sm text-muted-foreground">
          {mapStrings.loading}
        </p>
      )}
    </div>
  );
}
