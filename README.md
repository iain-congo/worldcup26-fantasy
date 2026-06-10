# World Cup 2026 Fantasy

A private group fantasy football app for World Cup 2026. Tracks points across the tournament for a group of friends using live stats from API-Football.

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **API**: Vercel Serverless Functions (Node.js 18)
- **Storage**: Vercel KV (Redis)
- **Stats**: [API-Football](https://api-football.com) — free tier (100 requests/day)
- **Squad data**: Google Sheets (public read via Sheets API v4)

---

## Getting an API-Football Key

1. Go to [api-football.com](https://api-football.com) and click **Sign Up**
2. Verify your email
3. In the dashboard, go to **My API** → copy the value shown as **x-apisports-key**
4. Free tier gives you 100 requests/day — sufficient for the entire tournament with caching

---

## Getting a Google Sheets API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "WC26 Fantasy")
3. **APIs & Services → Library** → search **Google Sheets API** → Enable
4. **APIs & Services → Credentials → Create Credentials → API Key**
5. Edit the key → **API restrictions → Restrict key → Google Sheets API** → Save
6. Open your Google Sheet → Share → **Anyone with the link** → Viewer

---

## Setup & Deployment

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|----------|----------------|
| `API_FOOTBALL_KEY` | api-football.com dashboard → My API |
| `GOOGLE_API_KEY` | Google Cloud Console → Credentials |
| `ADMIN_PASSWORD` | Choose any password (min 8 chars) |
| `KV_REST_API_URL` | Vercel KV dashboard (after step 4) |
| `KV_REST_API_TOKEN` | Vercel KV dashboard (after step 4) |

### 3. Create Vercel project

```bash
npm install -g vercel
vercel          # follow prompts to create project and link to GitHub repo
```

### 4. Add KV store

In Vercel dashboard: **Storage → KV → Create Store → Connect to project**

Copy the `KV_REST_API_URL` and `KV_REST_API_TOKEN` shown and add them to:
- Your `.env.local` file (local development)
- Vercel dashboard → Project → Settings → Environment Variables (production)

### 5. Add all env vars to Vercel dashboard

Set `API_FOOTBALL_KEY`, `GOOGLE_API_KEY`, `ADMIN_PASSWORD` (and KV vars) in:
Vercel Dashboard → Project → Settings → Environment Variables

### 6. Deploy

```bash
vercel --prod
```

### 7. Seed initial data

Visit `https://your-app.vercel.app/admin` and in **Section 3**:
- Click **Refresh Fixture List** — this seeds the fixture schedule into KV (1 API call)
- Verify Section 1 shows all 9 GWs listed

### 8. Lock GW1 before June 11

In Admin → Section 1, click **Lock GW1** before the first match on June 11.

### 9. Share with managers

Share the app URL with all managers. Done!

---

## Running Locally

```bash
vercel dev
```

Use `vercel dev` (not `npm run dev`) — it runs the Vercel serverless functions locally and connects to your KV store via `.env.local`.

---

## Gameweek Locking Schedule

Lock each GW **before** the first match in that round starts. Go to `/admin` → Section 1.

| GW | Round | Lock Before |
|----|-------|-------------|
| GW1 | Group Stage Match 1 | Jun 11 (tournament kickoff) |
| GW2 | Group Stage Match 2 | ~Jun 19 (after all GW1 group matches) |
| GW3 | Group Stage Match 3 | ~Jun 23 (after all GW2 group matches) |
| GW4 | Round of 32 | Jun 28 |
| GW5 | Round of 16 | Jul 4 |
| GW6 | Quarter-finals | Jul 9 |
| GW7 | Semi-finals | Jul 14 |
| GW8 | Bronze Final | Jul 18 |
| GW9 | Final | Jul 19 |

**Group stage (GW1–3): lock manually** — this enforces the substitution deadline.  
**Knockout rounds (GW4–9): auto-snapshotted** by the daily cron at 05:00 UTC as a safety net.

---

## Making a Substitution

1. Manager updates the Google Sheet (swaps their player)
2. Admin goes to `/admin` → Section 1 and locks the **next GW** snapshot
3. The new player is captured in that snapshot; historical GWs are unaffected
4. The substitution log on the manager's page updates automatically (compares snapshots)

---

## Adding a Player Name Override

If a player shows "⚠ Unmatched" in the UI, their name in the Google Sheet doesn't match what API-Football returns.

1. Go to `/admin` → Section 2 — Unmatched Players
2. Find the player in the list
3. Enter the exact player name as API-Football returns it (check their website or the stats endpoint)
4. Click **Save** — the override is stored and applied immediately

---

## Monitoring API Usage

Go to `/admin` → Section 4 — API Call Log. Shows calls made per day for the last 7 days.

- Free tier limit: 100 requests/day
- A warning appears if any day exceeded 80 calls
- Each finished fixture requires 2 API calls (players + events), cached forever
- Busiest day expected: ~8–10 calls (4 group matches × 2)

---

## Google Sheet Format

Sheet ID: `182mXrhBfUD0Oes654uIpBJaDaUvnJbwuVxnJ0IVaqtw`  
Tab: `Players`

| Manager | Player | Nation | Position |
|---------|--------|--------|----------|
| Neil | Maignan | France | GK |
| Neil | Cucurella | Spain | DEF |
| ... | | | |

**Position values**: `GK`, `DEF`, `MID`, `FWD`  
**Each manager must have exactly**: 1 GK, 2 DEF, 3 MID/FWD (6 total)

---

## Scoring Rules

| Event | Points |
|-------|--------|
| Played < 60 mins | +1 |
| Played ≥ 60 mins | +2 |
| Goal (GK/DEF) | +6 |
| Goal (MID/FWD) | +5 |
| Assist | +3 |
| Clean sheet (GK) | +6 |
| Clean sheet (DEF) | +4 |
| Red card | −2 |
| Own goal | −2 |

**Clean sheet**: requires playing full match duration. Full match = 90 mins (FT) or 120 mins (AET/PEN).
