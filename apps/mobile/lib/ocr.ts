/**
 * Mobile OCR: take/pick a photo, send it to the web /api/ocr route (session
 * cookie via authClient.$fetch — absolute URL, or better-auth prefixes
 * /api/auth), and upload the confirmed image to Convex storage.
 */
import * as ImagePicker from 'expo-image-picker';
import { authClient, AUTH_BASE_URL } from '@queenix/auth';
import type { OcrResult, ScanKind } from '@queenix/convex';

export type Photo = { uri: string; mimeType: string; fileName: string };

/** Camera or library → one JPEG-ish photo, or null if cancelled / not permitted. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<Photo | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(`Allow ${source} access in Settings to scan`);
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85 };
  const res =
    source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const a = res.canceled ? null : res.assets?.[0];
  if (!a) return null;
  if (a.fileSize && a.fileSize > 10 * 1024 * 1024) throw new Error('Photo is larger than 10 MB');
  return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? 'scan.jpg' };
}

export async function ocrScan(kind: ScanKind, photo: Photo): Promise<OcrResult> {
  const body = new FormData();
  body.append('kind', kind);
  // React Native FormData file part.
  body.append('file', { uri: photo.uri, name: photo.fileName, type: photo.mimeType } as any);
  const { data, error } = await authClient.$fetch<OcrResult>(`${AUTH_BASE_URL}/api/ocr`, { method: 'POST', body });
  if (error || !data) throw new Error((error as { error?: string } | null)?.error ?? 'Scan failed');
  return data;
}

/** Upload on confirm only; returns the Convex storageId. */
export async function uploadPhoto(generateUploadUrl: (a: {}) => Promise<string>, photo: Photo): Promise<any> {
  const url = await generateUploadUrl({});
  const blob = await (await fetch(photo.uri)).blob();
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': photo.mimeType }, body: blob });
  if (!res.ok) throw new Error('Image upload failed');
  return (await res.json()).storageId;
}
