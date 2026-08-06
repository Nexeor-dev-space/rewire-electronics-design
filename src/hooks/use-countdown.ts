"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target time has passed. */
  isComplete: boolean;
}

function diff(target: Date): CountdownParts {
  const delta = target.getTime() - Date.now();
  if (delta <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }
  return {
    days: Math.floor(delta / 86_400_000),
    hours: Math.floor(delta / 3_600_000) % 24,
    minutes: Math.floor(delta / 60_000) % 60,
    seconds: Math.floor(delta / 1_000) % 60,
    isComplete: false,
  };
}

/**
 * Ticking countdown to a target date.
 * Hydration-safe: renders zeros on the server, starts ticking on mount.
 */
export function useCountdown(target: Date | string) {
  const [parts, setParts] = useState<CountdownParts>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isComplete: false,
  });

  useEffect(() => {
    const date = typeof target === "string" ? new Date(target) : target;
    setParts(diff(date));
    const id = setInterval(() => {
      const next = diff(date);
      setParts(next);
      if (next.isComplete) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return parts;
}
