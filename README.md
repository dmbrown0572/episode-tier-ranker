# Episode Tier Ranker

Rank every episode of a TV show into S–F tiers, then share a link so friends can see what
percentage of your rankings overlap.

- Episode data and episode stills come from [TMDB](https://www.themoviedb.org/).
- Rankings save automatically to your browser's local storage.
- Sharing works with no server: your whole list is compressed into the URL.

## Setup

1. Get a free TMDB API key at <https://www.themoviedb.org/settings/api> (create an account,
   then request an API key — approval is instant for personal use).
2. Copy `.env.example` to `.env` and paste the key in:

   ```
   VITE_TMDB_API_KEY=your_key_here
   ```

   On Windows, create `.env` with an editor rather than PowerShell's `Out-File -Encoding utf8` —
   that writes a byte-order mark, which Vite reads as part of the first variable's name, so the
   key silently fails to load. `Set-Content -Encoding utf8NoBOM` is safe in PowerShell 7+.

3. Install and run:

   ```bash
   npm install
   ```

   ```bash
   npm run dev
   ```

If you skip the `.env` file the app opens a Settings screen and asks for a key, which it stores
in `localStorage` for that browser only. That is also how someone else can use your deployed
copy with their own key.

## Using it

- **Search** for a show and pick it.
- **Drag** episode cards from the Unranked pool into any tier row. Hovering a card also reveals a
  row of S–F buttons for one-click assignment, which is faster for long shows. Clicking the tier
  a card is already in sends it back to Unranked.
- **Season filter** chips narrow the board to one season at a time. Placements in hidden seasons
  are preserved.
- **Share my list** copies a link to your clipboard. Anyone who opens it sees their own list for
  that show compared against yours.

## How overlap is calculated

The score is an **exact tier match percentage**: of the episodes you *both* ranked, the share you
placed in the identical tier.

```
overlap = (episodes in the same tier) / (episodes both people ranked) × 100
```

Episodes only one person ranked are reported separately and excluded from the denominator, so a
half-finished list isn't scored as disagreement.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/types.ts` | Show/episode/tier types and placement helpers |
| `src/tmdb.ts` | TMDB client: search, seasons, episodes, image URLs |
| `src/share.ts` | Compresses a list into a `?compare=` URL and back |
| `src/compare.ts` | Exact-tier-match overlap scoring |
| `src/storage.ts` | localStorage persistence for saved lists |
| `src/components/TierBoard.tsx` | Drag-and-drop tier rows and unranked pool |
| `src/components/CompareView.tsx` | Score ring and episode-by-episode breakdown |

## Build

```bash
npm run build
```

Outputs a static site to `dist/` — deployable to Netlify, Vercel, GitHub Pages, or any static
host. Note that a key placed in `.env` is baked into the built JavaScript and therefore public;
for a public deployment, leave `.env` empty and let each visitor supply their own key in Settings.

Data provided by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
