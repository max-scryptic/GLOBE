"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";
import {
  Crosshair,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Sun as SunIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  MOON_DISPLAY_DISTANCE,
  MOON_DISPLAY_RADIUS,
  PLANETS,
  SUN,
  UNITS_PER_AU,
  displayRadiusFor,
  moonOffsetAt,
  orbitPath,
  planetPositionAt,
} from "@/lib/solar-system";
import { cn } from "@/lib/utils";

const EARTH_TEXTURE_URL =
  "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg";

const MIN_CAMERA_DISTANCE = 0.15;
const MAX_CAMERA_DISTANCE = 900;

const timeSpeeds = [
  { label: "Pause", daysPerSecond: 0 },
  { label: "Real time", daysPerSecond: 1 / 86400 },
  { label: "1 day/s", daysPerSecond: 1 },
  { label: "10 days/s", daysPerSecond: 10 },
  { label: "60 days/s", daysPerSecond: 60 },
  { label: "1 yr/s", daysPerSecond: 365.25 },
] as const;

const focusTargets = [
  { id: SUN.id, name: SUN.name, distance: 6 },
  ...PLANETS.map((planet) => ({
    id: planet.id,
    name: planet.name,
    distance: Math.max(displayRadiusFor(planet.radiusKm) * 9, 0.45),
  })),
];

const viewPresets = [
  { id: "earth", label: "Earth", focus: "earth", distance: 0.55 },
  { id: "moon", label: "Earth + Moon", focus: "earth", distance: 1.1 },
  { id: "inner", label: "Inner planets", focus: "sun", distance: 22 },
  { id: "outer", label: "Outer planets", focus: "sun", distance: 220 },
  { id: "all", label: "Whole system", focus: "sun", distance: 520 },
] as const;

/** Deterministic value noise so textures are stable between renders. */
function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;

    return state / 4294967296;
  };
}

function createBandedTexture(base: string, band: string, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = seededRandom(seed);
  let y = 0;

  while (y < canvas.height) {
    const height = 3 + random() * 14;
    context.globalAlpha = 0.08 + random() * 0.3;
    context.fillStyle = random() > 0.5 ? band : base;
    context.fillRect(0, y, canvas.width, height);
    y += height;
  }

  // Soften the poles so the bands do not pinch into hard artefacts.
  context.globalAlpha = 0.35;
  context.fillStyle = band;
  context.fillRect(0, 0, canvas.width, 12);
  context.fillRect(0, canvas.height - 12, canvas.width, 12);
  context.globalAlpha = 1;

  return canvas;
}

/** Coarse landmasses in [longitude, latitude, width°, height°]. */
const LANDMASSES: [number, number, number, number][] = [
  [-100, 48, 62, 34],
  [-92, 26, 34, 26],
  [-80, 12, 20, 10],
  [-42, 72, 26, 14],
  [-60, -14, 30, 46],
  [-70, -38, 14, 22],
  [12, 14, 58, 34],
  [22, -18, 34, 36],
  [18, 52, 46, 20],
  [88, 52, 92, 38],
  [78, 20, 26, 26],
  [110, 4, 34, 22],
  [134, -26, 40, 22],
  [174, -42, 10, 12],
];

/**
 * Fallback Earth map used until (or instead of) the CDN imagery: an ocean
 * gradient with rough continents and ice caps in equirectangular projection.
 */
function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, "#123a63");
  ocean.addColorStop(0.5, "#1c5a92");
  ocean.addColorStop(1, "#123a63");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = seededRandom(48151623);
  const toX = (lon: number) => ((lon + 180) / 360) * canvas.width;
  const toY = (lat: number) => ((90 - lat) / 180) * canvas.height;

  LANDMASSES.forEach(([lon, lat, spanLon, spanLat]) => {
    // A few jittered ellipses per landmass keep the coastlines from looking
    // like perfect ovals.
    for (let blob = 0; blob < 12; blob += 1) {
      const jitterLon = (random() - 0.5) * spanLon * 0.7;
      const jitterLat = (random() - 0.5) * spanLat * 0.7;
      const radiusX = (spanLon / 360) * canvas.width * (0.18 + random() * 0.22);
      const radiusY = (spanLat / 180) * canvas.height * (0.18 + random() * 0.22);

      context.beginPath();
      context.ellipse(
        toX(lon + jitterLon),
        toY(lat + jitterLat),
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2,
      );
      context.fillStyle =
        random() > 0.35
          ? `hsl(${95 + random() * 30}, ${28 + random() * 20}%, ${24 + random() * 14}%)`
          : `hsl(${38 + random() * 14}, ${34 + random() * 16}%, ${34 + random() * 12}%)`;
      context.fill();
    }
  });

  context.fillStyle = "rgba(236, 244, 252, 0.9)";
  context.fillRect(0, 0, canvas.width, canvas.height * 0.045);
  context.fillRect(0, canvas.height * 0.94, canvas.width, canvas.height * 0.06);

  return canvas;
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255, 244, 200, 0.95)");
  gradient.addColorStop(0.25, "rgba(255, 208, 112, 0.45)");
  gradient.addColorStop(0.6, "rgba(255, 156, 48, 0.12)");
  gradient.addColorStop(1, "rgba(255, 140, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  return canvas;
}

function createDotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  return canvas;
}

function formatAu(au: number) {
  return `${au.toFixed(au < 10 ? 3 : 2)} AU`;
}

type SceneSettings = {
  daysPerSecond: number;
  focusId: string;
  showOrbits: boolean;
  showLabels: boolean;
};

type SceneCommands = {
  zoomBy: (factor: number) => void;
  setFocus: (focusId: string, distance?: number) => void;
  resetTime: () => void;
};

export function SolarSystemCard() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const commandsRef = useRef<SceneCommands | null>(null);

  const [speedIndex, setSpeedIndex] = useState(2);
  const [focusId, setFocusId] = useState("earth");
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [simulatedDate, setSimulatedDate] = useState(() => new Date());
  const [focusSunDistance, setFocusSunDistance] = useState(1);
  const [ready, setReady] = useState(false);

  // The render loop reads live settings from a ref so changing a control never
  // tears down and rebuilds the WebGL scene.
  const settingsRef = useRef<SceneSettings>({
    daysPerSecond: timeSpeeds[2].daysPerSecond,
    focusId: "earth",
    showOrbits: true,
    showLabels: true,
  });

  useEffect(() => {
    settingsRef.current.daysPerSecond = timeSpeeds[speedIndex].daysPerSecond;
  }, [speedIndex]);

  useEffect(() => {
    settingsRef.current.showOrbits = showOrbits;
  }, [showOrbits]);

  useEffect(() => {
    settingsRef.current.showLabels = showLabels;
  }, [showLabels]);

  useEffect(() => {
    const mount = mountRef.current;
    const overlay = overlayRef.current;

    if (!mount || !overlay) {
      return;
    }

    let disposed = false;
    let cleanup = () => {};

    async function build(mount: HTMLDivElement, overlay: HTMLDivElement) {
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );

      if (disposed) {
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        50,
        mount.clientWidth / Math.max(mount.clientHeight, 1),
        0.01,
        6000,
      );
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 0.9;
      controls.panSpeed = 0.6;
      controls.minDistance = MIN_CAMERA_DISTANCE;
      controls.maxDistance = MAX_CAMERA_DISTANCE;

      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin("anonymous");
      const disposables: { dispose: () => void }[] = [];

      function track<T extends { dispose: () => void }>(resource: T) {
        disposables.push(resource);

        return resource;
      }

      // --- Starfield -------------------------------------------------------
      const starCount = 4000;
      const starPositions = new Float32Array(starCount * 3);

      const starRandom = seededRandom(20260907);

      for (let index = 0; index < starCount; index += 1) {
        const theta = starRandom() * Math.PI * 2;
        const phi = Math.acos(2 * starRandom() - 1);
        const radius = 2200 + starRandom() * 400;

        starPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[index * 3 + 1] = radius * Math.cos(phi);
        starPositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      }

      const starGeometry = track(new THREE.BufferGeometry());
      starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(starPositions, 3),
      );
      const starMaterial = track(
        new THREE.PointsMaterial({
          color: 0xffffff,
          size: 1.4,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.75,
        }),
      );
      scene.add(new THREE.Points(starGeometry, starMaterial));

      // --- Lighting --------------------------------------------------------
      scene.add(new THREE.AmbientLight(0xffffff, 0.16));
      // decay 0 keeps Neptune as brightly lit as Mercury; realistic falloff
      // would leave the outer system invisible at this scale.
      const sunLight = new THREE.PointLight(0xfff2cc, 3.2, 0, 0);
      scene.add(sunLight);

      // --- Sun -------------------------------------------------------------
      const sunRadius = displayRadiusFor(SUN.radiusKm);
      const sunGeometry = track(new THREE.SphereGeometry(sunRadius, 48, 32));
      const sunMaterial = track(
        new THREE.MeshBasicMaterial({ color: new THREE.Color(SUN.color) }),
      );
      const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
      scene.add(sunMesh);

      const glowTexture = track(new THREE.CanvasTexture(createGlowTexture()));
      const glowMaterial = track(
        new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const sunGlow = new THREE.Sprite(glowMaterial);
      sunGlow.scale.setScalar(sunRadius * 9);
      scene.add(sunGlow);

      // --- Planets ---------------------------------------------------------
      type PlanetNode = {
        id: string;
        name: string;
        radius: number;
        pivot: ThreeTypes.Object3D;
        mesh: ThreeTypes.Mesh;
        marker: ThreeTypes.Sprite;
        rotationHours: number;
        orbit: ThreeTypes.Line;
      };

      const planetNodes: PlanetNode[] = [];
      const orbitGroup = new THREE.Group();
      scene.add(orbitGroup);

      const dotTexture = track(new THREE.CanvasTexture(createDotTexture()));
      const now = new Date();

      PLANETS.forEach((planet, index) => {
        const radius = displayRadiusFor(planet.radiusKm);
        const geometry = track(new THREE.SphereGeometry(radius, 48, 32));
        const material = track(
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(planet.color),
            roughness: 0.85,
            metalness: 0.02,
          }),
        );

        const baseTexture = track(
          new THREE.CanvasTexture(
            planet.id === "earth"
              ? createEarthTexture()
              : createBandedTexture(
                  planet.color,
                  planet.bandColor,
                  index * 7919 + 13,
                ),
          ),
        );
        baseTexture.colorSpace = THREE.SRGBColorSpace;
        material.map = baseTexture;
        material.color.set(0xffffff);

        if (planet.id === "earth") {
          // Swap in the real imagery when it arrives; the procedural map above
          // stays as the fallback if the CDN is unreachable.
          textureLoader.load(EARTH_TEXTURE_URL, (texture) => {
            track(texture);
            texture.colorSpace = THREE.SRGBColorSpace;
            material.map = texture;
            material.needsUpdate = true;
          });
        }

        const mesh = new THREE.Mesh(geometry, material);
        const pivot = new THREE.Object3D();
        pivot.add(mesh);
        mesh.rotation.z = (planet.axialTilt * Math.PI) / 180;
        scene.add(pivot);

        if (planet.hasRings) {
          const ringGeometry = track(
            new THREE.RingGeometry(radius * 1.35, radius * 2.3, 96),
          );
          const ringMaterial = track(
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(planet.bandColor),
              side: THREE.DoubleSide,
              transparent: true,
              opacity: planet.id === "saturn" ? 0.55 : 0.25,
              depthWrite: false,
            }),
          );
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = Math.PI / 2;
          mesh.add(ring);
        }

        const pathPoints = orbitPath(planet, now).map(
          (point) => new THREE.Vector3(point.x, point.y, point.z),
        );
        const orbitGeometry = track(
          new THREE.BufferGeometry().setFromPoints(pathPoints),
        );
        const orbitMaterial = track(
          new THREE.LineBasicMaterial({
            color: new THREE.Color(planet.color),
            transparent: true,
            opacity: 0.32,
          }),
        );
        const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
        orbitGroup.add(orbit);

        // Once a planet shrinks below a couple of pixels it disappears, so a
        // constant-size marker takes over as the camera pulls back.
        const markerMaterial = track(
          new THREE.SpriteMaterial({
            map: dotTexture,
            color: new THREE.Color(planet.color),
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        const marker = new THREE.Sprite(markerMaterial);
        marker.visible = false;
        pivot.add(marker);

        planetNodes.push({
          id: planet.id,
          name: planet.name,
          radius,
          pivot,
          mesh,
          marker,
          rotationHours: planet.rotationHours,
          orbit,
        });
      });

      // --- Moon ------------------------------------------------------------
      const moonGeometry = track(
        new THREE.SphereGeometry(MOON_DISPLAY_RADIUS, 32, 24),
      );
      const moonMaterial = track(
        new THREE.MeshStandardMaterial({
          color: new THREE.Color("#b9b6b0"),
          roughness: 0.95,
        }),
      );
      const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
      scene.add(moonMesh);

      const moonOrbitPoints: ThreeTypes.Vector3[] = [];

      for (let index = 0; index <= 128; index += 1) {
        const angle = (index / 128) * Math.PI * 2;
        moonOrbitPoints.push(
          new THREE.Vector3(
            Math.cos(angle) * MOON_DISPLAY_DISTANCE,
            0,
            Math.sin(angle) * MOON_DISPLAY_DISTANCE,
          ),
        );
      }

      const moonOrbitGeometry = track(
        new THREE.BufferGeometry().setFromPoints(moonOrbitPoints),
      );
      const moonOrbitMaterial = track(
        new THREE.LineBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.28,
        }),
      );
      const moonOrbit = new THREE.Line(moonOrbitGeometry, moonOrbitMaterial);
      scene.add(moonOrbit);

      // --- Labels ----------------------------------------------------------
      type LabelEntry = {
        element: HTMLSpanElement;
        object: ThreeTypes.Object3D;
        radius: number;
        priority: number;
      };

      const labelEntries: LabelEntry[] = [];

      function createLabel(
        text: string,
        object: ThreeTypes.Object3D,
        radius: number,
        priority: number,
      ) {
        const element = document.createElement("span");
        element.textContent = text;
        element.className =
          "pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 backdrop-blur-[2px]";
        element.style.willChange = "transform";
        overlay.appendChild(element);
        labelEntries.push({ element, object, radius, priority });
      }

      // Lower priority wins when two labels collide on screen.
      createLabel(SUN.name, sunMesh, sunRadius, 0);
      planetNodes.forEach((node) => createLabel(node.name, node.pivot, node.radius, 1));
      createLabel("Moon", moonMesh, MOON_DISPLAY_RADIUS, 3);

      // --- Camera framing ---------------------------------------------------
      const focusPosition = new THREE.Vector3();
      const cameraOffset = new THREE.Vector3();
      const projected = new THREE.Vector3();
      const placedLabels: { x: number; y: number }[] = [];

      function resolveFocus(target: ThreeTypes.Vector3, focusId: string) {
        if (focusId === SUN.id) {
          return target.set(0, 0, 0);
        }

        const node = planetNodes.find((entry) => entry.id === focusId);

        return node ? target.copy(node.pivot.position) : target.set(0, 0, 0);
      }

      /**
       * Places the camera between the Sun and the target so the lit hemisphere
       * faces the viewer, raised above the ecliptic for a three-quarter view.
       */
      function framingDirection(
        target: ThreeTypes.Vector3,
        focus: ThreeTypes.Vector3,
      ) {
        if (focus.lengthSq() < 1e-8) {
          return target.set(0.3, 0.55, 0.78).normalize();
        }

        return target
          .copy(focus)
          .normalize()
          .multiplyScalar(-1)
          .setY(0.55)
          .normalize();
      }

      function frameFocus(focusId: string, distance: number) {
        resolveFocus(focusPosition, focusId);
        framingDirection(cameraOffset, focusPosition);
        controls.target.copy(focusPosition);
        camera.position
          .copy(focusPosition)
          .add(
            cameraOffset.multiplyScalar(
              THREE.MathUtils.clamp(
                distance,
                MIN_CAMERA_DISTANCE,
                MAX_CAMERA_DISTANCE,
              ),
            ),
          );
        controls.update();
      }

      let simulated = new Date();

      function updateBodies(date: Date) {
        planetNodes.forEach((node) => {
          const planet = PLANETS.find((entry) => entry.id === node.id);

          if (!planet) {
            return;
          }

          const position = planetPositionAt(planet, date);
          node.pivot.position.set(position.x, position.y, position.z);
          node.mesh.rotation.y =
            (date.getTime() / 3600000 / node.rotationHours) * Math.PI * 2;
        });

        const earth = planetNodes.find((node) => node.id === "earth");

        if (earth) {
          const offset = moonOffsetAt(date);
          moonMesh.position.set(
            earth.pivot.position.x + offset.x,
            earth.pivot.position.y + offset.y,
            earth.pivot.position.z + offset.z,
          );
          moonOrbit.position.copy(earth.pivot.position);
        }
      }

      // Positions must exist before the first framing call.
      updateBodies(simulated);
      frameFocus(
        settingsRef.current.focusId,
        viewPresets[0].distance,
      );

      commandsRef.current = {
        zoomBy(factor) {
          cameraOffset.copy(camera.position).sub(controls.target);
          const length = THREE.MathUtils.clamp(
            cameraOffset.length() * factor,
            MIN_CAMERA_DISTANCE,
            MAX_CAMERA_DISTANCE,
          );
          camera.position
            .copy(controls.target)
            .add(cameraOffset.setLength(length));
          controls.update();
        },
        setFocus(nextFocusId, distance) {
          settingsRef.current.focusId = nextFocusId;
          frameFocus(
            nextFocusId,
            distance ??
              focusTargets.find((entry) => entry.id === nextFocusId)?.distance ??
              1,
          );
        },
        resetTime() {
          simulated = new Date();
        },
      };

      // --- Render loop ------------------------------------------------------
      let frameId = 0;
      let lastFrame = performance.now();
      let lastReadout = 0;

      /** Half-height of the view frustum at a given depth, in world units. */
      function frustumHalfHeightAt(depth: number) {
        return Math.tan(((camera.fov / 2) * Math.PI) / 180) * depth;
      }

      /**
       * Planets span a few thousandths of a pixel from the outer system, so a
       * screen-space marker takes over once the sphere is too small to see.
       */
      function updateMarkers() {
        const height = Math.max(mount.clientHeight, 1);

        planetNodes.forEach((node) => {
          const depth = node.pivot.position.distanceTo(camera.position);
          const pixelsPerUnit = height / (2 * frustumHalfHeightAt(depth));
          const screenRadius = node.radius * pixelsPerUnit;

          if (screenRadius > 3) {
            node.marker.visible = false;

            return;
          }

          node.marker.visible = true;
          node.marker.scale.setScalar(10 / pixelsPerUnit);
          node.marker.material.opacity = THREE.MathUtils.clamp(
            1 - screenRadius / 3,
            0.3,
            0.95,
          );
        });
      }

      function updateLabels() {
        const width = mount.clientWidth;
        const height = Math.max(mount.clientHeight, 1);

        if (!settingsRef.current.showLabels) {
          labelEntries.forEach(({ element }) => {
            element.style.opacity = "0";
          });

          return;
        }

        const candidates = labelEntries
          .map((entry) => {
            entry.object.getWorldPosition(projected);
            const depth = projected.distanceTo(camera.position);
            projected.project(camera);

            return {
              entry,
              depth,
              onScreen:
                projected.z < 1 &&
                projected.x > -1 &&
                projected.x < 1 &&
                projected.y > -1 &&
                projected.y < 1,
              x: (projected.x * 0.5 + 0.5) * width,
              y: (-projected.y * 0.5 + 0.5) * height,
            };
          })
          .sort((a, b) => a.entry.priority - b.entry.priority || a.depth - b.depth);

        placedLabels.length = 0;

        candidates.forEach(({ entry, depth, onScreen, x, y }) => {
          const collides =
            onScreen &&
            placedLabels.some(
              (placed) =>
                Math.abs(placed.x - x) < 56 && Math.abs(placed.y - y) < 16,
            );

          if (!onScreen || collides) {
            entry.element.style.opacity = "0";

            return;
          }

          placedLabels.push({ x, y });

          const pixelsPerUnit = height / (2 * frustumHalfHeightAt(depth));
          const offsetY = Math.min(entry.radius * pixelsPerUnit, height * 0.4) + 10;

          entry.element.style.opacity = "1";
          entry.element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - offsetY}px)`;
        });
      }

      function animate(time: number) {
        frameId = requestAnimationFrame(animate);

        const deltaSeconds = Math.min((time - lastFrame) / 1000, 0.1);
        lastFrame = time;

        const { daysPerSecond } = settingsRef.current;

        if (daysPerSecond !== 0) {
          simulated = new Date(
            simulated.getTime() + deltaSeconds * daysPerSecond * 86400000,
          );
        }

        updateBodies(simulated);

        // Keep the focused body centred without yanking the camera around it.
        cameraOffset.copy(camera.position).sub(controls.target);
        resolveFocus(focusPosition, settingsRef.current.focusId);
        controls.target.copy(focusPosition);
        camera.position.copy(focusPosition).add(cameraOffset);

        const cameraRange = camera.position.distanceTo(controls.target);

        orbitGroup.visible = settingsRef.current.showOrbits;
        moonOrbit.visible = settingsRef.current.showOrbits && cameraRange < 40;
        moonMesh.visible = cameraRange < 200;

        controls.update();
        updateMarkers();
        renderer.render(scene, camera);
        updateLabels();

        if (time - lastReadout > 250) {
          lastReadout = time;
          setSimulatedDate(new Date(simulated.getTime()));
          setFocusSunDistance(focusPosition.length() / UNITS_PER_AU);
        }
      }

      frameId = requestAnimationFrame(animate);
      setReady(true);

      const resizeObserver = new ResizeObserver(() => {
        const width = mount.clientWidth;
        const height = mount.clientHeight;

        if (width === 0 || height === 0) {
          return;
        }

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      });

      resizeObserver.observe(mount);

      cleanup = () => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        commandsRef.current = null;
        labelEntries.forEach(({ element }) => element.remove());
        controls.dispose();
        disposables.forEach((resource) => resource.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    build(mount, overlay);

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const handleFocus = useCallback((nextFocusId: string, distance?: number) => {
    setFocusId(nextFocusId);
    settingsRef.current.focusId = nextFocusId;
    commandsRef.current?.setFocus(nextFocusId, distance);
  }, []);

  const activeSpeed = timeSpeeds[speedIndex];

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950">
            <Orbit className="size-4" aria-hidden="true" />
            Solar System
          </h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Earth-centred three.js model driven by JPL Keplerian elements. Scroll
            or use the zoom controls to pull back from low Earth orbit out past
            Neptune.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleFocus(preset.focus, preset.distance)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-5 py-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Crosshair className="size-3.5" aria-hidden="true" />
          Centre on
        </span>
        {focusTargets.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => handleFocus(target.id)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
              focusId === target.id
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
            )}
          >
            {target.id === SUN.id ? (
              <span className="flex items-center gap-1">
                <SunIcon className="size-3" aria-hidden="true" />
                {target.name}
              </span>
            ) : (
              target.name
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Time
          </span>
          {timeSpeeds.map((speed, index) => (
            <button
              key={speed.label}
              type="button"
              onClick={() => setSpeedIndex(index)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                speedIndex === index
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
              )}
            >
              {index === 0 ? (
                <span className="flex items-center gap-1">
                  <Pause className="size-3" aria-hidden="true" />
                  {speed.label}
                </span>
              ) : index === 1 ? (
                <span className="flex items-center gap-1">
                  <Play className="size-3" aria-hidden="true" />
                  {speed.label}
                </span>
              ) : (
                speed.label
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => commandsRef.current?.resetTime()}
          className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          Now
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
            <input
              type="checkbox"
              checked={showOrbits}
              onChange={(event) => setShowOrbits(event.target.checked)}
              className="size-3.5 accent-zinc-950"
            />
            Orbits
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(event) => setShowLabels(event.target.checked)}
              className="size-3.5 accent-zinc-950"
            />
            Labels
          </label>
          <button
            type="button"
            onClick={() => commandsRef.current?.zoomBy(0.65)}
            aria-label="Zoom in"
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <ZoomIn className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => commandsRef.current?.zoomBy(1.55)}
            aria-label="Zoom out"
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <ZoomOut className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative h-[680px] min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#0b1733_0,#03060f_55%,#000_100%)]">
        <div ref={mountRef} className="absolute inset-0" />
        <div ref={overlayRef} className="pointer-events-none absolute inset-0" />

        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            Loading solar system…
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-md border border-white/10 bg-black/45 px-3 py-2 text-xs text-zinc-300 shadow-lg backdrop-blur">
          <div className="font-semibold text-white">
            {simulatedDate.toUTCString()}
          </div>
          <div className="mt-0.5">
            Centred on{" "}
            <span className="text-zinc-100">
              {focusTargets.find((target) => target.id === focusId)?.name ??
                "Sun"}
            </span>
            {focusId === SUN.id
              ? ""
              : ` · ${formatAu(focusSunDistance)} from the Sun`}{" "}
            ·{" "}
            {activeSpeed.daysPerSecond === 0 ? "time paused" : activeSpeed.label}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            Orbits are to scale; body sizes and the Moon&apos;s distance are
            exaggerated so they stay visible.
          </div>
        </div>
      </div>
    </section>
  );
}
