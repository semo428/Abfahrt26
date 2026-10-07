'use strict';
// Team-Endpunkte (zusätzlich per Traefik-Basic-Auth geschützt). Session über httpOnly-Cookie.
const config = require('../config');
const { pool, tx } = require('../db');
const { ApiError } = require('../errors');
const { Limiter } = require('../ratelimit');
const { newToken, hashToken, cookie, hashPassword, verifyPassword, winCode } = require('../auth');
const v = require('../validate');

const COOKIE = 'ab_admin';
const ELIGIBLE = "status = 'active' and random_at is not null and vibe_at is not null and pose_at is not null";
const OVERVIEW_SQL = `
  select json_build_object(
    'total',    (select count(*) from players)::int,
    'eligible', (select count(*) from players where ${ELIGIBLE})::int,
    'random',   (select count(*) from players where random_at is not null)::int,
    'vibe',     (select count(*) from players where vibe_at is not null)::int,
    'pose',     (select count(*) from players where pose_at is not null)::int,
    'winners',  coalesce((select json_agg(json_build_object('fun_name', fun_name, 'ig_handle', ig_handle, 'win_code', win_code) order by fun_name)
                          from players where status = 'won'), '[]'::json),
    'drawn',    coalesce((select json_agg(json_build_object('id', id, 'fun_name', fun_name, 'ig_handle', ig_handle))
                          from players where status = 'drawn'), '[]'::json)
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

  app.get('/api/admin/overview', async function(req){
    await admin(req);
    const { rows } = await pool.query(OVERVIEW_SQL);
    return rows[0].o;
  });

  // Zufällig aus allen mit 3/3 und Status active. Max. PRIZE_TOTAL Gewinner (bestätigte + gerade gezogene).
  app.post('/api/admin/draw', async function(req){
    await admin(req);
    return tx(async function(c){
      await c.query('select pg_advisory_xact_lock(2410)');   // zwei Admins gleichzeitig → nacheinander
      const n = (await c.query("select count(*)::int as n from players where status in ('won', 'drawn')")).rows[0].n;
      if (n >= config.prizeTotal) throw new ApiError(409, 'all_prizes_won');
      const { rows } = await c.query('select id, fun_name, ig_handle from players where ' + ELIGIBLE + ' order by random() limit 1 for update');
      if (!rows[0]) throw new ApiError(409, 'empty_pot');
      await c.query("update players set status = 'drawn' where id = $1", [rows[0].id]);
      return rows[0];
    });
  });

  app.post('/api/admin/confirm', async function(req){
    await admin(req);
    const id = v.uuid(v.body(req).id);
    for (let attempt = 0; ; attempt++){
      const code = winCode();
      try{
        const r = await pool.query("update players set status = 'won', win_code = $2 where id = $1 and status = 'drawn' returning win_code", [id, code]);
        if (!r.rowCount) throw new ApiError(409, 'not_drawn');
        return { win_code: r.rows[0].win_code };
      }catch(e){
        if (e.code === '23505' && attempt < 4) continue;   // Code schon vergeben → neu würfeln
        throw e;
      }
    }
  });

  app.post('/api/admin/reject', async function(req, reply){
    await admin(req);
    const id = v.uuid(v.body(req).id);
    const r = await pool.query("update players set status = 'rejected' where id = $1 and status = 'drawn'", [id]);
    if (!r.rowCount) throw new ApiError(409, 'not_drawn');
    return reply.code(204).send();
  });

  app.post('/api/admin/logout', async function(req, reply){
    const t = cookie(req, COOKIE);
    if (t) await pool.query('delete from admin_sessions where token_hash = $1', [hashToken(t)]);
    reply.header('set-cookie', COOKIE + '=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
    return reply.code(204).send();
  });
};
