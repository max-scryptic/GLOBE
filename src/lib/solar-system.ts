/**
 * Approximate positions of the major planets from Keplerian elements.
 *
 * Elements and per-century rates are the standard JPL/NASA table published in
 * "Keplerian Elements for Approximate Positions of the Major Planets"
 * (E. M. Standish, Solar System Dynamics, JPL/Caltech), valid 1800 AD - 2050 AD.
 * Values are heliocentric and referred to the mean ecliptic and equinox of J2000.
 */

const DEG_TO_RAD = Math.PI / 180;
const J2000_JULIAN_DATE = 2451545.0;
const DAYS_PER_CENTURY = 36525;
const MS_PER_DAY = 86400000;

/** Scene units per astronomical unit. */
export const UNITS_PER_AU = 5;

/**
 * Bodies are drawn far larger than scale so they stay visible next to orbits
 * that are millions of times wider. The exponent compresses the huge spread
 * between Pluto and the Sun while preserving their relative ordering.
 */
const RADIUS_EXPONENT = 0.4;
const EARTH_DISPLAY_RADIUS = 0.09;
const EARTH_RADIUS_KM = 6371;

export function displayRadiusFor(radiusKm: number) {
  return (
    Math.pow(radiusKm / EARTH_RADIUS_KM, RADIUS_EXPONENT) * EARTH_DISPLAY_RADIUS
  );
}

export type KeplerianElements = {
  /** Semi-major axis, AU. */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Inclination, degrees. */
  i: number;
  /** Mean longitude, degrees. */
  l: number;
  /** Longitude of perihelion, degrees. */
  peri: number;
  /** Longitude of the ascending node, degrees. */
  node: number;
};

export type PlanetDefinition = {
  id: string;
  name: string;
  /** Mean equatorial radius, km. */
  radiusKm: number;
  /** Base surface colour. */
  color: string;
  /** Secondary colour used for the procedural band texture. */
  bandColor: string;
  /** Sidereal rotation period in hours (negative when retrograde). */
  rotationHours: number;
  /** Axial tilt in degrees. */
  axialTilt: number;
  hasRings?: boolean;
  blurb: string;
  elements: KeplerianElements;
  rates: KeplerianElements;
};

export const SUN = {
  id: "sun",
  name: "Sun",
  radiusKm: 696000,
  color: "#fff3c4",
  blurb: "G-type main-sequence star holding 99.86% of the system's mass.",
};

