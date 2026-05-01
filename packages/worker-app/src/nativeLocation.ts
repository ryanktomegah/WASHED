import { Capacitor } from '@capacitor/core';
import { Geolocation, type PermissionStatus } from '@capacitor/geolocation';

export type VisitLocationCheckpoint = 'checkIn' | 'checkOut';

export interface NativeLocationResult {
  readonly accuracyMeters: number;
  readonly capturedAt: string;
  readonly checkpoint: VisitLocationCheckpoint;
  readonly latitude: number;
  readonly longitude: number;
  readonly source: 'native' | 'web-fallback';
}

const DEMO_HOME_LOCATION = {
  latitude: 6.1319,
  longitude: 1.2228,
} as const;

export async function captureVisitLocation(
  checkpoint: VisitLocationCheckpoint,
): Promise<NativeLocationResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      accuracyMeters: checkpoint === 'checkIn' ? 12 : 18,
      capturedAt: new Date().toISOString(),
      checkpoint,
      latitude: DEMO_HOME_LOCATION.latitude,
      longitude: DEMO_HOME_LOCATION.longitude,
      source: 'web-fallback',
    };
  }

  await ensureLocationPermission();

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 12_000,
  });

  return {
    accuracyMeters: Math.round(position.coords.accuracy),
    capturedAt: new Date(position.timestamp).toISOString(),
    checkpoint,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    source: 'native',
  };
}

async function ensureLocationPermission(): Promise<void> {
  const current = await readLocationPermissions();

  if (current.location === 'granted') {
    return;
  }

  const requested = await Geolocation.requestPermissions({ permissions: ['location'] });

  if (requested.location !== 'granted') {
    throw new Error('Location permission is required for visit GPS proof.');
  }
}

async function readLocationPermissions(): Promise<PermissionStatus> {
  try {
    return await Geolocation.checkPermissions();
  } catch {
    return Geolocation.requestPermissions({ permissions: ['location'] });
  }
}
