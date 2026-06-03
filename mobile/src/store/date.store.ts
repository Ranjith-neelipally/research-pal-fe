import { create } from 'zustand';

export interface DateState {
  currentDate: string;
  currentMonth: string;
  currentYear: string;
  currentDay: string;
  currentDayNumber?: string;
}

function getLocalDateParts(): DateState {
  const today = new Date();

  const year = today.getFullYear().toString();
  const monthNumber = String(today.getMonth() + 1).padStart(2, '0');
  const monthName = today.toLocaleDateString(undefined, { month: 'long' });
  const day = String(today.getDate()).padStart(2, '0');
  const weekday = today.toLocaleDateString(undefined, { weekday: 'long' });

  return {
    currentDate: `${year}-${monthNumber}-${day}`,
    currentMonth: monthName,
    currentYear: year,
    currentDay: weekday,
    currentDayNumber: day,
  };
}

export const useDateStore = create<DateState>(() => ({
  ...getLocalDateParts(),
}));
