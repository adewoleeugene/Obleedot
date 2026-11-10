# Salone Events Admin

The team's app for adding and updating the events shown in the Salone Events dot. It's a PWA (install it from the phone's browser) and the API the dot reads from. It runs on Vercel and keeps everything in Vercel Blob.

## How it works

- **Events** live in one private Blob file, `data/events.json`. Every save checks the file hasn't changed since it was read, so two teammates saving at once can't overwrite each other.
- **Posters** are public Blob images. The browser shrinks each photo before uploading (longest side 1400px, JPEG), so uploads are quick on mobile data.
- **The dot** reads `GET /api/events` and `GET /api/events/:id`. They return published events that haven't ended, cached for a minute at Vercel's edge.
- **Clean-up** runs every day at 06:00 Freetown time (`vercel.json`). It deletes each event and its poster the morning after its last day, plus any poster uploaded but never saved with an event. Replacing or deleting a poster in the admin removes the old file at once.
- **Sign-in** is a team passcode. A correct passcode sets a signed cookie for 30 days.

## Set up on Vercel (new account for this project)

1. Create a Vercel account for the business and a new project from this folder (push it to a new Git repository and import it, or run `npx vercel` here).
2. In the project, open **Storage**, create a **Blob** store and connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN`.
3. In **Settings → Environment Variables**, add:
   - `ADMIN_PASSCODE`: the passcode your team types. Use a long phrase.
   - `SESSION_SECRET`: run `openssl rand -hex 32` and paste the result.
   - `CRON_SECRET`: run `openssl rand -hex 32` again. Vercel sends it to the clean-up job.
4. Deploy.
5. Load the current events once: run `npx vercel env pull .env.local`, then `npm run seed`. It uploads the 14 posters and 16 events from the dot's sample data, and refuses to run if events already exist.
6. On each teammate's phone, open the site and choose **Add to Home Screen**.

## Point the dot at it

In the dot (`../dot`):

1. In `.env`, set `API_URL=https://<your-project>.vercel.app/api` (the dot adds `/events`).
2. In `dot.json`, add the hosts the dot may call:

   ```json
   "network": { "hosts": ["<your-project>.vercel.app", "*.public.blob.vercel-storage.com"] }
   ```

3. Run `npm run build` in the dot. The sample events stop showing and live ones load instead.

## Work on it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test
npm run typecheck
npm run build
```

Without `BLOB_READ_WRITE_TOKEN`, local development saves to `.local-data/` and `public/local-posters/` instead of Blob, so you can try it with no Vercel account. Put `ADMIN_PASSCODE`, `SESSION_SECRET` and `CRON_SECRET` in `.env.local` (see `.env.example`). Production always uses Blob.
