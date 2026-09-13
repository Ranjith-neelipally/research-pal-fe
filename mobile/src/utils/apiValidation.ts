export const objectIdExpression = /^[a-f\d]{24}$/i;
export const embeddedRecordIdExpression = /^[a-f\d]{24}:[a-f\d]{24}$/i;
export const isoDateExpression = /^\d{4}-\d{2}-\d{2}$/;
export const timeExpression = /^([01]\d|2[0-3]):[0-5]\d$/;

export const validateObjectId = (value: string | null | undefined, label: string) =>
  value && objectIdExpression.test(value) ? undefined : `${label} is invalid or missing.`;

export const validateEmbeddedRecordId = (
  value: string | null | undefined,
  label: string,
) =>
  value && embeddedRecordIdExpression.test(value)
    ? undefined
    : `${label} is invalid or missing.`;

export const validateMaxLength = (
  value: string | null | undefined,
  max: number,
  label: string,
) => {
  if (!value) return undefined;
  return value.trim().length <= max
    ? undefined
    : `${label} must be ${max} characters or fewer.`;
};

export const validateRequiredMaxLength = (
  value: string | null | undefined,
  max: number,
  label: string,
) => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return `${label} is required.`;
  return trimmed.length <= max
    ? undefined
    : `${label} must be ${max} characters or fewer.`;
};

export const validateNumberValue = (value: string, label = 'Value') => {
  if (value.trim() === '') return `${label} is required.`;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${label} must be a valid number.`;
  return undefined;
};

export const validatePositivePageSize = (value: number | undefined, label: string) => {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (value < 1) return `${label} must be at least 1.`;
  if (value > 100) return `${label} cannot exceed 100.`;
  return undefined;
};
