// "Remind me" for one event. Pure helpers: the event page calls dash.reminders with what these
// return. Times are the phone's local time, the way Dash schedules reminders.
import { addDays } from './dates';
import { formatTime, weekdayDate } from './format';

export type ReminderChoice = {
  /** 'day-before', 'morning' or 'before'. */
  id: string;
  /** Such as "The day before, at 6 pm". */
  label: string;
  date: string;
  time: string;
};

type Timed = { id: string; title: string; date: string; startTime: string; venue: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** Dash keys are at most 64 characters. */
export function reminderKey(eventId: string): string {
  return `event-${eventId}`.slice(0, 64);
}

/** 'HH:MM' two hours earlier on the same day, or null if that's before midnight. */
function twoHoursBefore(time: string): string | null {
  const [hours, minutes] = time.split(':').map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || hours < 2) {
    return null;
  }
  return `${pad(hours - 2)}:${pad(minutes)}`;
}

/** The reminder times still to come for this event, soonest first. `now` is 'YYYY-MM-DD HH:MM'. */
export function reminderChoices(event: Timed, now: string): ReminderChoice[] {
  const start = /^\d{2}:\d{2}$/.test(event.startTime) ? event.startTime : '';
  const choices: ReminderChoice[] = [
    { id: 'day-before', label: 'The day before, at 6 pm', date: addDays(event.date, -1), time: '18:00' },
  ];
  // A morning nudge only helps when the event starts after it.
  if (!start || start >= '12:00') {
    choices.push({ id: 'morning', label: 'On the day, at 10 am', date: event.date, time: '10:00' });
  }
  const before = start ? twoHoursBefore(start) : null;
  if (before) {
    choices.push({ id: 'before', label: `2 hours before, at ${formatTime(before)}`, date: event.date, time: before });
  }
  return choices.filter((choice) => `${choice.date} ${choice.time}` > now);
}

/** Which choice an existing reminder matches, by its date and time. */
export function matchChoice(choices: readonly ReminderChoice[], schedule: { start: string; time?: string | undefined }): string {
  return choices.find((choice) => choice.date === schedule.start && choice.time === (schedule.time ?? '09:00'))?.id ?? '';
}

/** Such as "Thu 19 Nov, 6 pm". */
export function whenLabel(date: string, time: string): string {
  return `${weekdayDate(date)}, ${formatTime(time)}`;
}

/** The notification's words: "Drizilik Live in Concert is tomorrow" and "7 pm at FBC Amphitheatre". */
export function reminderText(event: Timed, choice: ReminderChoice): { title: string; message: string } {
  const when = choice.date === event.date ? (choice.id === 'before' ? 'starts soon' : 'is today') : 'is tomorrow';
  const suffix = ` ${when}`;
  const title = event.title.length + suffix.length > 80 ? `${event.title.slice(0, 79 - suffix.length)}…${suffix}` : `${event.title}${suffix}`;
  const at = /^\d{2}:\d{2}$/.test(event.startTime) ? formatTime(event.startTime) : '';
  const message = [at, event.venue].filter(Boolean).join(' at ');
  return { title, message: message.slice(0, 200) };
}

/** The phone's current local time, as 'YYYY-MM-DD HH:MM'. */
export function nowOnPhone(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
