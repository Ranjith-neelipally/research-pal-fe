import * as RNFS from '@dr.pogodin/react-native-fs';
import { toByteArray } from 'base64-js';
import { Alert } from 'react-native';
import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';
import api, { API_BASE_URL, getDeviceIdentity } from './api';
import { importPhotoStreamKey, encryptPhotoChunkBytes, bytesToBase64Url, PHOTO_CHUNK_SIZE } from './photoStreamCrypto';
import { getAvailablePhotoIdsForStreaming, getPhotoByIdForStreaming, subscribeLocalPhotoInventoryChanges } from '../localStorage';
import { getWebPhotoAccessPreference } from './settings';
import { useAuthStore } from '../store/auth.store';

type PeerConnectionConstructor = new (configuration: Record<string, unknown>) => any;

type SignalMessage = {
  id: string;
  fromDeviceId: string;
  type: 'photo-access-request' | 'photo-access-response' | 'photo-manifest-changed' | 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'error';
  payload: any;
};

type SessionSignalPayload = {
  connectionId?: string;
  senderDeviceId?: string;
  targetDeviceId?: string;
};

type PhotoRequest = {
  type: 'PHOTO_REQUEST';
  transferId: string;
  photoId: string;
  accessSessionId?: string;
  requestedVariant: 'thumbnail' | 'original';
  streamKey?: string;
  encryptionMode?: 'aes-gcm' | 'none';
  clientSentAt?: number;
};

let running = false;
let warnedAboutMissingRuntime = false;
let signalStreamRequest: XMLHttpRequest | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let activeConnectionId: string | null = null;
let reconnectAttempts = 0;
let signalHandlingQueue = Promise.resolve();
let unsubscribePhotoInventoryChanges: (() => void) | null = null;
const peers = new Map<string, any>();
const peerConnectionOwners = new Map<string, string>();
const pendingRemoteCandidates = new Map<string, any[]>();
const authorizedPhotoAccessPeers = new Map<string, string>();
const MAX_ACTIVE_PHOTO_PEERS = 2;
let lastDeviceRegistrationAt = 0;

function photoSignalLog(message: string, details?: Record<string, unknown>) {
  if (__DEV__) console.log(`[PHOTO SIGNAL] ${message}`, details || '');
}

function photoManifestLog(message: string, details?: Record<string, unknown>) {
  if (__DEV__) console.log(`[PHOTO MANIFEST] ${message}`, details || '');
}

function peerState(peer: any) {
  return {
    connectionState: peer?.connectionState,
    iceConnectionState: peer?.iceConnectionState,
    signalingState: peer?.signalingState,
  };
}

function isPeerClosed(peer: any) {
  const state = peerState(peer);
  return (
    state.connectionState === 'closed' ||
    state.iceConnectionState === 'closed' ||
    state.signalingState === 'closed'
  );
}

function getAuthState() {
  const user = useAuthStore.getState().getUser();
  return {
    authenticated: Boolean(user?.token),
    userId: user?._id || null,
  };
}

function isAuthFailure(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; code?: string; isAuthError?: boolean };
  return Boolean(
    candidate.isAuthError ||
    candidate.status === 401 ||
    candidate.code === 'UNAUTHORIZED' ||
    candidate.code === 'TOKEN_EXPIRED' ||
    candidate.code === 'INVALID_TOKEN',
  );
}

function getPeerConnectionConstructor() {
  const candidate = RTCPeerConnection;
  return typeof candidate === 'function' ? candidate as PeerConnectionConstructor : null;
}

function webRtcIsAvailable() {
  return Boolean(getPeerConnectionConstructor());
}

async function sendSignal(toDeviceId: string, type: SignalMessage['type'], payload: unknown, photoId?: string) {
  if (__DEV__) console.log(`[PHOTO SIGNAL] send ${type}`);
  await api.post('/photos/signals', {
    toDeviceId,
    type,
    photoId,
    payload,
  });
}

