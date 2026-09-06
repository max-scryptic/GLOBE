"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";
import { useElementSize } from "@/components/use-element-size";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

type CityPoint = {
  name: string;
  lat: number;
  lng: number;
  color: string;
};

type RouteArc = {
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
};

const cityPoints: CityPoint[] = [
  { name: "San Francisco", lat: 37.7749, lng: -122.4194, color: "#1d4ed8" },
  { name: "New York", lat: 40.7128, lng: -74.006, color: "#0891b2" },
  { name: "London", lat: 51.5072, lng: -0.1276, color: "#16a34a" },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, color: "#dc2626" },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, color: "#f59e0b" },
];

const routeArcs: RouteArc[] = [
  {
    name: "San Francisco to Tokyo",
    startLat: 37.7749,
    startLng: -122.4194,
    endLat: 35.6762,
    endLng: 139.6503,
    color: ["rgba(29, 78, 216, 0.25)", "rgba(220, 38, 38, 0.85)"],
  },
  {
    name: "New York to London",
    startLat: 40.7128,
    startLng: -74.006,
    endLat: 51.5072,
    endLng: -0.1276,
    color: ["rgba(8, 145, 178, 0.2)", "rgba(22, 163, 74, 0.85)"],
  },
  {
    name: "London to Sydney",
    startLat: 51.5072,
    startLng: -0.1276,
    endLat: -33.8688,
    endLng: 151.2093,
    color: ["rgba(22, 163, 74, 0.2)", "rgba(245, 158, 11, 0.9)"],
  },
];

export function ReactGlobeCard() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();

  const globeProps = useMemo<GlobeProps>(
    () => ({
      pointsData: cityPoints,
      arcsData: routeArcs,
      pointLat: "lat",
      pointLng: "lng",
      pointColor: "color",
      pointLabel: "name",
      pointAltitude: 0.04,
      pointRadius: 0.45,
      arcStartLat: "startLat",
      arcStartLng: "startLng",
      arcEndLat: "endLat",
      arcEndLng: "endLng",
      arcColor: "color",
      arcLabel: "name",
      arcAltitude: 0.26,
      arcStroke: 0.8,
      arcDashLength: 0.6,
      arcDashGap: 2,
      arcDashAnimateTime: 2200,
      atmosphereColor: "#38bdf8",
      atmosphereAltitude: 0.18,
      backgroundColor: "rgba(0,0,0,0)",
      globeImageUrl: "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      bumpImageUrl: "//unpkg.com/three-globe/example/img/earth-topology.png",
      showGraticules: true,
    }),
    [],
  );

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-950">react-globe.gl</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Route arcs and city points rendered with Three.js.
        </p>
      </div>
      <div
        ref={containerRef}
        className="relative h-[420px] min-h-[320px] bg-[radial-gradient(circle_at_50%_35%,#e0f2fe_0,#f8fafc_42%,#eef2f7_100%)]"
      >
        {size.width > 0 && size.height > 0 ? (
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            onGlobeReady={() => {
              const controls = globeRef.current?.controls();

              if (controls) {
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.55;
                controls.enableZoom = false;
              }
            }}
            {...globeProps}
          />
        ) : null}
      </div>
    </section>
  );
}
