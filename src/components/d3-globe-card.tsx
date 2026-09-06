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
const FLIGHT_PATH_STROKE_RGB = "236, 72, 153";
const FLIGHT_PATH_GLOW_RGB = "255, 255, 255";
const FLIGHT_MARKER_FILL = "#f97316";
const FLIGHT_ROUTE_SAMPLE_COUNT = 96;
const FLIGHT_ROUTE_FLATTENING = 0.38;
const FLIGHT_ROUTE_EDGE_FADE = 0.16;
const FLIGHT_ROUTE_OCCLUSION_FADE = 0.075;

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
  (coordinates: [number, number]): [number, number] | null;
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
  geoInterpolate(
    from: [number, number],
    to: [number, number],
  ): (value: number) => [number, number];
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

type FlightRoute = {
  from: string;
  fromCoordinates: [number, number];
  to: string;
  toCoordinates: [number, number];
};

const flightRoutes: FlightRoute[] = [
  {
    from: "United States",
    fromCoordinates: [-74.006, 40.7128],
    to: "United Kingdom",
    toCoordinates: [-0.1276, 51.5072],
  },
  {
    from: "United Kingdom",
    fromCoordinates: [-0.1276, 51.5072],
    to: "United Arab Emirates",
    toCoordinates: [55.2708, 25.2048],
  },
  {
    from: "United Arab Emirates",
    fromCoordinates: [55.2708, 25.2048],
    to: "India",
    toCoordinates: [77.209, 28.6139],
  },
  {
    from: "India",
    fromCoordinates: [77.209, 28.6139],
    to: "Singapore",
    toCoordinates: [103.8198, 1.3521],
  },
  {
    from: "Singapore",
    fromCoordinates: [103.8198, 1.3521],
    to: "Japan",
    toCoordinates: [139.6503, 35.6762],
  },
  {
    from: "Japan",
    fromCoordinates: [139.6503, 35.6762],
    to: "Australia",
    toCoordinates: [151.2093, -33.8688],
  },
  {
    from: "Australia",
    fromCoordinates: [151.2093, -33.8688],
    to: "New Zealand",
    toCoordinates: [174.7633, -36.8485],
  },
  {
    from: "United States",
    fromCoordinates: [-122.4194, 37.7749],
    to: "Japan",
    toCoordinates: [139.6503, 35.6762],
  },
  {
    from: "Canada",
    fromCoordinates: [-79.3832, 43.6532],
    to: "France",
    toCoordinates: [2.3522, 48.8566],
  },
  {
    from: "France",
    fromCoordinates: [2.3522, 48.8566],
    to: "South Africa",
    toCoordinates: [28.0473, -26.2041],
  },
  {
    from: "Brazil",
    fromCoordinates: [-46.6333, -23.5505],
    to: "Portugal",
    toCoordinates: [-9.1393, 38.7223],
  },
  {
    from: "Mexico",
    fromCoordinates: [-99.1332, 19.4326],
    to: "Colombia",
    toCoordinates: [-74.0721, 4.711],
  },
  {
    from: "Argentina",
    fromCoordinates: [-58.3816, -34.6037],
    to: "Spain",
    toCoordinates: [-3.7038, 40.4168],
  },
  {
    from: "Germany",
    fromCoordinates: [13.405, 52.52],
    to: "Turkey",
    toCoordinates: [28.9784, 41.0082],
  },
  {
    from: "Egypt",
    fromCoordinates: [31.2357, 30.0444],
    to: "Kenya",
    toCoordinates: [36.8219, -1.2921],
  },
];

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

function getCoordinateVisibility(
  coordinates: [number, number],
  rotation: [number, number, number],
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const [longitude, latitude] = coordinates;
  const centerLongitude = -rotation[0];
  const centerLatitude = -rotation[1];
  const deltaLongitude = toRadians(longitude - centerLongitude);
  const latitudeRadians = toRadians(latitude);
  const centerLatitudeRadians = toRadians(centerLatitude);
  const cosineDistance =
    Math.sin(centerLatitudeRadians) * Math.sin(latitudeRadians) +
    Math.cos(centerLatitudeRadians) *
      Math.cos(latitudeRadians) *
      Math.cos(deltaLongitude);

  return Math.min(Math.max(cosineDistance / FLIGHT_ROUTE_EDGE_FADE, 0), 1);
}

