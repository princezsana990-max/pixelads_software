import React, { createContext, useContext, useState } from 'react';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns';

export type PresetRange =
  | 'Today'
  | 'Yesterday'
  | 'Last 7 Days'
  | 'Last 30 Days'
  | 'This Month'
  | 'Last Month'
  | 'Custom';

export interface DateRangeState {
  preset: PresetRange;
  startDate: string; // ISO string or YYYY-MM-DD
  endDate: string;
  formattedLabel: string;
}

interface DateRangeContextType {
  dateRange: DateRangeState;
  setPreset: (preset: PresetRange) => void;
  setCustomRange: (startDate: string, endDate: string) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

function computeDatesForPreset(preset: PresetRange): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (preset) {
    case 'Today': {
      const s = startOfDay(now);
      const e = endOfDay(now);
      return { start: s, end: e, label: 'Today' };
    }
    case 'Yesterday': {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y), label: 'Yesterday' };
    }
    case 'Last 7 Days': {
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now), label: 'Last 7 Days' };
    }
    case 'Last 30 Days': {
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now), label: 'Last 30 Days' };
    }
    case 'This Month': {
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'This Month' };
    }
    case 'Last Month': {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm), label: 'Last Month' };
    }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'Custom Range' };
  }
}

export const DateRangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const { start, end, label } = computeDatesForPreset('This Month');
    return {
      preset: 'This Month',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      formattedLabel: `${label} (${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')})`,
    };
  });

  const setPreset = (preset: PresetRange) => {
    if (preset === 'Custom') {
      setDateRange((prev) => ({ ...prev, preset: 'Custom' }));
      return;
    }
    const { start, end, label } = computeDatesForPreset(preset);
    setDateRange({
      preset,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      formattedLabel: `${label} (${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')})`,
    });
  };

  const setCustomRange = (startDateStr: string, endDateStr: string) => {
    try {
      const start = startOfDay(new Date(startDateStr));
      const end = endOfDay(new Date(endDateStr));
      setDateRange({
        preset: 'Custom',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        formattedLabel: `Custom (${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')})`,
      });
    } catch {
      // ignore invalid input
    }
  };

  return (
    <DateRangeContext.Provider value={{ dateRange, setPreset, setCustomRange }}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
};
