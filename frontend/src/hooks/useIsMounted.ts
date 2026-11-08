import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Hook to safely detect if component has mounted on the client.
 * Returns `false` during SSR and initial hydration, and `true` once mounted on client.
 * Fully compatible with React 19 and Next.js with zero hydration mismatches.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

