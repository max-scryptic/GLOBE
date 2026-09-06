"use client";

import createGlobe, { type COBEOptions } from "cobe";
import { useEffect, useRef } from "react";
import { useElementSize } from "@/components/use-element-size";

const markers: COBEOptions["markers"] = [
  { location: [37.7749, -122.4194], size: 0.035, color: [0.12, 0.32, 0.86] },
  { location: [40.7128, -74.006], size: 0.035, color: [0.03, 0.57, 0.7] },
  { location: [51.5072, -0.1276], size: 0.035, color: [0.09, 0.64, 0.29] },
  { location: [35.6762, 139.6503], size: 0.04, color: [0.86, 0.15, 0.15] },
  { location: [-33.8688, 151.2093], size: 0.035, color: [0.96, 0.62, 0.04] },
];

const arcs: COBEOptions["arcs"] = [
  { from: [37.7749, -122.4194], to: [35.6762, 139.6503] },
  { from: [40.7128, -74.006], to: [51.5072, -0.1276] },
  { from: [51.5072, -0.1276], to: [-33.8688, 151.2093] },
];

export function CobeGlobeCard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || size.width === 0 || size.height === 0) {
      return;
    }

    let phi = 0;
    let frameId = 0;
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const globe = createGlobe(canvas, {
      devicePixelRatio,
      width: size.width * devicePixelRatio,
      height: size.height * devicePixelRatio,
      phi,
      theta: 0.28,
      dark: 0,
      diffuse: 1.25,
      mapSamples: 16000,
      mapBrightness: 5.8,
      baseColor: [1, 1, 1],
      markerColor: [0.12, 0.32, 0.86],
      glowColor: [0.92, 0.98, 1],
      markers,
      arcs,
      arcColor: [0.12, 0.32, 0.86],
      arcWidth: 0.7,
      arcHeight: 0.32,
      scale: 1,
    });

    const animate = () => {
      phi += 0.004;
      globe.update({ phi });
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      globe.destroy();
    };
  }, [size.height, size.width]);

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-950">COBE</h2>
        <p className="mt-1 text-sm text-zinc-600">
          A lightweight WebGL globe running directly on a canvas.
        </p>
      </div>
      <div
        ref={containerRef}
        className="relative flex h-[420px] min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#ecfeff_0,#f8fafc_45%,#f1f5f9_100%)]"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ contain: "layout paint size" }}
          width={size.width * 2}
          height={size.height * 2}
        />
      </div>
    </section>
  );
}