function manifestVersionForPhotoIds(photoIds: string[]) {
  return `${photoIds.length}:${photoIds.slice().sort().join('|')}`;
}

function payloadConnectionId(payload: unknown) {
  return payload && typeof payload === 'object' && typeof (payload as SessionSignalPayload).connectionId === 'string'
    ? (payload as SessionSignalPayload).connectionId
    : null;
}

function plainSignalPayload(payload: object) {
  const serializable = typeof (payload as { toJSON?: () => object }).toJSON === 'function'
    ? (payload as { toJSON: () => object }).toJSON()
    : payload;
  return {
    ...(serializable as Record<string, unknown>),
    type: (serializable as { type?: unknown }).type,
    sdp: (serializable as { sdp?: unknown }).sdp,
    candidate: (serializable as { candidate?: unknown }).candidate,
    sdpMid: (serializable as { sdpMid?: unknown }).sdpMid,
    sdpMLineIndex: (serializable as { sdpMLineIndex?: unknown }).sdpMLineIndex,
    usernameFragment: (serializable as { usernameFragment?: unknown }).usernameFragment,
  };
}

function sessionSignalPayload(message: SignalMessage, payload: object) {
  const connectionId = payloadConnectionId(message.payload);
  return {
    ...plainSignalPayload(payload),
    ...(connectionId ? { connectionId } : {}),
    senderDeviceId: message.payload?.targetDeviceId,
    targetDeviceId: message.payload?.senderDeviceId || message.fromDeviceId,
  };
}

async function addIceCandidateIfActive(connectionId: string, peer: any, candidate: any) {
  if (!peer || isPeerClosed(peer) || peers.get(connectionId) !== peer) {
    photoSignalLog('ignoring candidate', { reason: 'peer-closed-or-replaced', connectionId, ...peerState(peer) });
    return;
  }
  try {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    if (isPeerClosed(peer) || peers.get(connectionId) !== peer) {
      photoSignalLog('ignoring candidate', {
        reason: 'peer-closed-during-add',
        connectionId,
        error: error instanceof Error ? error.message : String(error),
        ...peerState(peer),
      });
      return;
    }
    throw error;
  }
}

async function sendPhotoAccessDecision(toDeviceId: string, sessionId: string, decision: 'approved' | 'rejected', reason?: string) {
  if (decision === 'approved') authorizedPhotoAccessPeers.set(toDeviceId, sessionId);
  if (decision === 'rejected') authorizedPhotoAccessPeers.delete(toDeviceId);
  try {
    await sendSignal(toDeviceId, 'photo-access-response', { sessionId, decision, reason });
  } catch (error) {
    if (__DEV__) console.error('Photo access response failed', error);
  }
}

async function registerDevice(options: { force?: boolean } = {}) {
  const now = Date.now();
  if (!options.force && now - lastDeviceRegistrationAt < 5000) return null;
  lastDeviceRegistrationAt = now;
  const availablePhotoIds = await getAvailablePhotoIdsForStreaming();
  const manifestVersion = manifestVersionForPhotoIds(availablePhotoIds);
  await api.post('/photos/devices', {
    clientType: 'mobile',
    availablePhotoIds,
    manifestVersion,
  });
  photoManifestLog('registered', {
    manifestVersion,
    photoCount: availablePhotoIds.length,
  });
  return { availablePhotoIds, manifestVersion };
}

async function publishPhotoManifestChanged() {
  if (!running) return;
  const manifest = await registerDevice({ force: true });
  if (!manifest) return;
  let devices: Array<{ deviceId: string; clientType: string; available?: boolean }> = [];
  try {
    const response = await api.get('/photos/devices');
    devices = response.data?.devices || [];
  } catch (error) {
    if (__DEV__) console.error('[PHOTO MANIFEST] unable to load devices for invalidation', error);
    return;
  }
  const webDevices = devices.filter(device => device.clientType === 'web' && device.available);
  await Promise.all(webDevices.map(device => sendSignal(device.deviceId, 'photo-manifest-changed', {
    manifestVersion: manifest.manifestVersion,
    photoCount: manifest.availablePhotoIds.length,
  }).catch(error => {
    if (__DEV__) console.error('[PHOTO MANIFEST] notify failed', error);
  })));
  photoManifestLog('changed', {
    manifestVersion: manifest.manifestVersion,
    photoCount: manifest.availablePhotoIds.length,
    webDeviceCount: webDevices.length,
  });
}

