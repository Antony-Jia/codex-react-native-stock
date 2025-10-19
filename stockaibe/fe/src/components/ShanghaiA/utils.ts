import type { Dayjs } from 'dayjs';

export const formatNumber = (value?: number, digits: number = 2) =>
  value === null || value === undefined ? '-' : value.toFixed(digits);

export const formatPercent = (value?: number) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value;
};

export const formatAmount = (value?: number) => {
  if (value === null || value === undefined) return '-';
  if (Math.abs(value) >= 1e8) {
    return `${(value / 1e8).toFixed(2)} 亿`;
  }
  if (Math.abs(value) >= 1e4) {
    return `${(value / 1e4).toFixed(2)} 万`;
  }
  return value.toFixed(2);
};

export const formatQuarterLabel = (value?: string) => {
  if (!value) {
    return '-';
  }
  const normalized = value.replace(/-/g, '');
  if (normalized.length !== 8) {
    return value;
  }
  const year = normalized.slice(0, 4);
  const month = normalized.slice(4, 6);
  let quarter = '';
  if (month === '03') quarter = 'Q1';
  else if (month === '06') quarter = 'Q2';
  else if (month === '09') quarter = 'Q3';
  else if (month === '12') quarter = 'Q4';
  return quarter ? `${year} ${quarter}` : value;
};

export const formatQuarterParam = (value: Dayjs | null) => (value ? value.format('YYYYMMDD') : undefined);

export const normalizePeriodValue = (value?: string) => (value ? value.replace(/-/g, '') : '');

export const formatDateParam = (value: Dayjs | null) => (value ? value.format('YYYY-MM-DD') : undefined);
