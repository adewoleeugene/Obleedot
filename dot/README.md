# Salone Events

A Dash dot that shows what events are on in Sierra Leone: when and where they are, pictures, details and ticket prices. It's for information only: nothing is bought in this dot.

## Pages

| Page | What it does |
| --- | --- |
| `index` | What's on: search, category chips, featured carousel and the list of upcoming events |
| `event` | One event: picture, date, time, venue, organiser, description, photos and ticket prices. Share links can open it (`/event?event=<id>`) |

Shared code is in `lib/`: types, formatting, the server client (`api.ts`) and the sample events.

## Run it

```bash
npm install
npm run dev        # simulator at http://localhost:3680
npm run build      # checks and builds
npm run typecheck
npm test
```

## Where events come from

Events are managed in the team admin app in `../salone-events-admin` (a PWA on Vercel, with posters in Vercel Blob). Its README has the setup.

With `API_URL` empty in `.env`, the dot shows the sample events in `lib/sample-data.ts`. To show live events:

1. Set `API_URL=https://<admin-project>.vercel.app/api` in `.env`.
2. Add `"network": { "hosts": ["<admin-project>.vercel.app", "*.public.blob.vercel-storage.com"] }` to `dot.json`.

The dot calls `GET {API_URL}/events` and `GET {API_URL}/events/:id`. The shapes are in `lib/types.ts`, and the admin's `lib/types.ts` must match.

## Before publishing

- Set `package` in `dot.json` to a reverse domain the business owns. It can't change after publishing.
- Install the Monime CLI, `monime login`, `monime space use <space>`, then `monime dot register`.
- Once registered, put the dot's share link base in `SHARE_URL` in `.env`.
- Replace the placeholder pictures in `statics/events/`.
