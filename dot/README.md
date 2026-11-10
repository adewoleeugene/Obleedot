# Salone Events

A Dash dot that shows what events are on in Sierra Leone: when and where they are, pictures, details and ticket prices. It's for information only: nothing is bought in this dot.

## Pages

| Page | What it does |
| --- | --- |
| `index` | What's on: search, one filter row (date sheet and category chips), the person's Saved shelf, the Don't miss carousel and the list of upcoming events |
| `event` | One event: poster, date, time, venue, dress code, description and ticket prices, with Save, Remind me and Share. Share links and reminders open it (`/event?event=<id>`) |

Shared code is in `lib/`: types, formatting, filters, the server client (`api.ts`), saved events (`saved.ts`), reminder times (`reminders.ts`) and the sample events.

## Keeping events for later

- **Save** keeps the event's id on the phone (`dash.storage.cache`, key `saved-events`). Saved events show in a shelf at the top of the home page while nothing is filtered; ones that end drop off.
- **Remind me** sets a Dash reminder (`dash.reminders`, needs the `reminders` permission in `dot.json`). The choices are the day before at 6 pm, the morning of the day at 10 am (when the event starts at noon or later) and two hours before it starts, offering only times still to come. Dash asks the person once, the first time. A dot can have 12 reminders coming up at once.

## Run it

```bash
npm install
npm run dev        # simulator at http://localhost:3680
npm run build      # checks and builds
npm run typecheck
npm test
```

## Where events come from

Events are managed in the team admin app in `../admin` (a PWA at https://obleedot-admin.vercel.app, with posters in Vercel Blob). Its README has the setup.

`.env` sets `API_URL=https://obleedot-admin.vercel.app/api`, and `dot.json` lists that host and the poster store's host in `network.hosts`. With `API_URL` empty, the dot shows the sample events in `lib/sample-data.ts` instead.

The dot calls `GET {API_URL}/events` and `GET {API_URL}/events/:id`. The shapes are in `lib/types.ts`, and the admin's `lib/types.ts` must match.

## Publishing

- `package` is `sl.obleedot.events`. It can't change after publishing.
- With the Monime CLI: `monime login`, `monime space use <space>`, `monime dot register`, then `monime dot publish`.
- Once registered, put the dot's share link base in `SHARE_URL` in `.env`.
- Raise `version` in `dot.json` before every publish.