export const PLANETS: PlanetDefinition[] = [
  {
    id: "mercury",
    name: "Mercury",
    radiusKm: 2439.7,
    color: "#9c8b7d",
    bandColor: "#6f6157",
    rotationHours: 1407.6,
    axialTilt: 0.03,
    blurb: "Airless, cratered, and the fastest planet at 47 km/s.",
    elements: {
      a: 0.38709927,
      e: 0.20563593,
      i: 7.00497902,
      l: 252.2503235,
      peri: 77.45779628,
      node: 48.33076593,
    },
    rates: {
      a: 0.00000037,
      e: 0.00001906,
      i: -0.00594749,
      l: 149472.67411175,
      peri: 0.16047689,
      node: -0.12534081,
    },
  },
  {
    id: "venus",
    name: "Venus",
    radiusKm: 6051.8,
    color: "#e6c98d",
    bandColor: "#c9a468",
    rotationHours: -5832.5,
    axialTilt: 177.4,
    blurb: "Runaway greenhouse world with a 92-bar carbon dioxide atmosphere.",
    elements: {
      a: 0.72333566,
      e: 0.00677672,
      i: 3.39467605,
      l: 181.9790995,
      peri: 131.60246718,
      node: 76.67984255,
    },
    rates: {
      a: 0.0000039,
      e: -0.00004107,
      i: -0.0007889,
      l: 58517.81538729,
      peri: 0.00268329,
      node: -0.27769418,
    },
  },
  {
    id: "earth",
    name: "Earth",
    radiusKm: 6371,
    color: "#2f6fb5",
    bandColor: "#2a8f6a",
    rotationHours: 23.934,
    axialTilt: 23.44,
    blurb: "Home. One natural satellite and roughly 12,000 tracked objects in orbit.",
    // The table gives the Earth-Moon barycentre.
    elements: {
      a: 1.00000261,
      e: 0.01671123,
      i: -0.00001531,
      l: 100.46457166,
      peri: 102.93768193,
      node: 0,
    },
    rates: {
      a: 0.00000562,
      e: -0.00004392,
      i: -0.01294668,
      l: 35999.37244981,
      peri: 0.32327364,
      node: 0,
    },
  },
  {
    id: "mars",
    name: "Mars",
    radiusKm: 3389.5,
    color: "#c1522f",
    bandColor: "#8d3b23",
    rotationHours: 24.623,
    axialTilt: 25.19,
    blurb: "Thin CO2 atmosphere, two small moons, and the tallest volcano known.",
    elements: {
      a: 1.52371034,
      e: 0.0933941,
      i: 1.84969142,
      l: -4.55343205,
      peri: -23.94362959,
      node: 49.55953891,
    },
    rates: {
      a: 0.00001847,
      e: 0.00007882,
      i: -0.00813131,
      l: 19140.30268499,
      peri: 0.44441088,
      node: -0.29257343,
    },
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radiusKm: 69911,
    color: "#d6a06a",
    bandColor: "#8f5f3d",
    rotationHours: 9.925,
    axialTilt: 3.13,
    blurb: "Gas giant with 2.5x the mass of every other planet combined.",
    elements: {
      a: 5.202887,
      e: 0.04838624,
      i: 1.30439695,
      l: 34.39644051,
      peri: 14.72847983,
      node: 100.47390909,
    },
    rates: {
      a: -0.00011607,
      e: -0.00013253,
      i: -0.00183714,
      l: 3034.74612775,
      peri: 0.21252668,
      node: 0.20469106,
    },
  },
  {
    id: "saturn",
    name: "Saturn",
    radiusKm: 58232,
    color: "#e0c288",
    bandColor: "#b2915c",
    rotationHours: 10.656,
    axialTilt: 26.73,
    hasRings: true,
    blurb: "Ring system spans 280,000 km but averages only ~20 m thick.",
    elements: {
      a: 9.53667594,
      e: 0.05386179,
      i: 2.48599187,
      l: 49.95424423,
      peri: 92.59887831,
      node: 113.66242448,
    },
    rates: {
      a: -0.0012506,
      e: -0.00050991,
      i: 0.00193609,
      l: 1222.49362201,
      peri: -0.41897216,
      node: -0.28867794,
    },
  },
  {
    id: "uranus",
    name: "Uranus",
    radiusKm: 25362,
    color: "#9fd8e0",
    bandColor: "#74b2bd",
    rotationHours: -17.24,
    axialTilt: 97.77,
    hasRings: true,
    blurb: "Ice giant tipped on its side, orbiting the Sun once every 84 years.",
    elements: {
      a: 19.18916464,
      e: 0.04725744,
      i: 0.77263783,
      l: 313.23810451,
      peri: 170.9542763,
      node: 74.01692503,
    },
    rates: {
      a: -0.00196176,
      e: -0.00004397,
      i: -0.00242939,
      l: 428.48202785,
      peri: 0.40805281,
      node: 0.04240589,
    },
  },
  {
    id: "neptune",
    name: "Neptune",
    radiusKm: 24622,
    color: "#3f6fd8",
    bandColor: "#2b4fa3",
    rotationHours: 16.11,
    axialTilt: 28.32,
    blurb: "Fastest winds in the system, above 2,000 km/h.",
    elements: {
      a: 30.06992276,
      e: 0.00859048,
      i: 1.77004347,
      l: -55.12002969,
      peri: 44.96476227,
      node: 131.78422574,
    },
    rates: {
      a: 0.00026291,
      e: 0.00005105,
      i: 0.00035372,
      l: 218.45945325,
      peri: -0.32241464,
      node: -0.00508664,
    },
  },
  {
    id: "pluto",
    name: "Pluto",
    radiusKm: 1188,
    color: "#c7ac93",
    bandColor: "#96795f",
    rotationHours: -153.3,
    axialTilt: 122.5,
    blurb: "Dwarf planet on a 17-degree inclined, highly eccentric orbit.",
    elements: {
      a: 39.48211675,
      e: 0.2488273,
      i: 17.14001206,
      l: 238.92903833,
      peri: 224.06891629,
      node: 110.30393684,
    },
    rates: {
      a: -0.00031596,
      e: 0.0000517,
      i: 0.00004818,
      l: 145.20780515,
      peri: -0.04062942,
      node: -0.01183482,
    },
  },
];

export type Vector3Tuple = { x: number; y: number; z: number };

export function toJulianDate(date: Date) {
  return date.getTime() / MS_PER_DAY + 2440587.5;
}

/** Julian centuries since J2000.0. */
export function centuriesSinceJ2000(date: Date) {
  return (toJulianDate(date) - J2000_JULIAN_DATE) / DAYS_PER_CENTURY;
}

function wrapDegrees(value: number) {
  const wrapped = ((value % 360) + 360) % 360;

  return wrapped > 180 ? wrapped - 360 : wrapped;
}

