import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { fromByteArray, toByteArray } from 'base64-js';

export const PHOTO_CHUNK_SIZE = 64 * 1024;
export const PHOTO_STREAM_ALGORITHM = 'AES-256-GCM';
export const PHOTO_STREAM_VERSION = 1;

export type PhotoStreamKey = Uint8Array;

export type EncryptedPhotoChunk = {
  version: 1;
  algorithm: typeof PHOTO_STREAM_ALGORITHM;
  iv: string;
  data: string;
};

export function bytesToBase64Url(bytes: Uint8Array) {
  return fromByteArray(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return toByteArray(base64);
}

export function importPhotoStreamKey(rawKey: string): PhotoStreamKey {
  const key = base64UrlToBytes(rawKey);
  if (key.byteLength !== 32) {
    throw new Error('Invalid photo stream key.');
  }
  return key;
}

function aad(transferId: string, photoId: string, chunkIndex: number, variant: string) {
  const value = `${transferId}:${photoId}:${chunkIndex}:${variant}`;
  return Uint8Array.from(value, character => character.charCodeAt(0));
}

export function encryptPhotoChunk(
  key: PhotoStreamKey,
  input: Uint8Array,
  context: { transferId: string; photoId: string; chunkIndex: number; variant: string },
): EncryptedPhotoChunk {
  const iv = randomBytes(12);
  const encrypted = gcm(key, iv, aad(context.transferId, context.photoId, context.chunkIndex, context.variant)).encrypt(input);
  return {
    version: PHOTO_STREAM_VERSION,
    algorithm: PHOTO_STREAM_ALGORITHM,
    iv: bytesToBase64Url(iv),
    data: bytesToBase64Url(encrypted),
  };
}

export function encryptPhotoChunkBytes(
  key: PhotoStreamKey,
  input: Uint8Array,
  context: { transferId: string; photoId: string; chunkIndex: number; variant: string },
) {
  const iv = randomBytes(12);
  const data = gcm(key, iv, aad(context.transferId, context.photoId, context.chunkIndex, context.variant)).encrypt(input);
  return { iv, data };
}
