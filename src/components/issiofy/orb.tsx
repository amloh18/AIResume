'use client';

/**
 * issiofy Thinking Orb
 *
 * A perspective-projected particle sphere rendered with Canvas 2D. It has no
 * external runtime dependencies beyond React.
 *
 * Mount it inside a parent container that has an explicit height and
 * `position: relative`, because the canvas fills 100% x 100% of its parent.
 *
 * `orbState` is a purely visual state — it is NOT a microphone or speech
 * integration. The component never calls getUserMedia and never requests any
 * permission. Drive it from whatever application events you already have.
 */

import { useEffect, useRef, type CSSProperties } from 'react';

const defaults = /* ISSIOFY_DEFAULTS */ {
  variant: 'orb',
  palette: 'heather',
  orbState: 'idle',
  distortion: 65,
  swirl: 35,
  grainMix: 15,
  grainOverlay: 12,
  glow: 65,
  speed: 1,
  intensity: 65,
} /* END_DEFAULTS */;

export type ThinkingOrbProps = {
  variant?: string;
  palette?: string;
  color?: string;
  orbState?: 'idle' | 'listening' | 'thinking' | 'speaking';
  speed?: number;
  intensity?: number;
  distortion?: number;
  swirl?: number;
  grainMix?: number;
  grainOverlay?: number;
  glow?: number;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
};

const tones: Record<string, string> = {
  heather: '#c4b5fd',
  greenwood: '#a7f3d0',
  sandstone: '#fed7aa',
  harbor: '#bae6fd',
  rosewater: '#fbcfe8',
  slate: '#e4e4e7',
};

/** Fibonacci sphere projected in perspective; deterministic points and no per-frame React renders. */
export default function ThinkingOrb({
  color,
  palette = defaults.palette,
  orbState = defaults.orbState as NonNullable<ThinkingOrbProps['orbState']>,
  speed = defaults.speed,
  intensity = defaults.intensity,
  distortion = defaults.distortion,
  swirl = defaults.swirl,
  glow = defaults.glow,
  paused = false,
  className,
  style,
}: ThinkingOrbProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({
    color,
    palette,
    orbState,
    speed,
    intensity,
    distortion,
    swirl,
    glow,
    paused,
  });

  useEffect(() => {
    live.current = {
      color,
      palette,
      orbState,
      speed,
      intensity,
      distortion,
      swirl,
      glow,
      paused,
    };
  }, [
    color,
    palette,
    orbState,
    speed,
    intensity,
    distortion,
    swirl,
    glow,
    paused,
  ]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let w = 0,
      h = 0,
      time = 1,
      frame = 0,
      last = performance.now(),
      visible = true,
      dirty = true,
      signature = '';

    const count = 540;
    const points = Array.from({ length: count }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / count,
        r = Math.sqrt(1 - y * y),
        a = i * 2.399963229728653;
      return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, i };
    });

    let morph = 0;

    function resize() {
      const rect = el!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el!.width = Math.round(w * dpr);
      el!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      dirty = true;
    });
    io.observe(el);

    function draw(now: number) {
      const s = live.current,
        dt = Math.min((now - last) / 1000, 0.04);
      last = now;

      const next = JSON.stringify(s);
      if (next !== signature) {
        signature = next;
        dirty = true;
      }

      const moving = !s.paused && !media.matches;

      if (visible && !document.hidden && (moving || dirty)) {
        dirty = false;
        if (moving) time += dt * Math.max(0.2, s.speed);

        const target =
          s.orbState === 'thinking'
            ? 1
            : s.orbState === 'speaking'
              ? 2
              : s.orbState === 'listening'
                ? 3
                : 0;
        morph += (target - morph) * (media.matches ? 1 : Math.min(1, dt * 4));

        const size = Math.min(w, h) * 0.34,
          turn = time * (0.22 + s.swirl * 0.003),
          ca = Math.cos(turn),
          sa = Math.sin(turn);

        ctx!.clearRect(0, 0, w, h);

        const tint = s.color || tones[s.palette] || tones.heather;

        const projected = points
          .map((p) => {
            const ripple =
              Math.sin(p.y * 6 + time * 2.8) * Math.cos(p.x * 4 - time * 1.9);
            const energy =
              (s.orbState === 'speaking'
                ? 0.13
                : s.orbState === 'thinking'
                  ? 0.065
                  : 0.02) *
              (s.distortion / 65);
            const radius = 1 + ripple * energy + 0.025 * Math.sin(time * 1.6);

            let x = (p.x * ca - p.z * sa) * radius,
              z = (p.x * sa + p.z * ca) * radius,
              y = p.y * radius;

            const twist = Math.sin(time * 0.5) * 0.25 + morph * 0.1,
              ct = Math.cos(twist),
              st = Math.sin(twist);
            const ny = y * ct - z * st;
            z = y * st + z * ct;
            y = ny;

            if (s.orbState === 'listening')
              x *= 1 + 0.035 * Math.sin(time * 4 + p.y * 5);

            const perspective = 3.6 / (3.6 - z * 0.3);
            return {
              x: w / 2 + x * size * perspective,
              y: h / 2 + y * size * perspective,
              z,
              i: p.i,
            };
          })
          .sort((a, b) => a.z - b.z);

        for (const p of projected) {
          const front = (p.z + 1) / 2,
            twinkle = 0.84 + 0.16 * Math.sin(time * 2 + p.i * 1.7);
          const alpha = (0.14 + 0.78 * front * front) * twinkle;
          const radius =
            Math.max(0.45, Math.min(1.65, size / 105)) * (0.5 + front * 0.65);

          ctx!.globalAlpha = alpha * (0.6 + s.intensity / 160);
          ctx!.fillStyle = p.i % 7 === 0 ? tint : '#f4f4f5';
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx!.fill();

          if (front > 0.87 && p.i % 13 === 0) {
            ctx!.globalAlpha = 0.09 * (s.glow / 65);
            ctx!.fillStyle = tint;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2);
            ctx!.fill();
          }
        }

        ctx!.globalAlpha = 1;
      }

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
}
