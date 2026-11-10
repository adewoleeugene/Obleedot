const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-12-24' → "Thu 24 Dec". */
export function weekdayDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** '19:30' → "7:30 pm". */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function dateLine(event: { date: string; endDate?: string; startTime: string }): string {
  if (event.endDate && event.endDate !== event.date) return `${weekdayDate(event.date)} – ${weekdayDate(event.endDate)}`;
  return event.startTime ? `${weekdayDate(event.date)} · ${formatTime(event.startTime)}` : weekdayDate(event.date);
}
