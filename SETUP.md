# Calypso — Setup

A beautiful movie/TV streaming app: Vidking player, Wyzie subtitles, TMDB + OMDb
metadata, Supabase accounts with an admin master control panel (approve signups,
suspend accounts behind a full-screen lock banner), continue-watching, watchlist,
save-for-later, and recommendations.

## 1. Get your keys

| Key | Where | Notes |
|-----|-------|-------|
| **TMDB** | https://www.themoviedb.org → Settings → API | v3 key *or* v4 token. **Required.** |
| **OMDb** | https://www.omdbapi.com/apikey.aspx | Free tier. Adds real IMDB ★/10. |
| **Wyzie** | https://sub.wyzie.io | Free 1,000 req/day. Subtitles. |
| **Supabase** | https://supabase.com → New project | Free tier. Auth + database. |

In your Supabase project: **Project Settings → API** gives you the
`Project URL`, the `anon` public key, and the `service_role` secret key.

## 2. Paste keys into `.env.local`

Open `.env.local` and fill each value after the `=`. Then it's wired up.

## 3. Create the database

In Supabase: **SQL Editor → New query**, paste the entire contents of
`supabase/schema.sql`, and **edit the last line** to use the email you'll sign
up with as the master admin:

```sql
insert into public.admin_emails (email) values ('you@example.com')
```

Run it. ✅

## 4. Turn off email confirmation (so approval is the gate)

Supabase → **Authentication → Providers → Email** → turn **OFF** "Confirm email".
This way new users sign in immediately but land in a **Pending** state until you
approve them in the admin panel (that's your gate). If you'd rather keep email
confirmation on, that's fine too — they'll just confirm first, then wait for approval.

## 5. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- Sign up with **your admin email** → you're auto-approved and an admin.
- Sign up with any other email → lands in **Pending**.
- Go to **/admin** to approve, suspend (with a custom note → full-screen lock
  banner), reactivate, promote, or remove accounts.

## Notes

- **Subtitles:** Vidking's player is a sandboxed iframe, so external subtitle
  tracks can't be injected into it. Calypso shows a **Wyzie subtitle browser**
  beside the player (search by language, download `.srt`/`.vtt`); use Vidking's
  own in-player subtitle menu for on-video captions.
- Change the brand name anytime via `NEXT_PUBLIC_SITE_NAME` or `src/lib/config.ts`.
