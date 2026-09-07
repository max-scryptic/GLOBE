import { NextRequest, NextResponse } from "next/server";

const CELESTRAK_GROUPS = {
  active: "ACTIVE",
  amateur: "AMATEUR",
  brightest: "VISUAL",
  cubesat: "CUBESAT",
  featured: "FEATURED",
  galileo: "GALILEO",
  glonass: "GLONASS",
  goes: "GOES",
  gps: "GPS-OPS",
  iridium: "IRIDIUM",
  noaa: "NOAA",
  oneweb: "ONEWEB",
  planet: "PLANET",
  starlink: "STARLINK",
  stations: "STATIONS",
  weather: "WEATHER",
} as const;

const FEATURED_GROUPS = [
  "STATIONS",
  "VISUAL",
  "GPS-OPS",
  "WEATHER",
  "ONEWEB",
] as const;
const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 12000;
const CACHE_TTL_MS = 1000 * 60 * 30;

const responseCache = new Map<
  string,
  { data: SatelliteResponse; expiresAt: number }
>();

type CelesTrakSatellite = {
  OBJECT_NAME?: string;
  NORAD_CAT_ID?: number;
  EPOCH?: string;
  MEAN_MOTION?: number;
  ECCENTRICITY?: number;
  INCLINATION?: number;
  RA_OF_ASC_NODE?: number;
  ARG_OF_PERICENTER?: number;
  MEAN_ANOMALY?: number;
  REV_AT_EPOCH?: number;
};

type OrbitSatellite = CelesTrakSatellite & {
  EPOCH: string;
  MEAN_ANOMALY: number;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  NORAD_CAT_ID: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
};

type SatelliteResponse = {
  fetchedAt: string;
  group: string;
  limit: number;
  source: string;
  totalAvailable: number;
  satellites: OrbitSatellite[];
};

function clampLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function hasOrbitFields(
  satellite: CelesTrakSatellite,
): satellite is OrbitSatellite {
  return (
    typeof satellite.NORAD_CAT_ID === "number" &&
    typeof satellite.EPOCH === "string" &&
    typeof satellite.MEAN_MOTION === "number" &&
    typeof satellite.ECCENTRICITY === "number" &&
    typeof satellite.INCLINATION === "number" &&
    typeof satellite.RA_OF_ASC_NODE === "number" &&
    typeof satellite.ARG_OF_PERICENTER === "number" &&
    typeof satellite.MEAN_ANOMALY === "number"
  );
}

async function fetchCelesTrakGroup(group: string) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=JSON`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "GLOBE satellite orbit viewer",
    },
  });

  if (!response.ok) {
    throw new Error(`CelesTrak responded with ${response.status}.`);
  }

  return (await response.json()) as CelesTrakSatellite[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const groupParam = searchParams.get("group")?.toLowerCase() ?? "featured";
  const group =
    groupParam in CELESTRAK_GROUPS
      ? CELESTRAK_GROUPS[groupParam as keyof typeof CELESTRAK_GROUPS]
      : CELESTRAK_GROUPS.active;
  const limit = clampLimit(searchParams.get("limit"));
  const cacheKey = `${group}:${limit}`;
  const cached = responseCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const groups = group === "FEATURED" ? FEATURED_GROUPS : [group];
    const groupData = await Promise.all(
      groups.map((celestrakGroup) => fetchCelesTrakGroup(celestrakGroup)),
    );
    const data = groupData.flat();
    const uniqueSatellites = new Map<number, OrbitSatellite>();

    for (const satellite of data) {
      if (
        hasOrbitFields(satellite) &&
        !uniqueSatellites.has(satellite.NORAD_CAT_ID)
      ) {
        uniqueSatellites.set(satellite.NORAD_CAT_ID, satellite);
      }
    }

    const satellites = Array.from(uniqueSatellites.values()).slice(0, limit);
    const responseData = {
      fetchedAt: new Date().toISOString(),
      group,
      limit,
      source:
        group === "FEATURED"
          ? FEATURED_GROUPS.map(
              (celestrakGroup) =>
                `https://celestrak.org/NORAD/elements/gp.php?GROUP=${celestrakGroup}&FORMAT=JSON`,
            ).join(", ")
          : `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=JSON`,
      totalAvailable: data.length,
      satellites,
    };

    responseCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(responseData);
  } catch {
    if (cached) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json(
      { error: "Unable to load satellite data." },
      { status: 502 },
    );
  }
}
