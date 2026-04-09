export interface PlotNoteContentEntry {
  note?: string[];
  photoIds?: string[];
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlotNote {
  _id: string;
  projectId: string;
  plotId: string;
  userId: string;
  title?: string;
  content?: string | string[] | PlotNoteContentEntry[] | null;
  photoIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export const PAGE_SIZE = 10;

export const normalizeContent = (content?: PlotNote['content']): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    if (content.every(item => typeof item === 'string')) {
      return content.filter(Boolean).join('; ');
    }

    return content
      .flatMap(item => {
        if (typeof item === 'string') {
          return item;
        }

        return item?.note || [];
      })
      .filter(Boolean)
      .join('; ');
  }

  return '';
};

export const getPhotoIdsFromContent = (content?: PlotNote['content']): string[] => {
  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .flatMap(item => {
      if (typeof item === 'string') {
        return [];
      }

      return item?.photoIds || [];
    })
    .filter(Boolean);
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';

  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (dateString?: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;

  return `${normalizedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

export const formatContentForInput = (content?: PlotNote['content']): string =>
  normalizeContent(content)
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => `• ${part}`)
    .join('\n');

export const formatContentForSave = (text: string): string[] =>
  text
    .split('\n')
    .map(line => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);

export const getDayLabel = (dateString?: string): string => {
  if (!dateString) return '';

  const targetDate = new Date(dateString);
  const today = new Date();

  const isSameDay =
    targetDate.getFullYear() === today.getFullYear() &&
    targetDate.getMonth() === today.getMonth() &&
    targetDate.getDate() === today.getDate();

  if (isSameDay) {
    return 'Today';
  }

  return targetDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const getCardPreviewContent = (
  content?: PlotNote['content'],
  maxLines = 2,
): string => {
  const formatted = formatContentForInput(content);

  if (!formatted) {
    return 'No note content';
  }

  const lines = formatted
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length <= maxLines) {
    return lines.join('\n');
  }

  return [...lines.slice(0, maxLines), '...'].join('\n');
};
