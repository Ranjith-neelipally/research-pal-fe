import AsyncStorage from '@react-native-async-storage/async-storage';

export const toLocalDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const parseLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export function getDayLabel(dateStr: string) {
  const today = new Date();
  const tomorrow = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  tomorrow.setDate(today.getDate() + 1);

  if (dateStr === toLocalDateString(today)) return 'Today';
  if (dateStr === toLocalDateString(tomorrow)) return 'Tomorrow';
  if (dateStr === toLocalDateString(yesterday)) return 'Yesterday';
  return dateStr;
}

export const getAllStoredData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return await AsyncStorage.getMany(keys);
  } catch (error) {
    console.error('Error retrieving all stored data:', error);
    return null;
  }
};

export const normalizeDate = (dateString: string) => {
  const date = parseLocalDate(dateString);
  const monthName = date
    .toLocaleString('default', { month: 'long' })
    .slice(0, 3);
  return `${monthName} ${date.getDate()}`;
};
