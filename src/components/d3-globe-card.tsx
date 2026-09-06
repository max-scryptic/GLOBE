"use client";

import { useEffect, useRef, useState } from "react";
import { useElementSize } from "@/components/use-element-size";

const D3_SCRIPT_URL = "https://d3js.org/d3.v7.min.js";
const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

const COUNTRY_FILL = "#a8df8e";
const COUNTRY_STROKE = "rgba(35, 104, 74, 0.36)";
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
) {
  context.beginPath();
  path(feature);
  context.fillStyle = COUNTRY_FILL;
  context.fill();
  context.strokeStyle = COUNTRY_STROKE;
  context.lineWidth = 1.2;
  context.stroke();
}

export function D3GlobeCard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const activeCanvas = canvasRef.current;

    if (!activeCanvas || size.width === 0 || size.height === 0) {
      return;
    }

    let cancelled = false;
    let frameId = 0;

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
        const scale = Math.min(width, height) * 0.41;
        const center: [number, number] = [width / 2, height / 2 + 6];

        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const projection = d3
          .geoOrthographic()
          .clipAngle(90)
          .scale(scale)
          .translate(center);
        const path = d3.geoPath(projection).context(context);
        const graticule = d3.geoGraticule10();
        let rotation = -25;

        const render = () => {
          context.clearRect(0, 0, width, height);
          projection.rotate([rotation, -10, 0]);

          context.beginPath();
          path({ type: "Sphere" });
          context.fillStyle = "#79d8ee";
          context.fill();

          context.beginPath();
          path(graticule);
          context.strokeStyle = GRATICULE_STROKE;
          context.lineWidth = 0.9;
          context.stroke();

          world.features.forEach((feature) => {
            fillCountry(context, path, feature);
          });

          rotation += 0.16;
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
    };
  }, [size.height, size.width]);

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-950">D3.js</h2>
        <p className="mt-1 text-sm text-zinc-600">
          A flat-color orthographic globe drawn with D3 geographic projections.
        </p>
      </div>
      <div
        ref={containerRef}
        className="relative flex h-[420px] min-h-[320px] items-center justify-center bg-[#edf7f8]"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ contain: "layout paint size" }}
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
