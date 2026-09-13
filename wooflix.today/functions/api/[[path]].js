// WooFlix TMDB V2.1 - Cloudflare Pages Function
// Path: /functions/api/[[path]].js
// Required:
//   TMDB_KEY   = one TMDB API key
//   TMDB_CACHE = Cloudflare KV namespace binding
// Optional:
//   TMDB_IMAGES   = Cloudflare R2 bucket binding for poster/backdrop mirror
//   REFRESH_TOKEN = token for /api/refresh-home?token=...
// V2.1 change:
//   If TMDB is unavailable and KV is still empty, homepage/list endpoints return a static fallback JSON
//   instead of 503, so the site does not go blank during a temporary TMDB/key/IP limit.

const HOME_REFRESH_PATHS = [
  "/trending/all/day?language=en-US&page=1",
  "/trending/all/day?language=en-US&page=2",
  "/trending/all/week?language=en-US&page=1",
  "/trending/all/week?language=en-US&page=2",
  "/trending/movie/day?language=en-US&page=1",
  "/trending/movie/week?language=en-US&page=1",
  "/trending/tv/day?language=en-US&page=1",
  "/trending/tv/week?language=en-US&page=1",
  "/movie/popular?language=en-US&page=1",
  "/movie/popular?language=en-US&page=2",
  "/tv/popular?language=en-US&page=1",
  "/tv/popular?language=en-US&page=2",
  "/movie/top_rated?language=en-US&page=1",
  "/tv/top_rated?language=en-US&page=1",
  "/movie/now_playing?language=en-US&page=1",
  "/movie/upcoming?language=en-US&page=1"
];

