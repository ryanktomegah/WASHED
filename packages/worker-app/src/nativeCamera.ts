import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type VisitPhotoKind = 'after' | 'before';

export interface NativePhotoResult {
  readonly capturedAt: string;
  readonly path: string;
}

export async function captureVisitPhoto(kind: VisitPhotoKind): Promise<NativePhotoResult> {
  if (!isNativeRuntime()) {
    return {
      capturedAt: new Date().toISOString(),
      path: `web-fallback-${kind}-photo`,
    };
  }

  const photo = await Camera.getPhoto({
    allowEditing: false,
    correctOrientation: true,
    quality: 72,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });

  return {
    capturedAt: new Date().toISOString(),
    path: photo.webPath ?? photo.path ?? `native-${kind}-photo`,
  };
}

function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform();
}
