// Ticket types: a fixed list the team picks from, so "Early bird" is spelled the same on every
// event. Each ticket still carries a `name`, which older dots show, so the type is extra detail.
import type { TicketType } from './types';

export const TICKET_TYPES = ['early-bird', 'regular', 'gate', 'vip', 'vvip', 'table', 'group', 'student', 'other'] as const;

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  'early-bird': 'Early bird',
  regular: 'Regular',
  gate: 'At the gate',
  vip: 'VIP',
  vvip: 'VVIP',
  table: 'Table',
  group: 'Group',
  student: 'Student',
  other: 'Other',
};

/** Every type can have its own name ("Early bird adults", "Table for 6"); Other must have one. */
export function needsName(type: TicketType): boolean {
  return type === 'other';
}

/** The name shown for a ticket: the one typed in, or else the type's label. */
export function ticketName(type: TicketType, name: string): string {
  const typed = name.trim();
  if (typed) return typed;
  return type === 'other' ? '' : TICKET_TYPE_LABELS[type];
}

const ALIASES: Record<string, TicketType> = {
  'early bird': 'early-bird',
  earlybird: 'early-bird',
  'early-bird': 'early-bird',
  regular: 'regular',
  standard: 'regular',
  general: 'regular',
  'general admission': 'regular',
  'at the gate': 'gate',
  gate: 'gate',
  'gate price': 'gate',
  'on the door': 'gate',
  vip: 'vip',
  vvip: 'vvip',
  table: 'table',
  group: 'group',
  student: 'student',
  students: 'student',
};

/** For tickets saved before types existed: works the type out from the name. */
export function inferType(name: string): TicketType {
  const key = name.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  // "Early bird adults", "VIP table": the longest alias the name starts with.
  const prefix = Object.keys(ALIASES)
    .filter((alias) => key.startsWith(`${alias} `))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? ALIASES[prefix]! : 'other';
}
