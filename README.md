# Obleedot

Salone Events: a Monime Dash dot for finding out what's on in Sierra Leone, plus the admin app the team uses to keep the events up to date.

| Folder | What it is |
| --- | --- |
| [`dot/`](dot) | The info-only events dot (Dot framework). Run it with `npm install && npx dotctl dev`. |
| [`admin/`](admin) | Next.js PWA on Vercel with Vercel Blob. Team passcode sign-in, poster uploads, and a daily job that deletes ended events and their posters. |

## Deploying the admin

Import this repo into Vercel and set **Root Directory** to `admin`. The rest of the setup (Blob store, environment variables, seeding) is in [`admin/README.md`](admin/README.md).

## Pointing the dot at the admin

In `dot/.env` set `API_URL=https://<your-project>.vercel.app/api`, then add `<your-project>.vercel.app` and `*.public.blob.vercel-storage.com` to `network.hosts` in `dot/dot.json`.
