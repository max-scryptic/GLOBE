"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";
import * as THREE from "three";
import { useElementSize } from "@/components/use-element-size";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

type CartoonCountry = {
  properties: {
    name: string;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
};

const cartoonCountries: CartoonCountry[] = [
  {
    properties: { name: "Northland" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-132, 58],
          [-105, 70],
          [-72, 58],
          [-58, 35],
          [-86, 18],
          [-122, 28],
          [-145, 44],
          [-132, 58],
        ],
      ],
    },
  },
  {
    properties: { name: "Southland" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-82, 12],
          [-52, 4],
          [-38, -24],
          [-58, -54],
          [-78, -42],
          [-92, -12],
          [-82, 12],
        ],
      ],
    },
  },
  {
    properties: { name: "West Eurobia" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-16, 56],
          [18, 62],
          [42, 46],
          [34, 28],
          [4, 30],
          [-20, 40],
          [-16, 56],
        ],
      ],
    },
  },
  {
    properties: { name: "Sunspice" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-4, 24],
          [34, 27],
          [47, 6],
          [33, -29],
          [8, -34],
          [-10, -6],
          [-4, 24],
        ],
      ],
    },
  },
  {
    properties: { name: "Eastreach" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [42, 55],
          [96, 68],
          [142, 48],
          [130, 12],
          [82, 4],
          [46, 24],
          [42, 55],
        ],
      ],
    },
  },
  {
    properties: { name: "Island Loop" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [108, -10],
          [146, -16],
          [156, -42],
          [128, -50],
          [102, -34],
          [108, -10],
        ],
      ],
    },
  },
];

export function CartoonReactGlobeCard() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();

  const globeProps = useMemo<GlobeProps>(
    () => ({
      polygonsData: cartoonCountries,
      polygonCapColor: () => "#45b84f",
      polygonSideColor: () => "#45b84f",
      polygonStrokeColor: () => "#ffd429",
      polygonLabel: "properties.name",
      polygonAltitude: 0.012,
      backgroundColor: "rgba(0,0,0,0)",
      showAtmosphere: false,
      showGraticules: false,
      globeMaterial: new THREE.MeshBasicMaterial({ color: "#9edcff" }),
    }),
    [],
  );

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-950">
          react-globe.gl cartoon
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Flat water, green land, and bright yellow country borders.
        </p>
      </div>
      <div
        ref={containerRef}
        className="relative h-[420px] min-h-[320px] bg-[#eaf7ff]"
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
                controls.autoRotateSpeed = 0.45;
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
