# WooFlix — Cloudflare Pages Functions (same deployment model as LunaStream)

This build uses Cloudflare Pages Functions.

IMPORTANT:
- You DO NOT create a Worker Route.
- You DO NOT manually map `wooflix.today/api/*`.
- Cloudflare Pages automatically maps:
  `functions/api/[[path]].js`
  to:
  `/api/*`

## Included structure

wooflix.today/
├── functions/
│   └── api/
│       └── [[path]].js
├── worker.js
├── index.html
├── js/
└── ...

`worker.js` is included only as an optional standalone copy.
For the normal WooFlix deployment, Pages uses `functions/api/[[path]].js`.

## Cloudflare Pages configuration

Deploy this folder/project to your existing WooFlix Cloudflare Pages project
using the same method you use for LunaStream.

Then configure the Pages project:

### 1. TMDB secret

Settings -> Variables and Secrets

Name:
TMDB_KEY

Value:
your TMDB v3 API key

### 2. KV binding

Create or select a Cloudflare KV namespace.

Bind it to the Pages project with:

Variable name:
TMDB_CACHE

KV namespace:
your WooFlix TMDB cache namespace

After adding or changing Variables/Bindings, redeploy the Pages project.

### Optional

REFRESH_TOKEN
- Secret used by `/api/refresh-home?token=...`

TMDB_IMAGES
- Optional R2 bucket binding for poster/backdrop caching.

## No Worker Route required

Do NOT create:
`wooflix.today/api/*`

The file:
`functions/api/[[path]].js`

automatically provides:
- `/api/cache-status`
- `/api/tmdb/...`
- `/api/tmdb-img/...`
- `/api/refresh-home`

## Test

After redeploy:

https://wooflix.today/api/cache-status

Expected:
{
  "ok": true,
  "tmdbKey": true,
  "kvBinding": true
}

Then test:

https://wooflix.today/api/tmdb/trending/all/day?language=en-US&page=1

The WooFlix frontend already calls `/api/tmdb` and `/api/tmdb-img`,
so no frontend route configuration is necessary.

## Streaming servers

The Select Source Server list is still centralized at:

https://soap2day1.my/server.js

Current shared order is controlled there, including:
1. CineSrc
2. PeeStream
3. Cinezo