function clearReconnectTimer() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function parseSseMessages(buffer: string) {
  const messages: SignalMessage[] = [];
  const events = buffer.split(/\n\n/);
  const remaining = events.pop() || '';

  for (const event of events) {
    const dataLines = event
      .split(/\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart());
    if (!dataLines.length) continue;
    try {
      messages.push(JSON.parse(dataLines.join('\n')) as SignalMessage);
    } catch (error) {
      if (__DEV__) console.error('[PHOTO SIGNAL] malformed event', error);
    }
  }

  return { messages, remaining };
}

function sendJson(channel: any, payload: unknown) {
  if (__DEV__ && typeof payload === 'object' && payload && 'type' in payload && (payload as { type: string }).type !== 'PHOTO_CHUNK') {
    console.log(`[WEBRTC PHOTO] ${(payload as { type: string }).type}`);
  }
  channel.send(JSON.stringify(payload));
}

function logPhotoPerf(label: string, payload: Record<string, unknown>) {
  if (__DEV__) console.log(`PHOTO PERF ${label} ${JSON.stringify(payload)}`);
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function waitForBufferedChannel(channel: any) {
  const highWaterMark = 2 * 1024 * 1024;
  while (Number(channel.bufferedAmount || 0) > highWaterMark) {
    await new Promise<void>(resolve => setTimeout(resolve, 10));
  }
}

async function sendBinary(channel: any, bytes: Uint8Array) {
  await waitForBufferedChannel(channel);
  channel.send(toArrayBuffer(bytes));
}

async function streamPhoto(channel: any, request: PhotoRequest) {
  const peerDeviceId = channel.__researchPalPeerDeviceId as string | undefined;
  const approvedSessionId = peerDeviceId ? authorizedPhotoAccessPeers.get(peerDeviceId) : undefined;
  if (!request.accessSessionId || !approvedSessionId || request.accessSessionId !== approvedSessionId) {
    sendJson(channel, { type: 'PHOTO_ERROR', transferId: request.transferId, photoId: request.photoId, code: 'PHOTO_ACCESS_NOT_APPROVED' });
    return;
  }

  const timings: Record<string, number> = { mobileReceivedAt: Date.now() };
  logPhotoPerf('request-received', {
    photoId: request.photoId,
    transferId: request.transferId,
    requestedVariant: request.requestedVariant,
  });
  const stored = await getPhotoByIdForStreaming(request.photoId);
  if (!stored) {
    logPhotoPerf('local-file-missing', { photoId: request.photoId, transferId: request.transferId, reason: 'metadata-missing' });
    sendJson(channel, { type: 'PHOTO_ERROR', transferId: request.transferId, photoId: request.photoId, code: 'PHOTO_MISSING_LOCALLY' });
    return;
  }

  try {
    await api.get('/photos', { params: { photoId: request.photoId } });
  } catch {
    sendJson(channel, { type: 'PHOTO_ERROR', transferId: request.transferId, photoId: request.photoId, code: 'PHOTO_NOT_AUTHORIZED' });
    return;
  }

  const exists = await RNFS.exists(stored.location);
  if (!exists) {
    logPhotoPerf('local-file-missing', { photoId: request.photoId, transferId: request.transferId, location: stored.location });
    sendJson(channel, { type: 'PHOTO_ERROR', transferId: request.transferId, photoId: request.photoId, code: 'PHOTO_MISSING_LOCALLY' });
    return;
  }
  logPhotoPerf('local-file-found', { photoId: request.photoId, transferId: request.transferId, location: stored.location });

  const fileReadStart = Date.now();
  const stat = await RNFS.stat(stored.location);
  const totalBytes = Number(stat.size || 0);
  const totalChunks = Math.ceil(totalBytes / PHOTO_CHUNK_SIZE);
  timings.fileReadStart = fileReadStart;
  timings.fileReadFinished = Date.now();
  const key = request.encryptionMode === 'none' ? null : importPhotoStreamKey(request.streamKey || '');

  sendJson(channel, {
    type: 'PHOTO_START',
    transferId: request.transferId,
    photoId: request.photoId,
    mimeType: 'image/jpeg',
    totalBytes,
    totalChunks,
    variant: request.requestedVariant,
    encryptionMode: request.encryptionMode || 'aes-gcm',
    clientSentAt: request.clientSentAt,
    mobileReceivedAt: timings.mobileReceivedAt,
    fileReadStart: timings.fileReadStart,
    fileReadFinished: timings.fileReadFinished,
  });

  let encryptionMs = 0;
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const offset = chunkIndex * PHOTO_CHUNK_SIZE;
    const length = Math.min(PHOTO_CHUNK_SIZE, totalBytes - offset);
    const base64 = await RNFS.read(stored.location, length, offset, 'base64');
    const bytes = toByteArray(base64);
    const encryptStart = Date.now();
    const encryptedChunk = key
      ? encryptPhotoChunkBytes(key, bytes, {
        transferId: request.transferId,
        photoId: request.photoId,
        chunkIndex,
        variant: request.requestedVariant,
      })
      : null;
    const payloadBytes = encryptedChunk?.data || bytes;
    encryptionMs += Date.now() - encryptStart;
    if (chunkIndex === 0) timings.firstChunkSent = Date.now();
    if (chunkIndex === 0) {
      logPhotoPerf('first-chunk-sent', {
        photoId: request.photoId,
        transferId: request.transferId,
        totalBytes,
        totalChunks,
      });
    }
    sendJson(channel, {
      type: 'PHOTO_CHUNK',
      transferId: request.transferId,
      photoId: request.photoId,
      chunkIndex,
      byteLength: payloadBytes.byteLength,
      iv: encryptedChunk?.iv ? bytesToBase64Url(encryptedChunk.iv) : undefined,
    });
    await sendBinary(channel, payloadBytes);
  }

  timings.lastChunkSent = Date.now();
  sendJson(channel, { type: 'PHOTO_END', transferId: request.transferId, photoId: request.photoId, encryptionMs, ...timings });
  logPhotoPerf('complete', {
    photoId: request.photoId,
    transferId: request.transferId,
    mode: request.encryptionMode || 'aes-gcm',
    photoSizeKB: Math.round(totalBytes / 1024),
    requestToMobileReceivedMs: request.clientSentAt ? timings.mobileReceivedAt - request.clientSentAt : null,
    fileReadMs: timings.fileReadFinished - timings.fileReadStart,
    encryptionMs,
    timeToFirstChunkMs: timings.firstChunkSent ? timings.firstChunkSent - timings.mobileReceivedAt : null,
    chunkSendMs: timings.lastChunkSent && timings.firstChunkSent ? timings.lastChunkSent - timings.firstChunkSent : null,
    mobileTotalMs: timings.lastChunkSent - timings.mobileReceivedAt,
  });
}