function getAngularDistance(
  from: [number, number],
  to: [number, number],
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const [fromLongitude, fromLatitude] = from.map(toRadians);
  const [toLongitude, toLatitude] = to.map(toRadians);
  const deltaLongitude = toLongitude - fromLongitude;
  const deltaLatitude = toLatitude - fromLatitude;
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function projectFlightRoutePoint(
  coordinates: [number, number],
  rotation: [number, number, number],
  center: [number, number],
  radius: number,
  lift: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const [longitude, latitude] = coordinates;
  const centerLongitude = -rotation[0];
  const centerLatitude = -rotation[1];
  const deltaLongitude = toRadians(longitude - centerLongitude);
  const latitudeRadians = toRadians(latitude);
  const centerLatitudeRadians = toRadians(centerLatitude);
  const cosLatitude = Math.cos(latitudeRadians);
  const sinLatitude = Math.sin(latitudeRadians);
  const cosCenterLatitude = Math.cos(centerLatitudeRadians);
  const sinCenterLatitude = Math.sin(centerLatitudeRadians);
  const cosDeltaLongitude = Math.cos(deltaLongitude);
  const altitudeScale = 1 + lift / radius;
  const xUnit = cosLatitude * Math.sin(deltaLongitude);
  const yUnit =
    -(
      cosCenterLatitude * sinLatitude -
      sinCenterLatitude * cosLatitude * cosDeltaLongitude
    );
  const zUnit =
    sinCenterLatitude * sinLatitude +
    cosCenterLatitude * cosLatitude * cosDeltaLongitude;
  const screenDistance = Math.hypot(xUnit, yUnit) * radius * altitudeScale;

  return {
    point: [
      center[0] + xUnit * radius * altitudeScale,
      center[1] + yUnit * radius * altitudeScale,
    ] satisfies [number, number],
    screenDistance,
    zUnit,
  };
}

function getFlightRouteAlpha(screenDistance: number, radius: number, zUnit: number) {
  if (zUnit >= 0) {
    return 1;
  }

  return Math.min(
    Math.max((screenDistance - radius) / (radius * FLIGHT_ROUTE_OCCLUSION_FADE), 0),
    1,
  );
}

function drawFlightMarker(
  context: CanvasRenderingContext2D,
  projection: Projection,
  coordinates: [number, number],
  center: [number, number],
  radius: number,
  rotation: [number, number, number],
) {
  const point = projection(coordinates);
  const visibility = getCoordinateVisibility(coordinates, rotation);

  if (
    !point ||
    visibility <= 0 ||
    Math.hypot(point[0] - center[0], point[1] - center[1]) > radius
  ) {
    return;
  }

  context.save();
  context.globalAlpha = visibility;
  context.beginPath();
  context.arc(point[0], point[1], 3.5, 0, Math.PI * 2);
  context.fillStyle = FLIGHT_MARKER_FILL;
  context.fill();
  context.lineWidth = 1.4;
  context.strokeStyle = "rgba(255, 255, 255, 0.88)";
  context.stroke();
  context.restore();
}

type FlightRoutePoint = {
  alpha: number;
  point: [number, number];
};

function flattenFlightRouteSegment(segment: FlightRoutePoint[]) {
  if (segment.length < 2) {
    return segment;
  }

  const firstPoint = segment[0].point;
  const lastPoint = segment[segment.length - 1].point;
  const divisor = segment.length - 1;

  return segment.map((sample, index) => {
    const progress = index / divisor;
    const chordPoint: [number, number] = [
      firstPoint[0] + (lastPoint[0] - firstPoint[0]) * progress,
      firstPoint[1] + (lastPoint[1] - firstPoint[1]) * progress,
    ];

    return {
      alpha: sample.alpha,
      point: [
        sample.point[0] +
          (chordPoint[0] - sample.point[0]) * FLIGHT_ROUTE_FLATTENING,
        sample.point[1] +
          (chordPoint[1] - sample.point[1]) * FLIGHT_ROUTE_FLATTENING,
      ] satisfies [number, number],
    };
  });
}

function getRouteGradient(
  context: CanvasRenderingContext2D,
  segment: FlightRoutePoint[],
  color: (alpha: number) => string,
) {
  const firstPoint = segment[0].point;
  const lastPoint = segment[segment.length - 1].point;
  const gradient = context.createLinearGradient(
    firstPoint[0],
    firstPoint[1],
    lastPoint[0],
    lastPoint[1],
  );
  const divisor = segment.length - 1;

  segment.forEach(({ alpha }, index) => {
    gradient.addColorStop(index / divisor, color(alpha));
  });

  return gradient;
}

function drawFlightRoute(
  context: CanvasRenderingContext2D,
  route: FlightRoute,
  interpolate: (value: number) => [number, number],
  center: [number, number],
  radius: number,
  dashOffset: number,
  rotation: [number, number, number],
) {
  const visibleSegments: FlightRoutePoint[][] = [];
  let currentSegment: FlightRoutePoint[] = [];
  let previousPoint: [number, number] | null = null;
  const distance = getAngularDistance(route.fromCoordinates, route.toCoordinates);
  const arcHeight = radius * Math.min(0.23, 0.11 + distance * 0.045);

  for (let index = 0; index <= FLIGHT_ROUTE_SAMPLE_COUNT; index += 1) {
    const progress = index / FLIGHT_ROUTE_SAMPLE_COUNT;
    const coordinates = interpolate(progress);
    const lift = Math.sin(progress * Math.PI) * arcHeight;
    const projectedPoint = projectFlightRoutePoint(
      coordinates,
      rotation,
      center,
      radius,
      lift,
    );
    const visibility = getFlightRouteAlpha(
      projectedPoint.screenDistance,
      radius,
      projectedPoint.zUnit,
    );
    const point = projectedPoint.point;
    const distanceFromPrevious =
      previousPoint
        ? Math.hypot(point[0] - previousPoint[0], point[1] - previousPoint[1])
        : 0;
    const isVisible =
      visibility > 0 &&
      distanceFromPrevious < radius * 0.4;

    if (isVisible) {
      currentSegment.push({
        alpha: visibility,
        point,
      });
      previousPoint = point;
      continue;
    }

    if (currentSegment.length > 1) {
      visibleSegments.push(flattenFlightRouteSegment(currentSegment));
    }

    currentSegment = [];
    previousPoint = point;
  }

  if (currentSegment.length > 1) {
    visibleSegments.push(flattenFlightRouteSegment(currentSegment));
  }

  visibleSegments.forEach((segment) => {
    context.save();
    context.beginPath();
    segment.forEach(({ point: [x, y] }, index) => {
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = getRouteGradient(
      context,
      segment,
      (alpha) => `rgba(${FLIGHT_PATH_GLOW_RGB}, ${0.62 * alpha})`,
    );
    context.lineWidth = 9;
    context.stroke();
    context.setLineDash([8, 10]);
    context.lineDashOffset = dashOffset;
    context.strokeStyle = getRouteGradient(
      context,
      segment,
      (alpha) => `rgba(${FLIGHT_PATH_STROKE_RGB}, ${0.96 * alpha})`,
    );
    context.lineWidth = 2.8;
    context.stroke();
    context.restore();
  });
}

type D3GlobeCardProps = {
  className?: string;
  description?: string;
  globeClassName?: string;
  selectable?: boolean;
  showFlightPaths?: boolean;
  title?: string;
};

export function D3GlobeCard({
  className = "",
  description = "A flat-color orthographic globe drawn with D3 geographic projections.",
  globeClassName = "",
  selectable = false,
  showFlightPaths = false,
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
        const routeInterpolators = flightRoutes.map((route) => ({
          route,
          interpolate: d3.geoInterpolate(
            route.fromCoordinates,
            route.toCoordinates,
          ),
        }));
        let rotation: [number, number, number] = [-25, -10, 0];
        let zoomScale = 1;
        let isDragging = false;
        let lastPointerPosition: { x: number; y: number } | null = null;
        let pointerDownPosition: { x: number; y: number } | null = null;
        const startedAt = performance.now();

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
          const visibleRadius = baseScale * zoomScale;

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

          if (showFlightPaths) {
            const dashOffset = -((performance.now() - startedAt) / 65);

            routeInterpolators.forEach(({ route, interpolate }) => {
              drawFlightRoute(
                context,
                route,
                interpolate,
                center,
                visibleRadius,
                dashOffset,
                rotation,
              );
              drawFlightMarker(
                context,
                projection,
                route.fromCoordinates,
                center,
                visibleRadius,
                rotation,
              );
              drawFlightMarker(
                context,
                projection,
                route.toCoordinates,
                center,
                visibleRadius,
                rotation,
              );
            });
          }

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
  }, [selectable, showFlightPaths, size.height, size.width]);

  return (
    <section
      className={`overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        </div>
        {selectable || showFlightPaths ? (
          <div className="flex shrink-0 gap-2">
            {showFlightPaths ? (
              <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-right">
                <div className="text-lg font-semibold leading-none text-sky-950">
                  {flightRoutes.length}
                </div>
                <div className="mt-1 text-xs font-medium text-sky-700">
                  routes
                </div>
              </div>
            ) : null}
            {selectable ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
                <div className="text-lg font-semibold leading-none text-emerald-900">
                  {selectedCount}
                </div>
                <div className="mt-1 text-xs font-medium text-emerald-700">
                  selected
                </div>
              </div>
            ) : null}
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
