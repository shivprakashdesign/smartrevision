# SmartRevision — Starter

## To run on StackBlitz (no install needed)
1. Go to stackblitz.com → New Project → Vite → React
2. Delete the default files it generates
3. Upload/paste all files from this folder, keeping the same structure
4. Create a `.env` file (copy `.env.example`, fill in your real Supabase URL + anon key from Supabase → Project Settings → API)
5. Terminal will auto-run `npm install` — if not, run it manually
6. `npm run dev` — you'll get a live preview + shareable link

## Supabase setup
1. Create a free project at supabase.com
2. Go to SQL Editor → paste the entire contents of the files in `supabase/migrations/` in numbered order → Run
3. Go to Authentication → Providers → enable Email (and Phone/OTP later when ready)
4. Copy your Project URL + anon key into `.env`

## Folder structure
```
src/
  screens/     — one file per screen (matches the MVP spec's Screens section)
  components/  — reusable pieces (cards, buttons, etc.) — currently empty, add as you build
  lib/
    supabase.js  — the Supabase client, already wired to .env
```

## Build order (from the spec — do these in sequence)
1. Auth + account_type + profile selector + school/class matching
2. Topic CRUD + schedule generation
3. Due Today list + revision completion flow
4. Recall cards + journal
5. Adaptive "struggled" logic
6. Leaderboard
7. Notifications (this is the one step that needs real device testing later, not just browser)
8. Learn Section
9. Referral
10. Parent multi-child polish

## When you're ready for the Android app (not yet)
This is the point you'll need Android Studio installed locally:
```
npx cap init smartrevision com.goodstudentsclub.smartrevision
npm install @capacitor/android
npx cap add android
npx cap sync
npx cap open android
```
Not needed until you're testing on a real phone — everything above runs fine as a web app first.