async function handleOffer(message: SignalMessage) {
  const connectionId = payloadConnectionId(message.payload);
  if (!connectionId) {
    await sendSignal(message.fromDeviceId, 'error', { code: 'MISSING_CONNECTION_ID' });
    return;
  }
  if (!authorizedPhotoAccessPeers.has(message.fromDeviceId)) {
    await sendSignal(message.fromDeviceId, 'error', sessionSignalPayload(message, { code: 'PHOTO_ACCESS_NOT_APPROVED' }));
    return;
  }
  const PeerConnection = getPeerConnectionConstructor();
  if (!PeerConnection) {
    await sendSignal(message.fromDeviceId, 'error', sessionSignalPayload(message, { code: 'WEBRTC_UNAVAILABLE' }));
    return;
  }
  if (peers.size >= MAX_ACTIVE_PHOTO_PEERS && !peers.has(connectionId)) {
    await sendSignal(message.fromDeviceId, 'error', sessionSignalPayload(message, { code: 'PHOTO_STREAM_BUSY' }));
    return;
  }
  const queuedCandidates = pendingRemoteCandidates.get(connectionId) || [];
  peers.get(connectionId)?.close();
  const peer = new PeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  peers.set(connectionId, peer);
  peerConnectionOwners.set(connectionId, message.fromDeviceId);
  pendingRemoteCandidates.set(connectionId, queuedCandidates);

  peer.ondatachannel = (event: any) => {
    if (__DEV__) console.log('Photo streaming data channel received');
    const channel = event.channel;
    channel.__researchPalPeerDeviceId = message.fromDeviceId;
    let transferQueue = Promise.resolve();
    channel.onopen = () => {
      if (__DEV__) console.log('Photo streaming data channel opened');
      sendJson(channel, { type: 'PHOTO_READY', sentAt: Date.now() });
    };
    channel.onmessage = (incoming: any) => {
      transferQueue = transferQueue.then(async () => {
        try {
          const request = JSON.parse(String(incoming.data)) as PhotoRequest;
          if (__DEV__) console.log('Photo streaming request received', { photoId: request.photoId, requestedVariant: request.requestedVariant });
          if (request.type !== 'PHOTO_REQUEST') {
            sendJson(channel, { type: 'PHOTO_ERROR', code: 'MALFORMED_REQUEST' });
            return;
          }
          await streamPhoto(channel, request);
        } catch {
          sendJson(channel, { type: 'PHOTO_ERROR', code: 'TRANSFER_FAILED' });
        }
      });
    };
  };

  peer.onicecandidate = (event: any) => {
    if (event.candidate) void sendSignal(message.fromDeviceId, 'ice-candidate', sessionSignalPayload(message, event.candidate.toJSON?.() || event.candidate));
  };
  peer.onconnectionstatechange = () => {
    if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
      if (peers.get(connectionId) === peer) {
        peers.delete(connectionId);
        peerConnectionOwners.delete(connectionId);
        pendingRemoteCandidates.delete(connectionId);
      }
    }
  };

  await peer.setRemoteDescription(new RTCSessionDescription(message.payload));
  pendingRemoteCandidates.set(connectionId, []);
  for (const candidate of queuedCandidates) {
    await addIceCandidateIfActive(connectionId, peer, candidate);
  }
  if (isPeerClosed(peer) || peers.get(connectionId) !== peer) {
    photoSignalLog('offer abandoned before answer', { connectionId, ...peerState(peer) });
    return;
  }
  const answer = await peer.createAnswer();
  const localDescription = new RTCSessionDescription(answer);
  await peer.setLocalDescription(localDescription);
  await sendSignal(message.fromDeviceId, 'answer', sessionSignalPayload(message, localDescription));
}

