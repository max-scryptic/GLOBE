"use client";

import { useEffect, useRef, useState } from "react";
import { useElementSize } from "@/components/use-element-size";

const D3_SCRIPT_URL = "https://d3js.org/d3.v7.min.js";
const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

const COUNTRY_FILL = "#a8df8e";
const SELECTED_COUNTRY_FILL = "#2f7d4d";
const COUNTRY_STROKE = "#facc15";
const GRATICULE_STROKE = "rgba(64, 132, 118, 0.22)";

type GeoFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: unknown;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type Projection = {
  clipAngle(value: number): Projection;
  invert(point: [number, number]): [number, number] | null;
  rotate(value: [number, number, number]): Projection;
  scale(value: number): Projection;
  translate(value: [number, number]): Projection;
};

type GeoPath = {
  context(context: CanvasRenderingContext2D | null): GeoPath;
  (feature: unknown): void;
};

type D3Like = {
  geoContains(feature: unknown, coordinates: [number, number]): boolean;
  geoGraticule10(): unknown;
  geoOrthographic(): Projection;
  geoPath(projection: Projection): GeoPath;
  json<T>(url: string): Promise<T>;
};

declare global {
  interface Window {
    d3?: D3Like;
  }
}

let d3Promise: Promise<D3Like> | null = null;

function loadD3() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("D3 is only available in the browser."));
  }

  if (window.d3) {
    return Promise.resolve(window.d3);
  }

  if (!d3Promise) {
    d3Promise = new Promise<D3Like>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${D3_SCRIPT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.d3) {
            resolve(window.d3);
          } else {
            reject(new Error("D3 did not attach to the window."));
          }
        });
        existingScript.addEventListener("error", () => {
          reject(new Error("Unable to load D3."));
        });
        return;
      }

      const script = document.createElement("script");
      script.src = D3_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        if (window.d3) {
          resolve(window.d3);
        } else {
          reject(new Error("D3 did not attach to the window."));
        }
      };
      script.onerror = () => {
        reject(new Error("Unable to load D3."));
      };
      document.head.appendChild(script);
    });
  }

  return d3Promise;
}

function fillCountry(
  context: CanvasRenderingContext2D,
  path: GeoPath,
  feature: GeoFeature,
  isSelected = false,
) {
  context.beginPath();
  path(feature);
  context.fillStyle = isSelected ? SELECTED_COUNTRY_FILL : COUNTRY_FILL;
  context.fill();
  context.strokeStyle = COUNTRY_STROKE;
  context.lineWidth = 1.2;
  context.stroke();
}

function getCountryKey(feature: GeoFeature, index: number) {
  const name = feature.properties?.name;

  return typeof name === "string" && name.length > 0
    ? name
    : `country-${index}`;
}

type D3GlobeCardProps = {
  className?: string;
  description?: string;
  globeClassName?: string;
  selectable?: boolean;
  title?: string;
};

