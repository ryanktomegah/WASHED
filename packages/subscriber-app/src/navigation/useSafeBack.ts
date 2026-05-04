import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function hasInAppBackStack(locationKey: string): boolean {
  const historyState =
    typeof window === 'undefined' ? undefined : (window.history.state as { idx?: unknown } | null);

  if (typeof historyState?.idx === 'number') {
    return historyState.idx > 0;
  }

  return locationKey !== 'default';
}

export function useSafeBack(fallbackPath: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (hasInAppBackStack(location.key)) {
      navigate(-1);
      return;
    }

    navigate(fallbackPath, { replace: true });
  }, [fallbackPath, location.key, navigate]);
}