async function handlePhotoAccessRequest(message: SignalMessage) {
  photoSignalLog('received access request', { fromDeviceId: message.fromDeviceId });
  const sessionId = typeof message.payload?.sessionId === 'string' ? message.payload.sessionId : '';
  if (!sessionId) return;

  const preference = await getWebPhotoAccessPreference();
  if (preference === 'reject') {
    await sendPhotoAccessDecision(message.fromDeviceId, sessionId, 'rejected', 'disabled');
    return;
  }
  if (preference === 'allow') {
    await sendPhotoAccessDecision(message.fromDeviceId, sessionId, 'approved');
    if (__DEV__) console.log('Sharing photos with ResearchPal Web');
    return;
  }

  Alert.alert(
    'Web photo access',
    'ResearchPal Web wants to view photos stored on this device.\n\nPhotos will be transferred directly to your signed-in ResearchPal web session.',
    [
      {
        text: 'Reject',
        style: 'cancel',
        onPress: () => {
          void sendPhotoAccessDecision(message.fromDeviceId, sessionId, 'rejected');
        },
      },
      {
        text: 'Allow',
        onPress: () => {
          void sendPhotoAccessDecision(message.fromDeviceId, sessionId, 'approved');
        },
      },
    ],
    { cancelable: false },
  );
}

