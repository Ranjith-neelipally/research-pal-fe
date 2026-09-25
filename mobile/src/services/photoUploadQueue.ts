import * as RNFS from '@dr.pogodin/react-native-fs';
import { initializeOfflineSyncFoundation } from '../sync';
import { executeSyncSql } from '../sync/sqlite/database';
import { updateLocalPhotoUploadStatus, upsertLocalPhotoRecord, type StoredPhoto } from '../localStorage';
import { uploadPhoto } from './Photos';
import { conditionsAllowUpload, schedulePhotoUploadWork, withPhotoUploadBackgroundTask } from './photoUploadScheduler';

export type PhotoUploadQueueItem = {
  photoId: string;
  idempotencyKey: string;
  localPath: string;
  originalName?: string;
  mimeType?: string;
  projectId: string;
  plotId: string;
  noteId?: string;
  capturedAt: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed' | 'missing_local';
  retryCount: number;
};

export type PhotoUploadEvent =
  | { type: 'queued'; count: number; photoIds: string[] }
  | { type: 'uploading'; current: number; total: number }
  | { type: 'complete'; total: number }
  | { type: 'failed'; failed: number; total: number };

type QueuePhotoInput = {
  photo: StoredPhoto;
  projectId: string;
  plotId: string;
  noteId?: string;
  capturedAt?: string;
};

const listeners = new Set<(event: PhotoUploadEvent) => void>();
let processing = false;
let initialized = false;

