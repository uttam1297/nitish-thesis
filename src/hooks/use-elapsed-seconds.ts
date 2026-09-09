"use client";

import { useCallback, useEffect, useState } from "react";

export function useElapsedSeconds(
  active: boolean
): readonly [number, () => void] {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(
      () => setSeconds((value) => value + 1),
      1000
    );
    return () => window.clearInterval(timer);
  }, [active]);

  const reset = useCallback(() => setSeconds(0), []);

  return [seconds, reset] as const;
}
