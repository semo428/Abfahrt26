'use strict';
// Gäste-Endpunkte. Ein Gerät wird über ein zufälliges Token (Bearer) erkannt; in der DB liegt nur dessen Hash.
const config = require('../config');
const { pool, mapPgError } = require('../db');
const { ApiError } = require('../errors');
const { Limiter } = require('../ratelimit');
const { newToken, hashToken, bearer } = require('../auth');
const v = require('../validate');
const { PLAYER_COLS: COLS, revealed, mask } = require('../game');
const STATS_SQL = `
  select json_build_object(
    'players',    (select count(*) from players)::int,
    'vibe_avg',   (select round(avg(stars)::numeric, 2) from vibes)::float8,
    'vibe_count', (select count(*) from vibes)::int,
    'recent',     coalesce((select json_agg(x) from (
                    select p.fun_name, v.stars, v.text
                    from vibes v join players p on p.id = v.player_id
                    order by v.created_at desc limit 3) x), '[]'::json),
    'sample',     coalesce((select json_agg(y) from (
                    select p.fun_name, v.stars, v.text
                    from vibes v join players p on p.id = v.player_id
                    order by random() limit 7) y), '[]'::json)
  ) as s`;
// Live-Auslosung: Spaßnamen zum Durchwürfeln und (erst ab reveal_at) die Gewinner – nur Spaßname + Gewinn
const NAMES_SQL = 'select coalesce(json_agg(fun_name), \'[]\'::json) as n from (select fun_name from players where photo_at is not null and vibe_at is not null order by random() limit 80) x';
const WINNERS_SQL = "select coalesce(json_agg(json_build_object('fun_name', fun_name, 'prize', prize)), '[]'::json) as w from players where status in ('drawn', 'won') and prize is not null";

// Ergebnis einer teuren Abfrage für ttl ms zwischenspeichern; parallele Anfragen teilen sich eine DB-Abfrage
function cached(ttl, load){
  let at = 0, data, pending = null;
  return function(){
    if (at && Date.now() - at < ttl) return Promise.resolve(data);
    if (!pending){
      pending = load()
        .then(function(d){ data = d; at = Date.now(); return d; })
        .finally(function(){ pending = null; });
    }
    return pending;
  };
}

module.exports = async function(app){
  const L = config.limits;
  const registerLimit = new Limiter(L.registerPerIpPerMin, 60000);
  const tokenLimit = new Limiter(L.tokenPerMin, 60000);
  const vibeLimit = new Limiter(1, L.vibeMinIntervalSec * 1000);

  async function player(req){
    const t = bearer(req);
    if (!t) throw new ApiError(401, 'not_registered');
    const h = hashToken(t);
    if (!tokenLimit.hit(h.toString('hex'))) throw new ApiError(429, 'rate_limited');
    const { rows } = await pool.query('select ' + COLS + ' from players where token_hash = $1', [h]);
    if (!rows[0]) throw new ApiError(401, 'not_registered');
    return rows[0];
  }

  app.post('/api/register', async function(req, reply){
    if (!registerLimit.hit(req.ip)) throw new ApiError(429, 'rate_limited');
    const b = v.body(req);
    const funName = v.funName(b.fun_name);
    const ig = v.igHandle(b.ig_handle);
    const character = v.character(b.character);
    const existing = bearer(req);
    if (existing){
      const r = await pool.query('select 1 from players where token_hash = $1', [hashToken(existing)]);
      if (r.rowCount) throw new ApiError(409, 'already_registered');   // pro Gerät nur ein Eintrag
    }
    const token = newToken();
    try{
      const { rows } = await pool.query(
        'insert into players (token_hash, fun_name, ig_handle, character) values ($1, $2, $3, $4) returning ' + COLS,
        [hashToken(token), funName, ig, character]);
      reply.code(201);
      return { token, player: mask(rows[0]) };
    }catch(e){ throw mapPgError(e); }
  });

  // Gezogene sehen vor reveal_at nichts (Status/Gewinn/Code maskiert)
  app.get('/api/me', async function(req){ return mask(await player(req)); });

  // Idempotent: Zeitstempel wird nur gesetzt, wenn er noch leer ist (Offline-Puffer im Frontend sendet ggf. doppelt)
  app.post('/api/challenge', async function(req){
    const key = v.challengeKey(v.body(req).key);
    const p = await player(req);
    const { rows } = await pool.query('update players set photo_at = coalesce(photo_at, now()) where id = $1 returning ' + COLS, [p.id]);
    if (!rows[0]) throw new ApiError(401, 'not_registered');
    return mask(rows[0]);
  });

  app.post('/api/vibe', async function(req){
    const b = v.body(req);
    const stars = v.stars(b.stars);
    const text = v.vibeText(b.text);
    const p = await player(req);
    if (!vibeLimit.hit(p.id)) throw new ApiError(429, 'rate_limited');
    const { rows } = await pool.query(`
      with p as (
        update players set vibe_count = vibe_count + 1, vibe_at = coalesce(vibe_at, now())
        where id = $1 and vibe_count < $2 returning ${COLS}
      ), ins as (
        insert into vibes (player_id, stars, text) select id, $3, $4 from p
      )
      select * from p`, [p.id, config.limits.vibeMaxPerPlayer, stars, text]);
    if (!rows[0]) throw new ApiError(429, 'rate_limited');
    return mask(rows[0]);
  });

  // Öffentliche Zahlen (ohne Instagram-Namen), gecacht: alle Geräte pollen
  const statsCache = cached(config.statsCacheMs, async function(){ return (await pool.query(STATS_SQL)).rows[0].s; });
  app.get('/api/stats', function(){ return statsCache(); });

  // Um reveal_at fragen alle Handys gleichzeitig (jede Sekunde, bis Gewinner kommen) → kurz cachen, Serverzeit immer frisch
  const namesCache = cached(30000, async function(){ return (await pool.query(NAMES_SQL)).rows[0].n; });
  const winnersCache = cached(3000, async function(){ return (await pool.query(WINNERS_SQL)).rows[0].w; });
  app.get('/api/reveal', async function(){
    const names = await namesCache();
    return {
      reveal_at: config.revealAt.toISOString(),
      now: new Date().toISOString(),
      names,
      winners: revealed() ? await winnersCache() : null
    };
  });

  // Vor reveal_at darf jeder löschen (sonst verriete die Sperre, dass man gezogen wurde).
  // Danach sind drawn/won/rejected gesperrt – abgelehnte Handles bleiben so belegt.
  app.delete('/api/me', async function(req, reply){
    const p = await player(req);
    const r = revealed()
      ? await pool.query("delete from players where id = $1 and status = 'active'", [p.id])
      : await pool.query('delete from players where id = $1', [p.id]);
    if (!r.rowCount) throw new ApiError(409, 'locked_after_draw');
    return reply.code(204).send();
  });
};