export function D3GlobeCard({
  className = "",
  description = "A flat-color orthographic globe drawn with D3 geographic projections.",
  globeClassName = "",
  selectable = false,
  title = "D3.js",
}: D3GlobeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const selectedCountriesRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const activeCanvas = canvasRef.current;

    if (!activeCanvas || size.width === 0 || size.height === 0) {
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let disposeInteraction = () => {};

    async function drawGlobe(canvas: HTMLCanvasElement) {
      try {
        setStatus("loading");
        const d3 = await loadD3();
        const world = await d3.json<FeatureCollection>(WORLD_GEOJSON_URL);

        if (cancelled || !world?.features?.length) {
          return;
        }

        setStatus("ready");

        const context = canvas.getContext("2d");

        if (!context) {
          setStatus("error");
          return;
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = size.width;
        const height = size.height;
        const baseScale = Math.min(width, height) * 0.41;
        const center: [number, number] = [width / 2, height / 2 + 6];

        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const projection = d3
          .geoOrthographic()
          .clipAngle(90)
          .scale(baseScale)
          .translate(center);
        const path = d3.geoPath(projection).context(context);
        const graticule = d3.geoGraticule10();
        let rotation: [number, number, number] = [-25, -10, 0];
        let zoomScale = 1;
        let isDragging = false;
        let lastPointerPosition: { x: number; y: number } | null = null;
        let pointerDownPosition: { x: number; y: number } | null = null;

        const clamp = (value: number, min: number, max: number) =>
          Math.min(Math.max(value, min), max);

        const updateCursor = () => {
          canvas.style.cursor = isDragging ? "grabbing" : "grab";
        };

        const handlePointerDown = (event: PointerEvent) => {
          isDragging = true;
          lastPointerPosition = { x: event.clientX, y: event.clientY };
          pointerDownPosition = { x: event.clientX, y: event.clientY };
          canvas.setPointerCapture(event.pointerId);
          updateCursor();
        };

        const handlePointerMove = (event: PointerEvent) => {
          if (!isDragging || !lastPointerPosition) {
            return;
          }

          const deltaX = event.clientX - lastPointerPosition.x;
          const deltaY = event.clientY - lastPointerPosition.y;
          rotation = [
            rotation[0] + deltaX * 0.35,
            clamp(rotation[1] - deltaY * 0.28, -75, 75),
            0,
          ];
          lastPointerPosition = { x: event.clientX, y: event.clientY };
        };

        const stopDragging = (event: PointerEvent) => {
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }

          isDragging = false;
          lastPointerPosition = null;
          updateCursor();
        };

        const handleWheel = (event: WheelEvent) => {
          event.preventDefault();
          const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;
          zoomScale = clamp(zoomScale + zoomDelta, 0.7, 1.75);
        };

        const handleClick = (event: MouseEvent) => {
          if (!selectable || !pointerDownPosition) {
            return;
          }

          const dragDistance = Math.hypot(
            event.clientX - pointerDownPosition.x,
            event.clientY - pointerDownPosition.y,
          );

          if (dragDistance > 6) {
            return;
          }

          const rect = canvas.getBoundingClientRect();
          const coordinates = projection.invert([
            event.clientX - rect.left,
            event.clientY - rect.top,
          ]);

          if (!coordinates) {
            return;
          }

          const countryIndex = world.features.findIndex((feature) =>
            d3.geoContains(feature, coordinates),
          );

          if (countryIndex < 0) {
            return;
          }

          const countryKey = getCountryKey(
            world.features[countryIndex],
            countryIndex,
          );

          if (selectedCountriesRef.current.has(countryKey)) {
            selectedCountriesRef.current.delete(countryKey);
          } else {
            selectedCountriesRef.current.add(countryKey);
          }

          setSelectedCount(selectedCountriesRef.current.size);
        };

        updateCursor();
        canvas.addEventListener("pointerdown", handlePointerDown);
        canvas.addEventListener("pointermove", handlePointerMove);
        canvas.addEventListener("pointerup", stopDragging);
        canvas.addEventListener("pointercancel", stopDragging);
        canvas.addEventListener("click", handleClick);
        canvas.addEventListener("wheel", handleWheel, { passive: false });
        disposeInteraction = () => {
          canvas.removeEventListener("pointerdown", handlePointerDown);
          canvas.removeEventListener("pointermove", handlePointerMove);
          canvas.removeEventListener("pointerup", stopDragging);
          canvas.removeEventListener("pointercancel", stopDragging);
          canvas.removeEventListener("click", handleClick);
          canvas.removeEventListener("wheel", handleWheel);
          canvas.style.cursor = "";
        };

        const render = () => {
          context.clearRect(0, 0, width, height);
          projection.rotate(rotation).scale(baseScale * zoomScale);

          context.beginPath();
          path({ type: "Sphere" });
          context.fillStyle = "#79d8ee";
          context.fill();

          context.beginPath();
          path(graticule);
          context.strokeStyle = GRATICULE_STROKE;
          context.lineWidth = 0.9;
          context.stroke();

          world.features.forEach((feature, index) => {
            fillCountry(
              context,
              path,
              feature,
              selectedCountriesRef.current.has(getCountryKey(feature, index)),
            );
          });

          if (!isDragging) {
            rotation = [rotation[0] + 0.16, rotation[1], 0];
          }

          frameId = requestAnimationFrame(render);
        };

        render();
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    drawGlobe(activeCanvas);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      disposeInteraction();
    };
  }, [selectable, size.height, size.width]);

  return (
    <section
      className={`overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        </div>
        {selectable ? (
          <div className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
            <div className="text-lg font-semibold leading-none text-emerald-900">
              {selectedCount}
            </div>
            <div className="mt-1 text-xs font-medium text-emerald-700">
              selected
            </div>
          </div>
        ) : null}
      </div>
      <div
        ref={containerRef}
        className={`relative flex h-[420px] min-h-[320px] items-center justify-center bg-[#edf7f8] ${globeClassName}`}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ contain: "layout paint size", touchAction: "none" }}
        />
        {status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-600">
            {status === "loading" ? "Loading D3 globe..." : "Globe unavailable"}
          </div>
        ) : null}
      </div>
    </section>
  );
}
