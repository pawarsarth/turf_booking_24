/** Convert 24h time "13:00" → "1 PM", "08:00" → "8 AM" */
export function to12h(t: string): string {
  if (!t) return t;
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2,'0')} ${ampm}`;
}

/** Return all hourly start times for a block */
export function hoursInRange(startTime: string, hours: number): string[] {
  const [sh] = startTime.split(':').map(Number);
  return Array.from({ length: hours }, (_, i) => `${String(sh + i).padStart(2,'0')}:00`);
}

/** Build end time from start + hours */
export function buildEndTime(startTime: string, hours: number): string {
  const [sh] = startTime.split(':').map(Number);
  return `${String(sh + hours).padStart(2,'0')}:00`;
}
