# WooFlix — Cloudflare Worker deployment

This package keeps the existing WooFlix interface and centralized streaming-server configuration,
but moves TMDB API traffic behind `worker.js`.

## Architecture

Browser:
- `https://soap2day1.my/server.js` -> shared video/server list
- `/api/tmdb/...` -> Cloudflare Worker -> TMDB API
- `/api/tmdb-img/...` -> Cloudflare Worker -> TMDB images

The TMDB key is no longer stored in the public frontend bundle.

## Cloudflare setup

1. Open Cloudflare Dashboard -> Workers & Pages -> Create -> Worker.
2. Paste the contents of `worker.js` and deploy it.
3. Add a Worker route:
   - `wooflix.today/api/*`
   - Add `www.wooflix.today/api/*` too if the site is served from www.

## Required Worker bindings

### TMDB key
Worker -> Settings -> Variables and Secrets:
- Name: `TMDB_KEY`
- Value: your TMDB v3 API key
- Prefer storing it as a Secret.

### KV cache
Cloudflare -> Storage & Databases -> KV -> Create namespace.
Bind the namespace to the Worker as:
- Variable name: `TMDB_CACHE`

This binding is required by this worker.

## Optional bindings

### R2 image cache
Create an R2 bucket and bind it as:
- Variable name: `TMDB_IMAGES`

If omitted, TMDB images still work through Cloudflare edge cache.

### Manual refresh token
Create a Worker secret:
- `REFRESH_TOKEN`

Then you can refresh the homepage cache with:
`https://wooflix.today/api/refresh-home?token=YOUR_TOKEN`

You can clear the cached homepage endpoints with:
`https://wooflix.today/api/clear-home-cache?token=YOUR_TOKEN`

## Optional Cron Trigger

Worker -> Settings -> Triggers -> Cron Triggers.
A reasonable schedule is every 6 hours:
`0 */6 * * *`

The scheduled handler refreshes common homepage TMDB endpoints.

## Tests after deployment

Open:
- `https://wooflix.today/api/cache-status`
- `https://wooflix.today/api/tmdb/trending/all/day?language=en-US&page=1`

The first endpoint should report:
- `tmdbKey: true`
- `kvBinding: true`

Then open the WooFlix homepage and verify posters, trending titles, search, movie details,
TV details, seasons/episodes, and the Select Source Server panel.

## Central streaming server list

The player source list remains centralized at:
`https://soap2day1.my/server.js`

Changing CineSrc/Cinezo/PeeStream ordering or URLs there updates all converted sites without
editing this WooFlix bundle again.
