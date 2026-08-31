import * as RNFS from '@dr.pogodin/react-native-fs';
import { saveToDownloads } from '../deviceStorage';
import api from '../api';
import type {
  ComparisonRequest,
  ComparisonResult,
  ObservationDataType,
  ObservationGraphs,
  ObservationMeasurement,
  ObservationSummary,
  ObservationType,
} from '../../types/observation';

const unwrap = <T,>(payload: any): T => (payload?.data ?? payload) as T;
const mapType = (value: any): ObservationType => ({
  ...value,
  id: value._id || value.id,
  lastUsedAt: value.updatedAt || value.lastUsedAt,
});
const mapRecord = (value: any): ObservationMeasurement => ({
  ...value,
  id: value._id || value.id,
  plotName: value.plotName || value.plot || 'Unknown plot',
  treatment: value.treatment != null ? `T${value.treatment}` : '',
  replication: value.replication != null ? `R${value.replication}` : '',
  treatmentId: String(value.treatmentId || ''),
  replicationId: String(value.replicationId || ''),
  sessionId: value.measurementSessionId || value.sessionId,
});

export async function listObservationTypes(projectId: string) {
  return unwrap<any[]>((await api.get('observations/types', { params: { projectId } })).data).map(mapType);
}

export async function createObservationType(payload: { projectId: string; name: string; dataType: ObservationDataType; unit?: string }) {
  return mapType(unwrap((await api.post('observations/types', payload)).data));
}

export async function listObservationRecords(projectId: string, observationTypeId?: string) {
  return unwrap<any[]>((await api.get('observations/records', { params: { projectId, observationTypeId } })).data).map(mapRecord);
}

export async function bulkCreateObservationRecords(payload: { projectId: string; observationTypeId: string; records: Array<{ plotId: string; value: number | string | boolean; note?: string; capturedAt?: string }> }) {
  return unwrap<any[]>((await api.post('observations/records/bulk', payload)).data).map(mapRecord);
}

export async function createObservationRecord(payload: { projectId: string; observationTypeId: string; plotId: string; value: number | string | boolean; note?: string; capturedAt?: string }) {
  return mapRecord(unwrap((await api.post('observations/records', payload)).data));
}

export async function updateObservationRecord(payload: { projectId: string; recordId: string; value?: number | string | boolean; note?: string; capturedAt?: string }) {
  return mapRecord(unwrap((await api.patch('observations/records', payload)).data));
}

export async function deleteObservationRecord(projectId: string, recordId: string) {
  await api.delete('observations/records', { data: { projectId, recordId } });
}

export async function getObservationSummary(projectId: string, observationTypeId: string) {
  return unwrap<ObservationSummary>((await api.get('observations/summary', { params: { projectId, observationTypeId } })).data);
}

export async function getObservationGraphs(projectId: string, observationTypeId: string) {
  return unwrap<ObservationGraphs>((await api.get('observations/graphs', { params: { projectId, observationTypeId } })).data);
}

export async function compareObservation(projectId: string, observationTypeId: string, request: ComparisonRequest) {
  return unwrap<ComparisonResult>((await api.post('observations/compare', { projectId, observationTypeId, ...request })).data);
}


const filenameFrom = (headers: any, fallback: string) => {
  const disposition = headers?.['content-disposition'] || '';
  return /filename="?([^";]+)"?/.exec(disposition)?.[1] || fallback;
};

const saveBase64 = async (data: string, name: string) => {
  const root = RNFS.DownloadDirectoryPath || RNFS.DocumentDirectoryPath;
  const path = `${root}/${name}`;
  await RNFS.writeFile(path, data, 'base64');
  return path;
};

const encodeBase64 = (input: ArrayBuffer | string) => {
  const bytes = typeof input === 'string'
    ? Uint8Array.from(input, character => character.charCodeAt(0) & 255)
    : new Uint8Array(input);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index], b = bytes[index + 1], c = bytes[index + 2];
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | ((b || 0) >> 4)];
    output += index + 1 < bytes.length ? alphabet[((b & 15) << 2) | ((c || 0) >> 6)] : '=';
    output += index + 2 < bytes.length ? alphabet[c & 63] : '=';
  }
  return output;
};

export async function exportObservations(projectId: string, format: 'csv' | 'xlsx' | 'pdf', observationTypeId?: string, comparison?: ComparisonRequest) {
  const response = await api.get('observations/export', {
    params: { projectId, observationTypeId, format, comparison: comparison ? JSON.stringify(comparison) : undefined },
    responseType: 'arraybuffer',
  });
  const data = encodeBase64(response.data);
  const fileName = filenameFrom(response.headers, `project-observations.${format}`);
  const mimeType = format === 'csv' ? 'text/csv' : format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return saveToDownloads(fileName, mimeType, data);
}

export interface ExportChart {
  title: string;
  subtitle?: string;
  svg: string;
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

export async function exportSelectedCharts(projectId: string, format: 'png' | 'pdf' | 'xlsx', charts: ExportChart[]) {
  const response = await api.post('observations/export/charts', { projectId, format, charts }, { responseType: 'arraybuffer' });
  return saveBase64(encodeBase64(response.data), `observation-charts.${format}`);
}
