import { NativeModules, Platform } from 'react-native';

const native = NativeModules.IdeaReminder as {
  requestPermission(): Promise<boolean>;
  pickTime?(initialTime: string | null): Promise<string | null>;
  schedule(id: string, text: string, times: number[]): Promise<number[]>;
  cancel(id: string): Promise<void>;
  cancelAll?(): Promise<void>;
} | undefined;

export const reminderTimes = (date: string, customTime?: string | null) => {
  const [year, month, day] = date.split('-').map(Number);
  const first = customTime || '07:00';
  const [hour, minute] = first.split(':').map(Number);
  const values = [[hour, minute], [10, 0], [16, 0]]
    .filter(([h, m], index) => index === 0 || h * 60 + m >= hour * 60 + minute)
    .map(([h, m]) => new Date(year, month - 1, day, h, m, 0, 0).getTime());
  return [...new Set(values)].filter(time => time > Date.now());
};

export async function requestReminderPermission() {
  return Platform.OS !== 'android' || !native ? false : native.requestPermission();
}
export async function pickIdeaReminderTime(initialTime?: string | null) {
  if (!native?.pickTime) return null;
  return native.pickTime(initialTime || null);
}
export async function scheduleIdeaReminders(id: string, text: string, date: string, time?: string | null) {
  if (!native) return [];
  try {
    return await native.schedule(id, text, reminderTimes(date, time));
  } catch (error) {
    // Older debug APKs scheduled successfully, then failed while bridging the
    // boxed Kotlin Integer[] result. Cancellation is keyed by idea ID, so the
    // returned IDs are not required for correctness on that build.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('unknown array type class [Ljava.lang.Integer;')) {
      return [];
    }
    throw error;
  }
}
export async function cancelIdeaReminders(id: string) { if (native) await native.cancel(id); }
export async function cancelAllIdeaReminders() { if (native?.cancelAll) await native.cancelAll(); }
