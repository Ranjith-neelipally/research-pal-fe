export type ObservationDataType = "number" | "text" | "boolean";

export interface ObservationType {
  id: string;
  projectId: string;
  name: string;
  dataType: ObservationDataType;
  unit?: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface ObservationMeasurement {
  id: string;
  projectId: string;
  plotId: string;
  plotName: string;
  treatment: number;
  replication: number;
  treatmentId?: string;
  replicationId?: string;
  observationTypeId: string;
  value: number | string | boolean;
  unit?: string;
  note?: string;
  capturedAt: string;
}
