"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, RefreshCw, Satellite, Signal } from "lucide-react";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";
import { useElementSize } from "@/components/use-element-size";
import { cn } from "@/lib/utils";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

const EARTH_RADIUS_KM = 6378.137;
const EARTH_MU_KM3_S2 = 398600.4418;
const TWO_PI = Math.PI * 2;

const satelliteGroups = [
  { id: "featured", label: "Featured", limit: 700 },
  { id: "stations", label: "Stations", limit: 150 },
  { id: "active", label: "Active", limit: 1100 },
  { id: "starlink", label: "Starlink", limit: 1600 },
  { id: "gps", label: "GPS", limit: 400 },
  { id: "brightest", label: "Bright", limit: 250 },
] as const;

type SatelliteGroup = (typeof satelliteGroups)[number]["id"];

type OrbitElement = {
  OBJECT_NAME?: string;
  NORAD_CAT_ID: number;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
};

type SatelliteApiResponse = {
  fetchedAt: string;
  group: string;
  source: string;
  totalAvailable: number;
  satellites: OrbitElement[];
};

type SatellitePoint = {
  altitude: number;
  altitudeKm: number;
  color: string;
  id: number;
  lat: number;
  lng: number;
  name: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeRadians(value: number) {
  return ((value % TWO_PI) + TWO_PI) % TWO_PI;
}

function normalizeLongitude(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function parseEpoch(value: string) {
  const epoch = new Date(value.endsWith("Z") ? value : `${value}Z`);

  return Number.isNaN(epoch.getTime()) ? null : epoch;
}

function getJulianDate(date: Date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function getGreenwichSiderealRadians(date: Date) {
  const julianDate = getJulianDate(date);
  const centuries = (julianDate - 2451545.0) / 36525;
  const degrees =
    280.46061837 +
    360.98564736629 * (julianDate - 2451545.0) +
    0.000387933 * centuries * centuries -
    (centuries * centuries * centuries) / 38710000;

  return toRadians(normalizeLongitude(degrees));
}

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number) {
  let eccentricAnomaly = meanAnomaly;

  for (let index = 0; index < 8; index += 1) {
    const delta =
      (eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;

    if (Math.abs(delta) < 1e-7) {
      break;
    }
  }

  return eccentricAnomaly;
}

function getOrbitColor(altitudeKm: number) {
  if (altitudeKm > 30000) {
    return "#f59e0b";
  }

  if (altitudeKm > 10000) {
    return "#8b5cf6";
  }

  if (altitudeKm > 2000) {
    return "#2563eb";
  }

  return "#06b6d4";
}

function propagateSatellite(
  satellite: OrbitElement,
  date: Date,
): SatellitePoint | null {
  const epoch = parseEpoch(satellite.EPOCH);

  if (!epoch) {
    return null;
  }

  const eccentricity = satellite.ECCENTRICITY;
  const meanMotionRadiansPerSecond = (satellite.MEAN_MOTION * TWO_PI) / 86400;
  const semiMajorAxisKm = Math.cbrt(
    EARTH_MU_KM3_S2 /
      (meanMotionRadiansPerSecond * meanMotionRadiansPerSecond),
  );
  const secondsSinceEpoch = (date.getTime() - epoch.getTime()) / 1000;
  const meanAnomaly = normalizeRadians(
    toRadians(satellite.MEAN_ANOMALY) +
      meanMotionRadiansPerSecond * secondsSinceEpoch,
  );
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
  const radiusKm =
    semiMajorAxisKm * (1 - eccentricity * Math.cos(eccentricAnomaly));
  const trueAnomaly = Math.atan2(
    Math.sqrt(1 - eccentricity * eccentricity) *
      Math.sin(eccentricAnomaly),
    Math.cos(eccentricAnomaly) - eccentricity,
  );
  const argumentOfLatitude =
    toRadians(satellite.ARG_OF_PERICENTER) + trueAnomaly;
  const inclination = toRadians(satellite.INCLINATION);
  const raan = toRadians(satellite.RA_OF_ASC_NODE);
  const cosRaan = Math.cos(raan);
  const sinRaan = Math.sin(raan);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);
  const cosArgument = Math.cos(argumentOfLatitude);
  const sinArgument = Math.sin(argumentOfLatitude);
  const eciX =
    radiusKm * (cosRaan * cosArgument - sinRaan * sinArgument * cosInclination);
  const eciY =
    radiusKm * (sinRaan * cosArgument + cosRaan * sinArgument * cosInclination);
  const eciZ = radiusKm * (sinArgument * sinInclination);
  const sidereal = getGreenwichSiderealRadians(date);
  const ecefX = eciX * Math.cos(sidereal) + eciY * Math.sin(sidereal);
  const ecefY = -eciX * Math.sin(sidereal) + eciY * Math.cos(sidereal);
  const altitudeKm = Math.max(radiusKm - EARTH_RADIUS_KM, 120);

  return {
    altitude: Math.min(Math.max(altitudeKm / EARTH_RADIUS_KM, 0.018), 5.9),
    altitudeKm,
    color: getOrbitColor(altitudeKm),
    id: satellite.NORAD_CAT_ID,
    lat: toDegrees(Math.atan2(eciZ, Math.hypot(ecefX, ecefY))),
    lng: normalizeLongitude(toDegrees(Math.atan2(ecefY, ecefX))),
    name: satellite.OBJECT_NAME ?? `NORAD ${satellite.NORAD_CAT_ID}`,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function SatelliteGlobeCard() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const [activeGroup, setActiveGroup] = useState<SatelliteGroup>("featured");
  const [satellites, setSatellites] = useState<OrbitElement[]>([]);
  const [metadata, setMetadata] = useState<SatelliteApiResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [displayTime, setDisplayTime] = useState(() => new Date());

  const selectedGroup = satelliteGroups.find(
    (group) => group.id === activeGroup,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSatellites() {
      setLoadState("loading");

      try {
        const limit = selectedGroup?.limit ?? 900;
        const response = await fetch(
          `/api/satellites?group=${activeGroup}&limit=${limit}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Satellite data request failed.");
        }

        const data = (await response.json()) as SatelliteApiResponse;
        setSatellites(data.satellites);
        setMetadata(data);
        setDisplayTime(new Date());
        setLoadState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setLoadState("error");
      }
    }

    loadSatellites();

    return () => {
      controller.abort();
    };
  }, [activeGroup, selectedGroup?.limit]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDisplayTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const satellitePoints = useMemo(
    () =>
      satellites
        .map((satellite) => propagateSatellite(satellite, displayTime))
        .filter((point): point is SatellitePoint => point !== null),
    [displayTime, satellites],
  );

  const lowEarthCount = satellitePoints.filter(
    (point) => point.altitudeKm < 2000,
  ).length;
  const mediumOrbitCount = satellitePoints.filter(
    (point) => point.altitudeKm >= 2000 && point.altitudeKm < 30000,
  ).length;
  const highOrbitCount = satellitePoints.length - lowEarthCount - mediumOrbitCount;

  const globeProps = useMemo<GlobeProps>(
    () => ({
      htmlElementsData: satellitePoints,
      htmlLat: "lat",
      htmlLng: "lng",
      htmlAltitude: "altitude",
      htmlElement: (point) => {
        const satellite = point as SatellitePoint;
        const dot = document.createElement("span");
        const size = satellite.altitudeKm > 30000 ? 5 : 3;

        dot.title = `${satellite.name} - NORAD ${satellite.id} - ${Math.round(
          satellite.altitudeKm,
        )} km`;
        dot.style.display = "block";
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.borderRadius = "999px";
        dot.style.background = satellite.color;
        dot.style.boxShadow = `0 0 ${size * 2}px ${satellite.color}`;
        dot.style.pointerEvents = "auto";
        dot.style.transform = "translate(-50%, -50%)";

        return dot;
      },
      htmlTransitionDuration: 900,
      atmosphereColor: "#22d3ee",
      atmosphereAltitude: 0.13,
      backgroundColor: "rgba(0,0,0,0)",
      globeImageUrl: "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      bumpImageUrl: "//unpkg.com/three-globe/example/img/earth-topology.png",
      showGraticules: true,
    }),
    [satellitePoints],
  );

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950">
            <Satellite className="size-4" aria-hidden="true" />
            Satellite Orbits
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Public CelesTrak orbital elements propagated into live Earth
            positions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {satelliteGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroup(group.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
                activeGroup === group.id
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative h-[680px] min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#172554_0,#020617_58%,#000_100%)]"
      >
        {size.width > 0 && size.height > 0 ? (
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            onGlobeReady={() => {
              const controls = globeRef.current?.controls();

              globeRef.current?.pointOfView(
                { lat: 18, lng: -35, altitude: 3.15 },
                900,
              );

              if (controls) {
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.28;
                controls.enableZoom = true;
                controls.enablePan = true;
                controls.enableDamping = true;
                controls.dampingFactor = 0.08;
                controls.rotateSpeed = 0.55;
                controls.zoomSpeed = 0.7;
                controls.minDistance = 175;
                controls.maxDistance = 1300;
              }
            }}
            {...globeProps}
          />
        ) : null}

        <div className="pointer-events-none absolute inset-x-4 top-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-200">
              <Signal className="size-3.5" aria-hidden="true" />
              Visible Objects
            </div>
            <div className="mt-1 text-lg font-semibold">
              {formatNumber(satellitePoints.length)}
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-200">
              <Activity className="size-3.5" aria-hidden="true" />
              Orbit Mix
            </div>
            <div className="mt-1 text-sm font-semibold">
              {formatNumber(lowEarthCount)} LEO / {formatNumber(mediumOrbitCount)}{" "}
              MEO / {formatNumber(highOrbitCount)} high
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-200">
              <RefreshCw
                className={cn("size-3.5", loadState === "loading" && "animate-spin")}
                aria-hidden="true"
              />
              Data Feed
            </div>
            <div className="mt-1 text-sm font-semibold">
              {loadState === "error"
                ? "Offline"
                : loadState === "loading"
                  ? "Loading"
                  : metadata
                    ? `${metadata.group} from CelesTrak`
                    : "Waiting"}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-md border border-white/10 bg-black/45 px-3 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur">
          <span className="font-semibold text-white">
            {displayTime.toUTCString()}
          </span>
          {metadata ? (
            <span className="ml-2 text-zinc-400">
              {formatNumber(metadata.totalAvailable)} available in source group
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