async function handleSignalMessage(message: SignalMessage) {
  if (__DEV__) console.log(`[PHOTO SIGNAL] received ${message.type}`);
  if (message.type === 'photo-access-request') await handlePhotoAccessRequest(message);
  if (message.type === 'offer') await handleOffer(message);
  if (message.type === 'ice-candidate') {
    const connectionId = payloadConnectionId(message.payload);
    if (!connectionId) return;
    const peer = peers.get(connectionId);
    if (peer && peerConnectionOwners.get(connectionId) !== message.fromDeviceId) {
      photoSignalLog('ignoring candidate', { reason: 'owner-mismatch', connectionId, fromDeviceId: message.fromDeviceId });
      return;
    }
    if (peer?.remoteDescription) {
      await addIceCandidateIfActive(connectionId, peer, message.payload);
    } else {
      const queuedCandidates = pendingRemoteCandidates.get(connectionId) || [];
      queuedCandidates.push(message.payload);
      pendingRemoteCandidates.set(connectionId, queuedCandidates);
    }
  }
  if (message.type === 'hangup') {
    const connectionId = payloadConnectionId(message.payload);
    if (!connectionId) return;
    peers.get(connectionId)?.close();
    peers.delete(connectionId);
    peerConnectionOwners.delete(connectionId);
    pendingRemoteCandidates.delete(connectionId);
  }
}

function enqueueSignalMessage(message: SignalMessage) {
  signalHandlingQueue = signalHandlingQueue
    .then(() => handleSignalMessage(message))
    .catch(error => {
      if (__DEV__) console.error('[PHOTO SIGNAL] message handling failed', error);
    });
}

function scheduleReconnect(connectionId: string, reason: string) {
  if (!running || connectionId !== activeConnectionId || reconnectTimer) return;
  reconnectAttempts += 1;
  const delayMs = Math.min(30_000, 1_000 * 2 ** Math.min(reconnectAttempts - 1, 5));
  photoSignalLog('reconnecting', { reason, attempt: reconnectAttempts, delayMs });
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void openSignalStream(connectionId);
  }, delayMs);
}

