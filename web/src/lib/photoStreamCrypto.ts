export const PHOTO_CHUNK_SIZE = 64 * 1024;
export const PHOTO_STREAM_ALGORITHM = "AES-256-GCM";
export const PHOTO_STREAM_VERSION = 1;

export type EncryptedPhotoChunk = {
  version: 1;
  algorithm: typeof PHOTO_STREAM_ALGORITHM;
  iv: string;
  data: string;
};

export type PhotoStreamKey = CryptoKey;

const encoder = new TextEncoder();

export function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function createPhotoStreamKey() {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return { key, rawKey: bytesToBase64Url(raw) };
}

export async function importPhotoStreamKey(rawKey: string) {
  return crypto.subtle.importKey("raw", base64UrlToBytes(rawKey), { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function aad(transferId: string, photoId: string, chunkIndex: number, variant: string) {
  return encoder.encode(`${transferId}:${photoId}:${chunkIndex}:${variant}`);
}

export async function encryptPhotoChunk(key: CryptoKey, input: Uint8Array, context: { transferId: string; photoId: string; chunkIndex: number; variant: string }): Promise<EncryptedPhotoChunk> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128, additionalData: aad(context.transferId, context.photoId, context.chunkIndex, context.variant) },
    key,
    asArrayBuffer(input),
  ));
  return { version: PHOTO_STREAM_VERSION, algorithm: PHOTO_STREAM_ALGORITHM, iv: bytesToBase64Url(iv), data: bytesToBase64Url(encrypted) };
}

export async function decryptPhotoChunk(key: CryptoKey, input: EncryptedPhotoChunk, context: { transferId: string; photoId: string; chunkIndex: number; variant: string }) {
  if (input.version !== PHOTO_STREAM_VERSION || input.algorithm !== PHOTO_STREAM_ALGORITHM) {
    throw new Error("Unsupported encrypted photo chunk.");
  }
  return new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(input.iv), tagLength: 128, additionalData: aad(context.transferId, context.photoId, context.chunkIndex, context.variant) },
    key,
    base64UrlToBytes(input.data),
  ));
}

export async function decryptPhotoChunkBytes(
  key: CryptoKey,
  input: { iv: Uint8Array; data: Uint8Array },
  context: { transferId: string; photoId: string; chunkIndex: number; variant: string },
) {
  return new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(input.iv), tagLength: 128, additionalData: aad(context.transferId, context.photoId, context.chunkIndex, context.variant) },
    key,
    asArrayBuffer(input.data),
  ));
}
