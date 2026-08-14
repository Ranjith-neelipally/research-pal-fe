export type ObservationDataType = 'number' | 'text' | 'boolean';

export interface ObservationType {
  id: string;
  projectId: string;
  name: string;
  dataType: ObservationDataType;
  unit?: string | null;
  createdAt: string;
  lastUsedAt: string;
}

export interface ObservationMeasurement {
  id: string;
  projectId: string;
  plotId: string;
  plotName: string;
  treatment: string;
  replication: string;
  treatmentId: string;
  replicationId: string;
  observationTypeId: string;
  observationName?: string;
  value: number | string | boolean;
  unit?: string;
  note?: string;
  capturedAt: string;
  sessionId?: string;
  round?: number;
  session?: string;
}

export interface ObservationSummary {
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  count: number;
  byTreatment: Array<{
    treatmentId: string;
    treatment: string;
    average: number;
    minimum: number;
    maximum: number;
    count: number;
  }>;
}

export interface ObservationGraphSession {
  id: string;
  label: string;
  capturedAt: string;
  round: number;
  comparePlots: Array<{ plotId: string; plot: string; treatmentId: string; replicationId: string; value: number }>;
  compareTreatments: Array<{ treatmentId: string; treatment: string; average: number; minimum: number; maximum: number; count: number }>;
}

export interface ObservationGraphs {
  sessions: ObservationGraphSession[];
  treatmentSeries: Array<{ treatmentId: string; treatment: string; values: Array<{ sessionId: string; session: string; capturedAt: string; value: number | null; count: number }> }>;
  timeSeries: Array<{ plotId: string; plot: string; treatmentId: string; replicationId: string; replication: string; values: Array<{ sessionId: string; session: string; capturedAt: string; value: number }> }>;
}

export interface ComparisonRequest {
  mode: 'specificDates' | 'dateRange' | 'sessions' | 'time';
  selectedDates?: string[];
  from?: string;
  to?: string;
  sessionIds?: string[];
  timeFrom?: string;
  timeTo?: string;
  selectedPlots?: string[];
  selectedTreatments?: string[];
  groupBy?: 'plot' | 'treatment';
  aggregation?: 'average' | 'minimum' | 'maximum' | 'growth' | 'minMax' | 'daily';
}

export interface ComparisonResult {
  title: string;
  chartType: 'groupedBar' | 'line';
  xAxis: string;
  yAxis: string;
  series: Array<{ key: string; label: string }>;
  points: Array<{ category: string; values: Record<string, number | null>; ranges?: Record<string, { minimum: number; maximum: number } | null> }>;
}
