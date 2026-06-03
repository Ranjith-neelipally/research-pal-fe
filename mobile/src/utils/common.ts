import AsyncStorage from '@react-native-async-storage/async-storage';

export function getDayLabel(dateStr: string) {
  const today = new Date();
  const tomorrow = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  tomorrow.setDate(today.getDate() + 1);

  const toYMD = (d: Date) =>
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0');

  if (dateStr === toYMD(today)) return 'Today';
  if (dateStr === toYMD(tomorrow)) return 'Tomorrow';
  if (dateStr === toYMD(yesterday)) return 'Yesterday';
  return dateStr;
}

export const getAllStoredData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    const data = stores.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string | null>);
    return data;
  } catch (error) {
    console.error('Error retrieving all stored data:', error);
    return null;
  }
};

export const normalizeDate = (dateString: string) => {
  const date = new Date(dateString);
  const monthName = date
    .toLocaleString('default', { month: 'long' })
    .slice(0, 3);
  return `${monthName} ${date.getDate()}`;
};