async function openSignalStream(connectionId: string) {
  if (!running || connectionId !== activeConnectionId) return;
  const authState = getAuthState();
  if (!authState.authenticated) {
    stopMobilePhotoStreaming('unauthenticated');
    return;
  }
  if (!webRtcIsAvailable()) {
    if (__DEV__ && !warnedAboutMissingRuntime) {
      warnedAboutMissingRuntime = true;
      console.warn('Photo streaming is unavailable: this React Native build does not provide RTCPeerConnection.');
    }
    stopMobilePhotoStreaming('webrtc-unavailable');
    return;
  }

  try {
    await registerDevice();
    if (!running || connectionId !== activeConnectionId) return;

    const user = useAuthStore.getState().getUser();
    const token = user?.token;
    if (!token) {
      stopMobilePhotoStreaming('unauthenticated');
      return;
    }

    const device = await getDeviceIdentity();
    const streamUrl = `${API_BASE_URL}photos/signals/stream?deviceId=${encodeURIComponent(device.id)}`;
    signalStreamRequest?.abort();
    const request = new XMLHttpRequest();
    signalStreamRequest = request;
    let processedLength = 0;
    let pendingBuffer = '';

    request.open('GET', streamUrl, true);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.setRequestHeader('Accept', 'text/event-stream');
    request.setRequestHeader('Cache-Control', 'no-cache');
    request.setRequestHeader('X-Client-Type', 'mobile');
    request.setRequestHeader('X-Device-Id', device.id);
    request.setRequestHeader('X-Device-Model', device.model);
    request.setRequestHeader('X-Device-Platform', device.platform);
    request.setRequestHeader('X-Device-Os-Version', device.osVersion);

    request.onreadystatechange = () => {
      if (!running || connectionId !== activeConnectionId) return;
      if (request.readyState === request.HEADERS_RECEIVED) {
        if (request.status === 401 || request.status === 403) {
          request.abort();
          signalStreamRequest = null;
          stopMobilePhotoStreaming('unauthorized');
          return;
        }
        if (request.status >= 200 && request.status < 300) {
          reconnectAttempts = 0;
          photoSignalLog('connected');
        }
      }

      if (request.readyState === request.LOADING || request.readyState === request.DONE) {
        const chunk = request.responseText.slice(processedLength);
        processedLength = request.responseText.length;
        const parsed = parseSseMessages(`${pendingBuffer}${chunk}`);
        pendingBuffer = parsed.remaining;
        parsed.messages.forEach(enqueueSignalMessage);
      }

      if (request.readyState === request.DONE && running && connectionId === activeConnectionId) {
        signalStreamRequest = null;
        if (request.status === 401 || request.status === 403) {
          stopMobilePhotoStreaming('unauthorized');
          return;
        }
        scheduleReconnect(connectionId, 'stream-closed');
      }
    };
    request.onerror = () => {
      if (!running || connectionId !== activeConnectionId) return;
      signalStreamRequest = null;
      if (request.status === 401 || request.status === 403) {
        stopMobilePhotoStreaming('unauthorized');
        return;
      }
      scheduleReconnect(connectionId, 'stream-error');
    };
    request.send();
  } catch (error) {
    if (isAuthFailure(error)) {
      stopMobilePhotoStreaming('unauthorized');
      return;
    }
    if (__DEV__) console.error('[PHOTO SIGNAL] stream setup failed', error);
    scheduleReconnect(connectionId, 'setup-error');
  }
}

export function startMobilePhotoStreaming() {
  const authState = getAuthState();
  if (!authState.authenticated) {
    photoSignalLog('stopped', { reason: 'unauthenticated', authState });
    return;
  }
  if (running) {
    photoSignalLog('already active', { authState });
    return;
  }
  if (!webRtcIsAvailable()) {
    if (__DEV__ && !warnedAboutMissingRuntime) {
      warnedAboutMissingRuntime = true;
      console.warn('Photo streaming is unavailable: this React Native build does not provide RTCPeerConnection.');
    }
    photoSignalLog('stopped', { reason: 'webrtc-unavailable', authState });
    return;
  }
  running = true;
  if (!unsubscribePhotoInventoryChanges) {
    unsubscribePhotoInventoryChanges = subscribeLocalPhotoInventoryChanges(publishPhotoManifestChanged);
  }
  activeConnectionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  reconnectAttempts = 0;
  photoSignalLog('starting', { authState });
  void openSignalStream(activeConnectionId);
}

export function stopMobilePhotoStreaming(reason = 'service-stop') {
  const authState = getAuthState();
  photoSignalLog('stopped', { reason, authState });
  photoSignalLog(`reason=${reason}`);
  running = false;
  unsubscribePhotoInventoryChanges?.();
  unsubscribePhotoInventoryChanges = null;
  clearReconnectTimer();
  signalStreamRequest?.abort();
  signalStreamRequest = null;
  activeConnectionId = null;
  reconnectAttempts = 0;
  signalHandlingQueue = Promise.resolve();
  peers.forEach(peer => peer.close());
  peers.clear();
  peerConnectionOwners.clear();
  pendingRemoteCandidates.clear();
  authorizedPhotoAccessPeers.clear();
}
