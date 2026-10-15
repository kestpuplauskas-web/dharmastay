import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { mapCenter, stayLocations } from "@/data/locations";

const MARKER_SVG = `
  <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
    <circle cx="22" cy="22" r="16" fill="none" stroke="var(--color-sage)" stroke-width="1"
      stroke-linecap="round" stroke-dasharray="88 12" transform="rotate(-35 22 22)" />
    <circle cx="22" cy="22" r="5" fill="var(--color-sage)" />
  </svg>`;

/** Client-only monochrome Carto map with a sage ensō marker for every apartment. */
export default function LocationMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let map: MapLibreMap | null = null;

    const init = () => {
      if (map) return;

      const instance = new MapLibreMap({
        container: node,
        center: mapCenter,
        zoom: 14,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            carto: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
                "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
                "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              ],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
            },
          },
          layers: [{ id: "carto", type: "raster", source: "carto" }],
        },
      });
      map = instance;

      instance.scrollZoom.disable();
      instance.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

      const bounds = new LngLatBounds();
      for (const location of stayLocations) {
        const el = document.createElement("div");
        el.className = "stay-map-marker";
        el.setAttribute("aria-label", location.address);
        el.title = location.address;
        el.innerHTML = `${MARKER_SVG}<span class="stay-map-marker__label">${location.label}</span>`;
        new Marker({ element: el, anchor: "center" })
          .setLngLat(location.coords)
          .addTo(instance);
        bounds.extend(location.coords);
      }

      instance.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 70, right: 70 },
        maxZoom: 16,
        duration: 0,
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      init();
      return () => map?.remove();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          init();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      map?.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
