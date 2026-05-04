import type { AuthSession, AuthStorage } from '@washed/auth';

export function createBrowserAuthStorage(storageKey: string): AuthStorage {
  return {
    get(): AuthSession | null {
      if (typeof window === 'undefined') return null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw === null) return null;
        return JSON.parse(raw) as AuthSession;
      } catch {
        return null;
      }
    },

    set(session: AuthSession): void {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
      } catch {
        // ignore quota / private mode
      }
    },

    clear(): void {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    },
  };
}
