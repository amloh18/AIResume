'use client';

import { useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { gsap } from 'gsap';

// Register GSAP as the animation engine
if (typeof window !== 'undefined') {
  gsap.config({ nullTargetWarn: false });
}

/**
 * Hook for GSAP animations with cleanup
 */
export function useGSAP<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const animationsRef = useRef<gsap.core.Tween[]>([]);

  const animate = useCallback((
    target: T | string | null,
    vars: gsap.TweenVars,
    deps: unknown[] = []
  ) => {
    if (!target) return;
    const tween = gsap.to(target, vars);
    animationsRef.current.push(tween);
    return tween;
  }, []);

  const fadeIn = useCallback((
    target: T | string | null,
    duration = 0.4,
    vars?: gsap.TweenVars
  ) => {
    if (!target) return;
    return animate(target, { opacity: 1, duration, ease: 'power2.out', ...vars });
  }, [animate]);

  const fadeOut = useCallback((
    target: T | string | null,
    duration = 0.3,
    vars?: gsap.TweenVars
  ) => {
    if (!target) return;
    return animate(target, { opacity: 0, duration, ease: 'power2.in', ...vars });
  }, [animate]);

  const slideIn = useCallback((
    target: T | string | null,
    direction: 'left' | 'right' | 'up' | 'down' = 'left',
    duration = 0.5,
    vars?: gsap.TweenVars
  ) => {
    if (!target) return;
    const xFrom = direction === 'left' ? -30 : direction === 'right' ? 30 : 0;
    const yFrom = direction === 'up' ? -30 : direction === 'down' ? 30 : 0;
    return gsap.fromTo(target,
      { x: xFrom, y: yFrom, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration, ease: 'power3.out', ...vars }
    );
  }, []);

  const slideOut = useCallback((
    target: T | string | null,
    direction: 'left' | 'right' | 'up' | 'down' = 'right',
    duration = 0.3,
    vars?: gsap.TweenVars
  ) => {
    if (!target) return;
    const xTo = direction === 'left' ? -30 : direction === 'right' ? 30 : 0;
    const yTo = direction === 'up' ? -30 : direction === 'down' ? 30 : 0;
    return animate(target, { x: xTo, y: yTo, opacity: 0, duration, ease: 'power2.in', ...vars });
  }, [animate]);

  const scaleIn = useCallback((
    target: T | string | null,
    duration = 0.4,
    vars?: gsap.TweenVars
  ) => {
    if (!target) return;
    return gsap.fromTo(target,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration, ease: 'back.out(1.2)', ...vars }
    );
  }, []);

  const scaleOut = useCallback((
    target: T | string | null,
    duration = 0.3,
    vars?: gsap.TweenVars
  ) => {
    if (!target) return;
    return animate(target, { scale: 0.9, opacity: 0, duration, ease: 'power2.in', ...vars });
  }, [animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationsRef.current.forEach(tween => tween.kill());
      timelineRef.current?.kill();
    };
  }, []);

  return {
    ref,
    animate,
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    scaleIn,
    scaleOut,
    timeline: timelineRef,
  };
}

/**
 * Smooth scroll to element using GSAP
 */
export function smoothScrollTo(
  target: HTMLElement | string,
  options: {
    offset?: number;
    duration?: number;
    ease?: string;
    onComplete?: () => void;
  } = {}
) {
  const { offset = 0, duration = 0.6, ease = 'power2.inOut', onComplete } = options;
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return;

  const y = element.getBoundingClientRect().top + window.scrollY + offset;
  gsap.to(window, {
    scrollTo: { y, autoKill: true },
    duration,
    ease,
    onComplete,
  });
}

/**
 * Animate element entrance with a stagger effect
 */
export function staggerIn(
  targets: HTMLElement[] | string,
  options: {
    stagger?: number;
    duration?: number;
    ease?: string;
    y?: number;
    x?: number;
    scale?: number;
  } = {}
) {
  const { stagger = 0.08, duration = 0.5, ease = 'power3.out', y = 20, x = 0, scale } = options;

  const fromVars: gsap.TweenVars = { opacity: 0 };
  if (y) fromVars.y = y;
  if (x) fromVars.x = x;
  if (scale) fromVars.scale = scale;

  return gsap.fromTo(targets, fromVars, {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    stagger,
    duration,
    ease,
  });
}

/**
 * Create a GSAP timeline for complex animations
 */
export function createTimeline(vars?: gsap.TimelineVars) {
  return gsap.timeline(vars);
}