export function subscribePhotoUploadEvents(listener: (event: PhotoUploadEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(event: PhotoUploadEvent) {
  listeners.forEach(listener => listener(event));
}

async function ensureQueueReady() {
  if (!initialized) {
    await initializeOfflineSyncFoundation();
    await executeSyncSql(
      `UPDATE photo_upload_queue
       SET status = 'pending', updated_at = ?
       WHERE status = 'uploading';`,
      [new Date().toISOString()],
    );
    initialized = true;
  }
}

function mapRow(row: Record<string, unknown>): PhotoUploadQueueItem {
  return {
    photoId: String(row.photo_id),
    idempotencyKey: String(row.idempotency_key),
    localPath: String(row.local_path),
    originalName: row.original_name ? String(row.original_name) : undefined,
    mimeType: row.mime_type ? String(row.mime_type) : undefined,
    projectId: String(row.project_id),
    plotId: String(row.plot_id),
    noteId: row.note_id ? String(row.note_id) : undefined,
    capturedAt: String(row.captured_at),
    status: String(row.status) as PhotoUploadQueueItem['status'],
    retryCount: Number(row.retry_count || 0),
  };
}

export async function enqueuePhotoUploads(items: QueuePhotoInput[]) {
  await ensureQueueReady();
  const now = new Date().toISOString();
  const queuedIds: string[] = [];
  for (const item of items) {
    if (item.photo.remoteUrl || item.photo.cloudPhoto) continue;
    await executeSyncSql(
      `INSERT INTO photo_upload_queue (
        photo_id, idempotency_key, local_path, original_name, mime_type,
        project_id, plot_id, note_id, captured_at, status, retry_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
      ON CONFLICT(photo_id) DO UPDATE SET
        local_path = excluded.local_path,
        original_name = excluded.original_name,
        mime_type = excluded.mime_type,
        project_id = excluded.project_id,
        plot_id = excluded.plot_id,
        note_id = COALESCE(excluded.note_id, photo_upload_queue.note_id),
        captured_at = excluded.captured_at,
        status = CASE WHEN photo_upload_queue.status = 'uploaded' THEN 'uploaded' ELSE 'pending' END,
        updated_at = excluded.updated_at;`,
      [
        item.photo.id,
        item.photo.id,
        item.photo.location,
        item.photo.name,
        item.photo.mimeType || 'image/jpeg',
        item.projectId,
        item.plotId,
        item.noteId || null,
        item.capturedAt || item.photo.date || now,
        now,
        now,
      ],
    );
    await upsertLocalPhotoRecord({
      ...item.photo,
      projectId: item.projectId,
      plotId: item.plotId,
      noteId: item.noteId || null,
      date: item.capturedAt || item.photo.date || now,
      uploadStatus: 'pending',
    });
    queuedIds.push(item.photo.id);
  }
  if (queuedIds.length) {
    publish({ type: 'queued', count: queuedIds.length, photoIds: queuedIds });
    await schedulePhotoUploadWork();
  }
}

export async function backfillExistingPhotoUploads() {
  await ensureQueueReady();
  const notes = await executeSyncSql(
    `SELECT id, project_id, plot_id, created_at, photo_ids_json FROM notes
     WHERE photo_ids_json IS NOT NULL AND photo_ids_json != '';`,
  );
  const items: QueuePhotoInput[] = [];
  for (let index = 0; index < notes.rows.length; index += 1) {
    const row = notes.rows.item(index) as Record<string, unknown>;
    let ids: string[] = [];
    try {
      const parsed = JSON.parse(String(row.photo_ids_json || '[]'));
      ids = Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string') : [];
    } catch {
      ids = [];
    }
    for (const photoId of ids) {
      const localPath = await findLocalPhotoPath(photoId);
      if (!localPath) continue;
      items.push({
        photo: {
          id: photoId,
          name: `${photoId}.jpg`,
          location: localPath,
          date: String(row.created_at || new Date().toISOString()),
          mimeType: 'image/jpeg',
        },
        projectId: String(row.project_id),
        plotId: String(row.plot_id),
        noteId: String(row.id),
        capturedAt: String(row.created_at || new Date().toISOString()),
      });
    }
  }
  await enqueuePhotoUploads(items);
}

async function findLocalPhotoPath(photoId: string) {
  const direct = `${RNFS.DocumentDirectoryPath}/photos/${photoId}.jpg`;
  if (await RNFS.exists(direct)) return direct;
  const dir = `${RNFS.DocumentDirectoryPath}/photos`;
  if (!await RNFS.exists(dir)) return null;
  const files = await RNFS.readDir(dir);
  return files.find(file => file.isFile() && file.name.startsWith(`${photoId}.`))?.path || null;
}

async function pendingItems(limit = 20) {
  await ensureQueueReady();
  const result = await executeSyncSql(
    `SELECT * FROM photo_upload_queue
     WHERE status IN ('pending', 'failed')
     ORDER BY updated_at ASC
     LIMIT ?;`,
    [limit],
  );
  const items: PhotoUploadQueueItem[] = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    items.push(mapRow(result.rows.item(index)));
  }
  return items;
}

async function updateStatus(photoId: string, status: PhotoUploadQueueItem['status'], error?: string) {
  await executeSyncSql(
    `UPDATE photo_upload_queue
     SET status = ?,
         retry_count = CASE WHEN ? = 'failed' THEN retry_count + 1 ELSE retry_count END,
         last_error = ?,
         uploaded_at = CASE WHEN ? = 'uploaded' THEN ? ELSE uploaded_at END,
         updated_at = ?
     WHERE photo_id = ?;`,
    [status, status, error || null, status, new Date().toISOString(), new Date().toISOString(), photoId],
  );
  await updateLocalPhotoUploadStatus(photoId, status);
}

export async function processPhotoUploadQueue(
  options: { overrideRestrictions?: boolean; photoIds?: string[]; throwOnFailure?: boolean } = {},
) {
  if (processing) return;
  if (!await conditionsAllowUpload(Boolean(options.overrideRestrictions))) {
    await schedulePhotoUploadWork();
    return;
  }
  processing = true;
  try {
    await withPhotoUploadBackgroundTask(async () => {
      const allItems = await pendingItems(50);
      const selected = options.photoIds?.length
        ? allItems.filter(item => options.photoIds?.includes(item.photoId))
        : allItems;
      const total = selected.length;
      let failed = 0;
      for (let index = 0; index < selected.length; index += 1) {
        const item = selected[index];
        publish({ type: 'uploading', current: index + 1, total });
        if (!await RNFS.exists(item.localPath)) {
          await updateStatus(item.photoId, 'missing_local', 'Local photo is no longer available.');
          failed += 1;
          continue;
        }
        await updateStatus(item.photoId, 'uploading');
        try {
          await uploadPhoto({
            id: item.photoId,
            name: item.originalName || `${item.photoId}.jpg`,
            location: item.localPath,
            date: item.capturedAt,
            mimeType: item.mimeType || 'image/jpeg',
            projectId: item.projectId,
            plotId: item.plotId,
            noteId: item.noteId || null,
          }, {
            projectId: item.projectId,
            plotId: item.plotId,
            noteId: item.noteId,
          });
          await updateStatus(item.photoId, 'uploaded');
        } catch (error: any) {
          failed += 1;
          await updateStatus(item.photoId, 'failed', error?.message || 'Upload failed.');
        }
      }
      if (total > 0) {
        publish(failed ? { type: 'failed', failed, total } : { type: 'complete', total });
      }
      if (failed > 0 && options.throwOnFailure) {
        throw new Error('One or more photos could not be uploaded. Please try again.');
      }
    });
  } finally {
    processing = false;
  }
  const remaining = await pendingItems(1);
  if (remaining.length) await schedulePhotoUploadWork();
}
