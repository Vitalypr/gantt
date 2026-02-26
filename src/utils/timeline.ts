import { MONTH_NAMES_SHORT, QUARTER_NAMES } from '@/constants/timeline';

export function monthToPixelX(monthIndex: number, monthWidth: number): number {
  return monthIndex * monthWidth;
}

export function pixelXToMonth(px: number, monthWidth: number): number {
  return Math.round(px / monthWidth);
}

export function snapToMonth(px: number, monthWidth: number): number {
  return Math.round(px / monthWidth) * monthWidth;
}

export function getTotalMonths(startYear: number, endYear: number, startMonth = 1, endMonth = 12): number {
  return (endYear - startYear) * 12 + (endMonth - startMonth + 1);
}

export function monthIndexToLabel(monthIndex: number, startYear: number, startMonth = 1): string {
  const absoluteMonth = (startMonth - 1) + monthIndex;
  const month = absoluteMonth % 12;
  const year = startYear + Math.floor(absoluteMonth / 12);
  return `${MONTH_NAMES_SHORT[month]} ${year}`;
}

export function monthIndexToDate(monthIndex: number, startYear: number, startMonth = 1): { month: number; year: number } {
  const absoluteMonth = (startMonth - 1) + monthIndex;
  return {
    month: absoluteMonth % 12,
    year: startYear + Math.floor(absoluteMonth / 12),
  };
}

export type YearHeader = { year: number; startMonth: number; spanMonths: number };
export type QuarterHeader = { label: string; startMonth: number; spanMonths: number };
export type MonthHeader = { label: string; monthIndex: number; monthNumber: number };

export function buildYearHeaders(startYear: number, endYear: number, chartStartMonth = 1, chartEndMonth = 12): YearHeader[] {
  const headers: YearHeader[] = [];
  let idx = 0;
  for (let year = startYear; year <= endYear; year++) {
    const firstM = year === startYear ? chartStartMonth : 1;
    const lastM = year === endYear ? chartEndMonth : 12;
    const span = lastM - firstM + 1;
    headers.push({ year, startMonth: idx, spanMonths: span });
    idx += span;
  }
  return headers;
}

export function buildQuarterHeaders(startYear: number, endYear: number, chartStartMonth = 1, chartEndMonth = 12): QuarterHeader[] {
  const headers: QuarterHeader[] = [];
  let idx = 0;
  for (let year = startYear; year <= endYear; year++) {
    const firstM = year === startYear ? chartStartMonth : 1;
    const lastM = year === endYear ? chartEndMonth : 12;
    for (let q = 0; q < 4; q++) {
      const qStart = q * 3 + 1; // 1,4,7,10
      const qEnd = qStart + 2;  // 3,6,9,12
      // Intersect quarter with visible range for this year
      const visStart = Math.max(qStart, firstM);
      const visEnd = Math.min(qEnd, lastM);
      if (visStart > visEnd) continue;
      const span = visEnd - visStart + 1;
      const qName = QUARTER_NAMES[q]!;
      headers.push({ label: `${qName} ${year}`, startMonth: idx, spanMonths: span });
      idx += span;
    }
  }
  return headers;
}

export function buildMonthHeaders(startYear: number, endYear: number, chartStartMonth = 1, chartEndMonth = 12): MonthHeader[] {
  const totalMonths = getTotalMonths(startYear, endYear, chartStartMonth, chartEndMonth);
  const headers: MonthHeader[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const absoluteMonth = (chartStartMonth - 1) + i;
    const m = absoluteMonth % 12;
    headers.push({
      label: MONTH_NAMES_SHORT[m]!,
      monthIndex: i,
      monthNumber: m + 1,
    });
  }
  return headers;
}

export function getCurrentMonthIndex(startYear: number, chartStartMonth = 1): number {
  const now = new Date();
  return (now.getFullYear() - startYear) * 12 + now.getMonth() - (chartStartMonth - 1);
}
