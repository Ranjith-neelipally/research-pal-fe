import { useEffect, useState, type ReactNode } from "react";

/** Renders children only after mount to avoid SSR hydration mismatches
 *  for time-zone / locale-dependent content. */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
