/**
 * Format minutes into a readable time string
 */
export function formatMinutes(minutes: number | null | undefined): string {
  const mins = minutes || 0;
  if (mins < 60) {
    return `${mins} min`;
  }
  
  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;
  
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days}d ${remainingHours}h ${remainingMinutes}m`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return num.toLocaleString();
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

