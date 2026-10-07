'use strict';
// Gäste-Endpunkte. Ein Gerät wird über ein zufälliges Token (Bearer) erkannt; in der DB liegt nur dessen Hash.
const config = require('../config');
const { pool, mapPgError } = require('../db');
const { ApiError } = require('../errors');
const { Limiter } = require('../ratelimit');
const { newToken, hashToken, bearer } = require('../auth');
const v = require('../validate');

const COLS = 'id, fun_name, ig_handle, character, random_at, vibe_at, pose_at, status, win_code, created_at';
const STATS_SQL = `
  select json_build_object(
    'players',    (select count(*) from players)::int,
    'vibe_avg',   (select round(avg(stars)::numeric, 2) from vibes)::float8,
    'vibe_count', (select count(*) from vibes)::int,
    'recent',     coalesce((select json_agg(x) from (
                    select p.fun_name, v.stars, v.text
                    from vibes v join players p on p.id = v.player_id
                    order by v.created_at desc limit 3) x), '[]'::json)
  ) as s`;

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
      return { token, player: rows[0] };
    }catch(e){ throw mapPgError(e); }
  });

  app.get('/api/me', async function(req){ return player(req); });

  // Idempotent: Zeitstempel wird nur gesetzt, wenn er noch leer ist (Offline-Puffer im Frontend sendet ggf. doppelt)
  app.post('/api/challenge', async function(req){
    const key = v.challengeKey(v.body(req).key);
    const p = await player(req);
    const col = key === 'random' ? 'random_at' : 'pose_at';
    const { rows } = await pool.query('update players set ' + col + ' = coalesce(' + col + ', now()) where id = $1 returning ' + COLS, [p.id]);
    if (!rows[0]) throw new ApiError(401, 'not_registered');
    return rows[0];
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
    return rows[0];
  });

  // Öffentliche Zahlen (ohne Instagram-Namen), kurz gecacht: alle Geräte pollen alle 20 s
  let cache = { at: 0, data: null }, pending = null;
  app.get('/api/stats', async function(){
    if (cache.data && Date.now() - cache.at < config.statsCacheMs) return cache.data;
    if (!pending){
      pending = pool.query(STATS_SQL)
        .then(function(r){ cache = { at: Date.now(), data: r.rows[0].s }; return cache.data; })
        .finally(function(){ pending = null; });
    }
    return pending;
  });

  // Nach der Ziehung (drawn/won/rejected) gesperrt; abgelehnte Handles bleiben so belegt
  app.delete('/api/me', async function(req, reply){
    const p = await player(req);
    const r = await pool.query("delete from players where id = $1 and status = 'active'", [p.id]);
    if (!r.rowCount) throw new ApiError(409, 'locked_after_draw');
    return reply.code(204).send();
  });
};
