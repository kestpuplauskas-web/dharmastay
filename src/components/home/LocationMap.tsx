import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { mapCenter, stayLocations } from "@/data/locations";

const PIN_SVG = `
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" fill="var(--color-warm-white)" />
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="var(--color-sage)" stroke-width="1.4"
      stroke-linecap="round" stroke-dasharray="40 9" transform="rotate(-35 12 12)" />
    <circle cx="12" cy="12" r="3" fill="var(--color-sage)" />
  </svg>`;

/** Kai priartinta pakankamai, etiketės rodomos prie visų žymeklių. */
const LABEL_ZOOM = 16;

/** Client-only monochrome Carto map with a sage ensō marker for every apartment. */
export default function LocationMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let map: MapLibreMap | null = null;

    const init = async () => {
      if (map) return;

      let style: unknown;
      try {
        const response = await fetch("https://tiles.openfreemap.org/styles/positron");
        if (!response.ok) throw new Error(`style ${response.status}`);
        style = await response.json();
      } catch (error) {
        console.error("maplibre style fetch failed", error);
        return;
      }

      const instance = new MapLibreMap({
        container: node,
        center: mapCenter,
        zoom: 14,
        attributionControl: { compact: true },
        style: style as StyleSpecification,
      });
      map = instance;

      instance.on("error", (e) => console.error("maplibre error", e?.error?.message));
      instance.on("idle", () => console.log("maplibre idle"));
      (node as unknown as Record<string, unknown>)._map = instance;
      instance.scrollZoom.disable();
      instance.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

      const bounds = new LngLatBounds();
      for (const location of stayLocations) {
        const el = document.createElement("a");
        el.className = "stay-map-marker";
        el.href = `https://maps.google.com/?q=${encodeURIComponent(location.address)}`;
        el.target = "_blank";
        el.rel = "noreferrer";
        el.title = location.address;
        el.setAttribute("aria-label", location.address);
        el.innerHTML = `<span class="stay-map-marker__pin">${PIN_SVG}</span><span class="stay-map-marker__label">${location.label}</span>`;
        new Marker({ element: el, anchor: "center" })
          .setLngLat(location.coords)
          .addTo(instance);
        bounds.extend(location.coords);
      }

      const showLabels = () =>
        node.classList.toggle("stay-map--labels", instance.getZoom() >= LABEL_ZOOM);
      instance.on("zoom", showLabels);

      instance.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 70, right: 70 },
        maxZoom: 16,
        duration: 0,
      });
      showLabels();
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
