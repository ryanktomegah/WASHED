import { useCallback, useEffect, useState } from 'react';

// X-09 first-session tour persists its "completed" flag in localStorage so
// the tour shows once per device. Server-backed user accounts are out of
// scope for this sprint; once auth ships, the flag should move to the
// account record. We deliberately avoid useSyncExternalStore here — the
// flag is mutated only from inside this hook, so the local useState is
// the source of truth and reads stay in sync.

const STORAGE_KEY = 'washed.x09.completed';

function readCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Safari Private Browsing throws on localStorage writes — treat as
    // "not completed" rather than crashing the hub.
    return false;
  }
}

function writeCompleted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* swallow private-mode quota errors */
  }
}

export interface TourState {
  readonly isOpen: boolean;
  readonly dismiss: () => void;
}

export function useTourState(): TourState {
  const [isOpen, setIsOpen] = useState<boolean>(() => !readCompleted());

  const dismiss = useCallback(() => {
    writeCompleted();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    // Re-check on mount after hydration in case another tab/window
    // completed the tour between SSR and client mount. (No SSR today,
    // but keeps the hook portable.)
    if (readCompleted() && isOpen) setIsOpen(false);
  }, [isOpen]);

  return { isOpen, dismiss };
}

export const TOUR_STORAGE_KEY = STORAGE_KEY;