const FALLBACK_MOVIES = [
  { id: 27205, media_type: "movie", title: "Inception", release_date: "2010-07-15", vote_average: 8.4, poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", backdrop_path: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg", overview: "A thief who steals corporate secrets through dream-sharing technology is given a chance to erase his criminal history." },
  { id: 157336, media_type: "movie", title: "Interstellar", release_date: "2014-11-05", vote_average: 8.4, poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", backdrop_path: "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg", overview: "Explorers travel through a wormhole in space in an attempt to ensure humanity's survival." },
  { id: 155, media_type: "movie", title: "The Dark Knight", release_date: "2008-07-16", vote_average: 8.5, poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", backdrop_path: "/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg", overview: "Batman faces the Joker, a criminal mastermind who throws Gotham into chaos." },
  { id: 550, media_type: "movie", title: "Fight Club", release_date: "1999-10-15", vote_average: 8.4, poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg", overview: "An insomniac office worker and a soap maker form an underground fight club." },
  { id: 603, media_type: "movie", title: "The Matrix", release_date: "1999-03-31", vote_average: 8.2, poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", backdrop_path: "/icmmSD4vTTDKOq2vvdulafOGw93.jpg", overview: "A hacker discovers the shocking truth about his reality." },
  { id: 680, media_type: "movie", title: "Pulp Fiction", release_date: "1994-09-10", vote_average: 8.5, poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg", overview: "Interwoven stories of crime and consequence in Los Angeles." },
  { id: 13, media_type: "movie", title: "Forrest Gump", release_date: "1994-06-23", vote_average: 8.5, poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", backdrop_path: "/qdIMHd4sEfJSckfVJfKQvisL02a.jpg", overview: "A kind-hearted man witnesses and influences several defining historical events." },
  { id: 19995, media_type: "movie", title: "Avatar", release_date: "2009-12-15", vote_average: 7.6, poster_path: "/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg", backdrop_path: "/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg", overview: "A former Marine becomes involved in the world of Pandora and its people." },
  { id: 299536, media_type: "movie", title: "Avengers: Infinity War", release_date: "2018-04-25", vote_average: 8.2, poster_path: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg", backdrop_path: "/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg", overview: "The Avengers and their allies face the powerful Thanos." },
  { id: 299534, media_type: "movie", title: "Avengers: Endgame", release_date: "2019-04-24", vote_average: 8.3, poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg", backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", overview: "The remaining Avengers attempt to reverse the damage caused by Thanos." },
  { id: 120, media_type: "movie", title: "The Lord of the Rings: The Fellowship of the Ring", release_date: "2001-12-18", vote_average: 8.4, poster_path: "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg", backdrop_path: "/x2RS3uTcsJJ9IfjNPcgDmukoEcQ.jpg", overview: "A young hobbit begins a journey to destroy a powerful ring." },
  { id: 238, media_type: "movie", title: "The Godfather", release_date: "1972-03-14", vote_average: 8.7, poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", backdrop_path: "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg", overview: "The aging patriarch of an organized crime dynasty transfers control to his reluctant son." }
];

const FALLBACK_TV = [
  { id: 1396, media_type: "tv", name: "Breaking Bad", first_air_date: "2008-01-20", vote_average: 8.9, poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg", overview: "A chemistry teacher turns to manufacturing drugs after a terminal diagnosis." },
  { id: 1399, media_type: "tv", name: "Game of Thrones", first_air_date: "2011-04-17", vote_average: 8.4, poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg", overview: "Noble families fight for control of the Iron Throne." },
  { id: 66732, media_type: "tv", name: "Stranger Things", first_air_date: "2016-07-15", vote_average: 8.6, poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", backdrop_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg", overview: "Kids in a small town uncover secret experiments and supernatural forces." },
  { id: 100088, media_type: "tv", name: "The Last of Us", first_air_date: "2023-01-15", vote_average: 8.6, poster_path: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg", backdrop_path: "/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg", overview: "A hardened survivor escorts a teenager across a post-apocalyptic world." },
  { id: 76479, media_type: "tv", name: "The Boys", first_air_date: "2019-07-25", vote_average: 8.5, poster_path: "/stTEycfG9928HYGEISBFaG1ngjM.jpg", backdrop_path: "/mGVrXeIjyecj6TKmwPVpHlscEmw.jpg", overview: "A group of vigilantes takes on corrupt superheroes." },
  { id: 82856, media_type: "tv", name: "The Mandalorian", first_air_date: "2019-11-12", vote_average: 8.4, poster_path: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg", backdrop_path: "/o7qi2v4uWQ8bZ1tW3KI0Ztn2epk.jpg", overview: "A lone bounty hunter travels the outer reaches of the galaxy." },
  { id: 85552, media_type: "tv", name: "Euphoria", first_air_date: "2019-06-16", vote_average: 8.3, poster_path: "/jtnfNzqZwN4E32FGGxx1YZaBWWf.jpg", backdrop_path: "/9KnIzPCv9XpWA0MqmwiKBZvV1Sj.jpg", overview: "A group of high school students navigate identity, trauma, and relationships." },
  { id: 94997, media_type: "tv", name: "House of the Dragon", first_air_date: "2022-08-21", vote_average: 8.3, poster_path: "/z2yahl2uefxDCl0nogcRBstwruJ.jpg", backdrop_path: "/7JQ7aQz1uDMG2mfFat3clRnrPoA.jpg", overview: "The history of House Targaryen unfolds before Game of Thrones." },
  { id: 94605, media_type: "tv", name: "Arcane", first_air_date: "2021-11-06", vote_average: 8.7, poster_path: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg", backdrop_path: "/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg", overview: "Two sisters find themselves on opposite sides of a brewing conflict." },
  { id: 110492, media_type: "tv", name: "Peacemaker", first_air_date: "2022-01-13", vote_average: 8.2, poster_path: "/hE3LRZAY84fG19a18pzpkZERjTE.jpg", backdrop_path: "/ctxm191q5o3axFzQsvNPlbKoSYv.jpg", overview: "An antihero joins a black ops team after recovering from injury." },
  { id: 1429, media_type: "tv", name: "Attack on Titan", first_air_date: "2013-04-07", vote_average: 8.7, poster_path: "/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg", backdrop_path: "/2meX1nMdScFOoV4370rqHWKmXhY.jpg", overview: "Humanity fights for survival behind walls against giant Titans." },
  { id: 37854, media_type: "tv", name: "One Piece", first_air_date: "1999-10-20", vote_average: 8.7, poster_path: "/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg", backdrop_path: "/4Mt7WHox67uJ1yErwTBFcV8KWgG.jpg", overview: "A pirate crew sails in search of the legendary treasure One Piece." }
];

export async function onRequest(context) {
  const { request, env } = context;
  const ctx = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  if (url.pathname === "/api/cache-status") {
    return json({
      ok: true,
      tmdbKey: Boolean(getTmdbKey(env)),
      kvBinding: Boolean(getKv(env)),
      r2Images: Boolean(getR2(env)),
      mode: "KV cache-first, stale-if-error, static fallback, no key rotation",
      test: "/api/tmdb/trending/all/day?language=en-US&page=1"
    }, 200, "no-store");
  }

  if (url.pathname === "/api/refresh-home") return handleHomeRefresh(request, env, ctx, url);
  if (url.pathname.startsWith("/api/tmdb/")) return handleTmdbApi(request, env, ctx, url);
  if (url.pathname.startsWith("/api/tmdb-img/")) return handleTmdbImage(request, env, ctx, url);

  return new Response("Not found", { status: 404, headers: corsHeaders() });
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "X-WooFlix-Cache, X-WooFlix-Image-Cache, X-WooFlix-Upstream-Error",
    ...extra
  };
}

function getTmdbKey(env) {
  // No rotation: use only one key. If old TMDB_KEYS exists, only the first key is used for compatibility.
  return String(env.TMDB_KEY || env.TMDB_API_KEY || env.TMDB_KEYS || "")
    .split(",")[0]
    .trim();
}

function getKv(env) {
  return env.TMDB_CACHE || env.WOOFLIX_TMDB_CACHE || env.WOOFLIX_CACHE || null;
}

function getR2(env) {
  return env.TMDB_IMAGES || env.WOOFLIX_TMDB_IMAGES || null;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function cachePolicy(pathname) {
  const p = pathname.replace("/api/tmdb", "");
  if (p.startsWith("/configuration")) return { fresh: 30 * 86400, stale: 180 * 86400 };
  if (p.includes("/trending") || p.includes("/popular") || p.includes("/top_rated") || p.includes("/now_playing") || p.includes("/upcoming") || p.includes("/discover")) {
    return { fresh: 6 * 3600, stale: 30 * 86400 };
  }
  if (p.includes("/search")) return { fresh: 24 * 3600, stale: 14 * 86400 };
  if (p.includes("/credits") || p.includes("/videos") || p.includes("/images") || p.includes("/recommendations") || p.includes("/similar")) {
    return { fresh: 14 * 86400, stale: 90 * 86400 };
  }
  if (/^\/(movie|tv|person)\/\d+/.test(p)) return { fresh: 7 * 86400, stale: 90 * 86400 };
  return { fresh: 24 * 3600, stale: 60 * 86400 };
}

function normalizeProxyUrl(url) {
  const params = new URLSearchParams(url.searchParams);
  params.delete("api_key");
  if (!params.has("language")) params.set("language", "en-US");
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(sorted).toString();
  return url.pathname + (qs ? "?" + qs : "");
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function makeKvKey(url) {
  return "tmdb:wooflix:v2.1:" + await sha256Hex(normalizeProxyUrl(url));
}

function responseFromEntry(entry, cacheState, browserMaxAge = 300, extra = {}) {
  return new Response(entry.body, {
    status: entry.status || 200,
    headers: corsHeaders({
      "Content-Type": entry.contentType || "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${browserMaxAge}, stale-while-revalidate=86400`,
      "X-WooFlix-Cache": cacheState,
      ...extra
    })
  });
}

async function handleTmdbApi(request, env, ctx, url) {
  const kv = getKv(env);
  if (!kv) {
    return json({
      error: true,
      message: "Missing KV binding. Create a Cloudflare KV namespace and bind it as TMDB_CACHE."
    }, 500, "no-store");
  }

  if (!getTmdbKey(env)) {
    const fallback = createStaticFallback(url);
    if (fallback) return responseFromStaticFallback(fallback, "NO-TMDB-KEY-STATIC-FALLBACK");
    return json({
      error: true,
      message: "Missing TMDB_KEY environment variable. V2 uses one key only, no rotation."
    }, 500, "no-store");
  }

  const key = await makeKvKey(url);
  const policy = cachePolicy(url.pathname);
  const now = nowSeconds();
  let oldEntry = null;

  try {
    oldEntry = await kv.get(key, { type: "json" });
  } catch (_) {
    oldEntry = null;
  }

  if (oldEntry && oldEntry.body) {
    if (oldEntry.freshUntil && oldEntry.freshUntil > now) {
      return responseFromEntry(oldEntry, "KV-HIT", 600);
    }
    if (oldEntry.staleUntil && oldEntry.staleUntil > now) {
      ctx.waitUntil(fetchTmdbAndStore(url, env, key, policy).catch(() => null));
      return responseFromEntry(oldEntry, "KV-STALE-REFRESHING", 120);
    }
  }

  try {
    const freshEntry = await fetchTmdbAndStore(url, env, key, policy);
    return responseFromEntry(freshEntry, "TMDB-LIVE-STORED", 300);
  } catch (err) {
    if (oldEntry && oldEntry.body) {
      return responseFromEntry(oldEntry, "STALE-IF-ERROR", 60, {
        "X-WooFlix-Upstream-Error": safeHeader(err && err.message ? err.message : "TMDB error")
      });
    }

    const fallback = createStaticFallback(url);
    if (fallback) {
      ctx.waitUntil(storeFallback(kv, key, fallback, url));
      return responseFromStaticFallback(fallback, "STATIC-FALLBACK", err);
    }

    return json({
      error: true,
      message: err && err.message ? err.message : "TMDB unavailable and no cached data exists yet",
      hint: "For first deploy, call /api/refresh-home after TMDB_KEY and TMDB_CACHE are set. If this is 401/403, replace TMDB_KEY."
    }, 503, "no-store");
  }
}

async function fetchTmdbAndStore(proxyUrl, env, kvKey, policy) {
  const tmdbKey = getTmdbKey(env);
  const kv = getKv(env);
  const path = proxyUrl.pathname.replace("/api/tmdb", "");
  const upstream = new URL("https://api.themoviedb.org/3" + path);

  for (const [key, value] of proxyUrl.searchParams.entries()) {
    if (key !== "api_key") upstream.searchParams.set(key, value);
  }
  if (!upstream.searchParams.has("language")) upstream.searchParams.set("language", "en-US");
  upstream.searchParams.set("api_key", tmdbKey);

  const res = await fetch(upstream.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "WooFlix-TMDB-KV-Cache"
    }
  });

  const body = await res.text();

  if (!res.ok) {
    let message = `TMDB ${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed && (parsed.status_message || parsed.message)) message += ` - ${parsed.status_message || parsed.message}`;
    } catch (_) {}
    throw new Error(message);
  }

  const now = nowSeconds();
  const entry = {
    status: 200,
    contentType: res.headers.get("Content-Type") || "application/json; charset=utf-8",
    body,
    savedAt: now,
    freshUntil: now + policy.fresh,
    staleUntil: now + policy.stale,
    normalizedUrl: normalizeProxyUrl(proxyUrl)
  };

  await kv.put(kvKey, JSON.stringify(entry), { expirationTtl: Math.max(policy.stale, 86400) });
  return entry;
}

function createStaticFallback(url) {
  const p = url.pathname.replace("/api/tmdb", "");
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const offset = page % 2 === 0 ? 6 : 0;

  let results = null;
  if (p.startsWith("/trending/all")) {
    results = interleave(FALLBACK_MOVIES, FALLBACK_TV);
  } else if (p.startsWith("/trending/movie") || p.startsWith("/movie/popular") || p.startsWith("/movie/top_rated") || p.startsWith("/movie/now_playing") || p.startsWith("/movie/upcoming") || p.startsWith("/discover/movie")) {
    results = FALLBACK_MOVIES;
  } else if (p.startsWith("/trending/tv") || p.startsWith("/tv/popular") || p.startsWith("/tv/top_rated") || p.startsWith("/discover/tv")) {
    results = FALLBACK_TV;
  }

  if (!results) return null;
  const rotated = results.slice(offset).concat(results.slice(0, offset));
  return {
    page,
    results: rotated,
    total_pages: 2,
    total_results: rotated.length * 2,
    fallback: true,
    source: "wooflix-static-fallback"
  };
}

function interleave(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

async function storeFallback(kv, key, data, proxyUrl) {
  const now = nowSeconds();
  const body = JSON.stringify(data);
  const entry = {
    status: 200,
    contentType: "application/json; charset=utf-8",
    body,
    savedAt: now,
    freshUntil: now + 3600,
    staleUntil: now + 7 * 86400,
    normalizedUrl: normalizeProxyUrl(proxyUrl),
    fallback: true
  };
  await kv.put(key, JSON.stringify(entry), { expirationTtl: 7 * 86400 });
}

function responseFromStaticFallback(data, cacheState, err) {
  const extra = { "X-WooFlix-Cache": cacheState };
  if (err && err.message) extra["X-WooFlix-Upstream-Error"] = safeHeader(err.message);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      ...extra
    })
  });
}

async function handleTmdbImage(request, env, ctx, url) {
  const imagePath = url.pathname.replace("/api/tmdb-img/", "");
  if (!imagePath || imagePath.includes("..") || imagePath.startsWith("/") || imagePath.startsWith("http")) {
    return new Response("Bad image path", { status: 400, headers: corsHeaders() });
  }

  const r2 = getR2(env);
  const r2Key = imagePath;

  if (r2) {
    const obj = await r2.get(r2Key);
    if (obj) {
      return new Response(obj.body, {
        headers: corsHeaders({
          "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=2592000, immutable",
          "ETag": obj.httpEtag || "",
          "X-WooFlix-Image-Cache": "R2-HIT"
        })
      });
    }
  }

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCors(cached, { "X-WooFlix-Image-Cache": "EDGE-HIT" });

  const upstream = "https://image.tmdb.org/t/p/" + imagePath;
  const res = await fetch(upstream, {
    headers: { "User-Agent": "LunaStream-TMDB-Image-Cache" },
    cf: { cacheEverything: true, cacheTtl: 2592000 }
  });

  if (!res.ok) {
    return new Response("Image unavailable", {
      status: res.status,
      headers: corsHeaders({ "Cache-Control": "public, max-age=300" })
    });
  }

  const contentType = res.headers.get("Content-Type") || "image/jpeg";
  const buffer = await res.arrayBuffer();

  if (r2) {
    ctx.waitUntil(r2.put(r2Key, buffer.slice(0), {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=2592000, immutable"
      }
    }));
  }

  const response = new Response(buffer.slice(0), {
    status: 200,
    headers: corsHeaders({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=2592000, stale-while-revalidate=2592000",
      "X-WooFlix-Image-Cache": r2 ? "TMDB-LIVE-R2-STORING" : "TMDB-LIVE-EDGE-STORING"
    })
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleHomeRefresh(request, env, ctx, url) {
  const token = env.REFRESH_TOKEN || "";
  if (!token || url.searchParams.get("token") !== token) {
    return json({ error: true, message: "Missing or invalid REFRESH_TOKEN" }, 401, "no-store");
  }
  const result = await refreshHomeCache(env, url.origin);
  return json(result, 200, "no-store");
}

async function refreshHomeCache(env, origin = "https://lunastream.local") {
  const kv = getKv(env);
  const results = [];
  if (!kv) return { ok: false, message: "Missing TMDB_CACHE KV binding" };
  if (!getTmdbKey(env)) return { ok: false, message: "Missing TMDB_KEY" };

  for (const path of HOME_REFRESH_PATHS) {
    const proxyUrl = new URL(origin + "/api/tmdb" + path);
    const key = await makeKvKey(proxyUrl);
    const policy = cachePolicy(proxyUrl.pathname);
    try {
      await fetchTmdbAndStore(proxyUrl, env, key, policy);
      results.push({ path, ok: true, source: "tmdb" });
    } catch (err) {
      const fallback = createStaticFallback(proxyUrl);
      if (fallback) {
        await storeFallback(kv, key, fallback, proxyUrl);
        results.push({ path, ok: true, source: "static-fallback", message: err && err.message ? err.message : "TMDB failed" });
      } else {
        results.push({ path, ok: false, message: err && err.message ? err.message : "refresh failed" });
      }
    }
  }

  return { ok: true, refreshed: results.length, results };
}

function json(data, status = 200, cacheControl = "public, max-age=60") {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl
    })
  });
}

function withCors(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(extra))) {
    if (v !== "") headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, headers });
}

function safeHeader(value) {
  return String(value).replace(/[\r\n]/g, " ").slice(0, 180);
}
