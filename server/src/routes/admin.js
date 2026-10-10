'use strict';
// Team-Endpunkte (zusätzlich per Traefik-Basic-Auth geschützt). Session über httpOnly-Cookie.
const config = require('../config');
const { pool, tx } = require('../db');
const { ApiError } = require('../errors');
const { Limiter } = require('../ratelimit');
const { newToken, hashToken, cookie, hashPassword, verifyPassword } = require('../auth');
const { drawAll, drawFor, lock, retryOnCodeClash } = require('../draw');
const v = require('../validate');

const { ELIGIBLE } = require('../game');

const COOKIE = 'ab_admin';
// winners = alle Gezogenen mit Gewinn; checked = Story geprüft (won), sonst noch prüfen (drawn)
const OVERVIEW_SQL = `
  select json_build_object(
    'total',    (select count(*) from players)::int,
    'eligible', (select count(*) from players where ${ELIGIBLE})::int,
    'photo',    (select count(*) from players where photo_at is not null)::int,
    'vibe',     (select count(*) from players where vibe_at is not null)::int,
    'winners',  coalesce((select json_agg(json_build_object('id', id, 'fun_name', fun_name, 'ig_handle', ig_handle, 'prize', prize,
                            'win_code', win_code, 'checked', status = 'won') order by array_position($1::text[], prize), fun_name)
                          from players where status in ('drawn', 'won') and prize is not null), '[]'::json)
  ) as o`;

module.exports = async function(app){
  const window15 = 15 * 60 * 1000;
  const loginIpLimit = new Limiter(config.limits.adminLoginPer15Min, window15);
  const loginEmailLimit = new Limiter(config.limits.adminLoginPer15Min, window15);
  const dummyHash = await hashPassword('dummy-password-for-timing');   // gleiche Antwortzeit bei unbekannter E-Mail
  const maxAge = config.adminSessionHours * 3600;

  async function admin(req){
    const t = cookie(req, COOKIE);
    if (!t) throw new ApiError(401, 'not_admin');
    const { rows } = await pool.query('select admin_id from admin_sessions where token_hash = $1 and expires_at > now()', [hashToken(t)]);
    if (!rows[0]) throw new ApiError(401, 'not_admin');
    return rows[0].admin_id;
  }

  app.post('/api/admin/login', async function(req, reply){
    const b = v.body(req);
    const email = v.email(b.email);
    const pw = v.password(b.password);
    if (!loginIpLimit.hit(req.ip) || !loginEmailLimit.hit(email)) throw new ApiError(429, 'rate_limited');
    const { rows } = await pool.query('select id, pw_hash from admins where email = $1', [email]);
    const ok = await verifyPassword(pw, rows[0] ? rows[0].pw_hash : dummyHash);
    if (!rows[0] || !ok) throw new ApiError(401, 'not_admin');
    const token = newToken();
    await pool.query('delete from admin_sessions where expires_at <= now()');
    await pool.query("insert into admin_sessions (token_hash, admin_id, expires_at) values ($1, $2, now() + make_interval(secs => $3))",
      [hashToken(token), rows[0].id, maxAge]);
    reply.header('set-cookie', COOKIE + '=' + token + '; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge);
    return reply.code(204).send();
  });

  app.get('/api/admin/session', async function(req){
    try{ await admin(req); return { admin: true }; }
    catch(e){ if (e instanceof ApiError) return { admin: false }; throw e; }
  });

  const prizeKeys = config.prizes.map(function(p){ return p.key; });
  async function overview(){ return (await pool.query(OVERVIEW_SQL, [prizeKeys])).rows[0].o; }

  app.get('/api/admin/overview', async function(req){
    await admin(req);
    return overview();
  });

  // Füllt alle freien Gewinnplätze (Anzahlen aus PRIZES) zufällig aus dem Lostopf (2/2, Status active)
  app.post('/api/admin/draw-all', async function(req){
    await admin(req);
    const r = await drawAll();
    if (r.needed > 0 && r.drawn === 0) throw new ApiError(409, 'empty_pot');
    return overview();
  });

  // Story gefunden: drawn → won
  app.post('/api/admin/confirm', async function(req, reply){
    await admin(req);
    const id = v.uuid(v.body(req).id);
    const r = await pool.query("update players set status = 'won' where id = $1 and status = 'drawn'", [id]);
    if (!r.rowCount) throw new ApiError(409, 'not_drawn');
    return reply.code(204).send();
  });

  // Keine Story: raus (Gewinn + Code weg) und für denselben Gewinn sofort Ersatz ziehen
  app.post('/api/admin/reject', async function(req, reply){
    await admin(req);
    const id = v.uuid(v.body(req).id);
    await retryOnCodeClash(function(){
      return tx(async function(c){
        await lock(c);
        const { rows } = await c.query("select prize from players where id = $1 and status in ('drawn', 'won') for update", [id]);
        if (!rows[0]) throw new ApiError(409, 'not_drawn');
        await c.query("update players set status = 'rejected', prize = null, win_code = null where id = $1", [id]);
        if (rows[0].prize) await drawFor(c, rows[0].prize, 1);
      });
    });
    return reply.code(204).send();
  });

  app.post('/api/admin/logout', async function(req, reply){
    const t = cookie(req, COOKIE);
    if (t) await pool.query('delete from admin_sessions where token_hash = $1', [hashToken(t)]);
    reply.header('set-cookie', COOKIE + '=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
    return reply.code(204).send();
  });
};