/** Newton-Raphson solution of Kepler's equation, M and E in radians. */
function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number) {
  let eccentricAnomaly =
    meanAnomaly + eccentricity * Math.sin(meanAnomaly);

  for (let index = 0; index < 12; index += 1) {
    const delta =
      (eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));

    eccentricAnomaly -= delta;

    if (Math.abs(delta) < 1e-10) {
      break;
    }
  }

  return eccentricAnomaly;
}

export function elementsAt(planet: PlanetDefinition, centuries: number) {
  return {
    a: planet.elements.a + planet.rates.a * centuries,
    e: planet.elements.e + planet.rates.e * centuries,
    i: planet.elements.i + planet.rates.i * centuries,
    l: planet.elements.l + planet.rates.l * centuries,
    peri: planet.elements.peri + planet.rates.peri * centuries,
    node: planet.elements.node + planet.rates.node * centuries,
  };
}

/**
 * Rotates a point from the orbital plane into ecliptic coordinates and then
 * into the renderer's Y-up frame, returning scene units.
 */
function orbitalToScene(
  xOrbital: number,
  yOrbital: number,
  elements: KeplerianElements,
): Vector3Tuple {
  const argumentOfPerihelion = (elements.peri - elements.node) * DEG_TO_RAD;
  const node = elements.node * DEG_TO_RAD;
  const inclination = elements.i * DEG_TO_RAD;
  const cosArgument = Math.cos(argumentOfPerihelion);
  const sinArgument = Math.sin(argumentOfPerihelion);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  const eclipticX =
    (cosArgument * cosNode - sinArgument * sinNode * cosInclination) * xOrbital +
    (-sinArgument * cosNode - cosArgument * sinNode * cosInclination) * yOrbital;
  const eclipticY =
    (cosArgument * sinNode + sinArgument * cosNode * cosInclination) * xOrbital +
    (-sinArgument * sinNode + cosArgument * cosNode * cosInclination) * yOrbital;
  const eclipticZ =
    sinArgument * sinInclination * xOrbital +
    cosArgument * sinInclination * yOrbital;

  // three.js is Y-up; the ecliptic plane maps to the XZ plane.
  return {
    x: eclipticX * UNITS_PER_AU,
    y: eclipticZ * UNITS_PER_AU,
    z: -eclipticY * UNITS_PER_AU,
  };
}

/** Heliocentric position of a planet in scene units at the given date. */
export function planetPositionAt(
  planet: PlanetDefinition,
  date: Date,
): Vector3Tuple {
  const centuries = centuriesSinceJ2000(date);
  const elements = elementsAt(planet, centuries);
  const meanAnomaly = wrapDegrees(elements.l - elements.peri) * DEG_TO_RAD;
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, elements.e);
  const xOrbital = elements.a * (Math.cos(eccentricAnomaly) - elements.e);
  const yOrbital =
    elements.a *
    Math.sqrt(1 - elements.e * elements.e) *
    Math.sin(eccentricAnomaly);

  return orbitalToScene(xOrbital, yOrbital, elements);
}

/** Sampled points tracing one full orbit, for drawing the orbit line. */
export function orbitPath(
  planet: PlanetDefinition,
  date: Date,
  segments = 512,
): Vector3Tuple[] {
  const elements = elementsAt(planet, centuriesSinceJ2000(date));
  const points: Vector3Tuple[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const eccentricAnomaly = (index / segments) * Math.PI * 2;
    const xOrbital = elements.a * (Math.cos(eccentricAnomaly) - elements.e);
    const yOrbital =
      elements.a *
      Math.sqrt(1 - elements.e * elements.e) *
      Math.sin(eccentricAnomaly);

    points.push(orbitalToScene(xOrbital, yOrbital, elements));
  }

  return points;
}

const MOON_SIDEREAL_PERIOD_DAYS = 27.321661;
const MOON_INCLINATION_RAD = 5.145 * DEG_TO_RAD;
/**
 * The Moon's true distance is well inside Earth's exaggerated display radius,
 * so it is pushed out to stay visible. Direction and period stay faithful.
 */
export const MOON_DISPLAY_DISTANCE = 0.26;
export const MOON_DISPLAY_RADIUS = EARTH_DISPLAY_RADIUS * 0.3;

/** Moon position relative to Earth, in scene units. */
export function moonOffsetAt(date: Date): Vector3Tuple {
  const days = toJulianDate(date) - J2000_JULIAN_DATE;
  const phase = (days / MOON_SIDEREAL_PERIOD_DAYS) * Math.PI * 2 + 2.35;
  const x = Math.cos(phase) * MOON_DISPLAY_DISTANCE;
  const y = Math.sin(phase) * MOON_DISPLAY_DISTANCE;

  return {
    x,
    y: y * Math.sin(MOON_INCLINATION_RAD),
    z: -y * Math.cos(MOON_INCLINATION_RAD),
  };
}
