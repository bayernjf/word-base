import { Word } from '../../../types';

export function getFrequency(word: Word): number {
  return (word.contexts?.length) ?? (word.frequency ?? 0);
}

export function getDisplayFrequency(word: Word): number {
  const freq = getFrequency(word);
  return Math.min(freq, 100);
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}/${month}/${day}`;
}
