import { z } from 'zod';

import { CATEGORIES } from './types';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-12-24');
const time = z.union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 19:30')]);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

export const priceSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1, 'Give the ticket a name').max(40),
  description: z.string().trim().max(60).default(''),
  price: z.number().int().min(0).max(100_000_000),
  currency: z.enum(['SLE', 'USD']),
  soldOut: z.boolean().optional(),
});

/** What the admin form sends. The server adds id, timestamps and the poster pathname. */
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a title').max(80),
    category: z.enum(CATEGORIES),
    summary: z.string().trim().min(1, 'Add a one-line summary').max(140),
    description: z.string().trim().max(3000).default(''),
    date,
    endDate: z.union([z.literal(''), date]).optional().transform((v) => v || undefined),
    // Required: people need to know when to turn up.
    startTime: z.string().min(1, 'Add the start time').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 19:30'),
    endTime: z.union([time, z.literal('late')]),
    venue: z.string().trim().max(80).default(''),
    address: z.string().trim().max(120).default(''),
    city: z.string().trim().min(1, 'Add the city or area').max(60),
    organizer: z.string().trim().max(100).default(''),
    image: z.string().url('Upload a poster'),
    posterPathname: z.string().min(1, 'Upload a poster'),
    featured: z.boolean().default(false),
    dressCode: optionalText(60),
    ageLimit: optionalText(10),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => v?.replace(/[\s-]/g, '') || undefined)
      .refine((v) => !v || /^\+?\d{7,15}$/.test(v), 'Use a number like +232 79 555 093'),
    website: z.union([z.literal(''), z.string().url().startsWith('https://', 'Use an https:// address')]).optional().transform((v) => v || undefined),
    prices: z.array(priceSchema).max(8).default([]),
    status: z.enum(['draft', 'published']),
  })
  .refine((e) => !e.endDate || e.endDate >= e.date, { message: 'The end date is before the start date', path: ['endDate'] });

export type EventInput = z.infer<typeof eventInputSchema>;

/** A field name → first message map, for showing errors beside the fields. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    out[key] ??= issue.message;
  }
  return out;
}
