import { useEffect, useRef } from "react";

/**
 * Hook that returns the previous value of a variable
 * Useful for comparing previous and current state
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
