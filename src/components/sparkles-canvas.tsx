"use client";

import { useEffect, useRef } from "react";

type Sparkle = {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
};

export function SparklesCanvas({ density = 9000 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let sparkles: Sparkle[] = [];
    let raf = 0;

    const init = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const count = Math.floor((width * height) / density);
      sparkles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 0.8 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.01,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      for (const sp of sparkles) {
        sp.phase += sp.speed;
        const alpha = ((Math.sin(sp.phase) + 1) / 2) * 0.8 + 0.1;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.85 0.2 300 / ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(animate);
    };

    init();
    animate();
    window.addEventListener("resize", init);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", init);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
