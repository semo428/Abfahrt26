'use strict';
// Ende-zu-Ende-Tests gegen die laufende App (Testprojekt abfahrt-test, PRIZE_TOTAL=2, VIBE_MAX_PER_PLAYER=2).
const test = require('node:test');
const assert = require('node:assert/strict');

const API = process.env.API || 'http://localhost:3000';
const ORIGIN = process.env.PUBLIC_ORIGIN;
const ADMIN = { email: process.env.ADMIN_1_EMAIL, password: process.env.ADMIN_1_PASSWORD };
const RUN = Date.now().toString(36);
let seq = 0;

async function call(method, path, { body, token, cookie, origin = ORIGIN, headers = {} } = {}){
  const h = { ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = 'Bearer ' + token;
  if (cookie) h.cookie = cookie;
  if (origin && method !== 'GET') h.origin = origin;
  const r = await fetch(API + path, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  const text = await r.text();
  let json = null; try{ json = JSON.parse(text); }catch(_){}
  return { status: r.status, json, text, headers: r.headers };
}
function uniq(){ seq++; return { fun_name: 'Tester ' + RUN + seq, ig_handle: 't_' + RUN + '_' + seq }; }
async function register(extra = {}){
  const r = await call('POST', '/api/register', { body: { ...uniq(), ...extra } });
  assert.equal(r.status, 201, r.text);
  return r.json;
}
async function complete3(token){
  await call('POST', '/api/challenge', { token, body: { key: 'random' } });
  await call('POST', '/api/challenge', { token, body: { key: 'pose' } });
  const r = await call('POST', '/api/vibe', { token, body: { stars: 5, text: 'super abend' } });
  assert.equal(r.status, 200, r.text);
  return r.json;
}
async function adminCookie(){
  const r = await call('POST', '/api/admin/login', { body: ADMIN });
  assert.equal(r.status, 204, r.text);
  const sc = r.headers.get('set-cookie');
  assert.match(sc, /HttpOnly/); assert.match(sc, /Secure/); assert.match(sc, /SameSite=Strict/);
  return sc.split(';')[0];
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('health + Sicherheits-Header + statische Auslieferung', async () => {
  const h = await call('GET', '/api/health');
  assert.equal(h.status, 200); assert.deepEqual(h.json, { status: 'ok' });
  assert.equal(h.headers.get('cache-control'), 'no-store');
  const page = await call('GET', '/');
  assert.equal(page.status, 200);
  assert.match(page.text, /store\.js\?v=/);
  assert.doesNotMatch(page.text, /googleapis|jsdelivr/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.equal((await call('GET', '/supabase/schema.sql')).status, 404);
  assert.equal((await call('GET', '/fonts.css')).status, 200);
  const nf = await call('GET', '/api/nope');
  assert.equal(nf.status, 404); assert.deepEqual(nf.json, { error: 'not_found' });
});

test('Anmeldung: Validierung, Eindeutigkeit, ein Eintrag pro Gerät', async () => {
  assert.equal((await call('POST', '/api/register', { body: { fun_name: 'x', ig_handle: 'abc' } })).json.error, 'invalid_input');
  assert.equal((await call('POST', '/api/register', { body: { fun_name: 'Gültig', ig_handle: 'nö!' } })).json.error, 'invalid_input');
  assert.equal((await call('POST', '/api/register', { body: { fun_name: 'du nazi', ig_handle: 'abc' } })).json.error, 'blocked_text');
  assert.equal((await call('POST', '/api/register', { body: 'kein json', headers: { 'content-type': 'text/plain' } })).status, 400);

  const u = uniq();
  const r = await call('POST', '/api/register', { body: { fun_name: '  ' + u.fun_name + ' ', ig_handle: '@' + u.ig_handle.toUpperCase(), character: { title: 't', superpower: 's', weakness: 'w', extra: 'x' } } });
  assert.equal(r.status, 201);
  assert.match(r.json.token, /^[A-Za-z0-9_-]{43}$/);
  const p = r.json.player;
  assert.equal(p.fun_name, u.fun_name); assert.equal(p.ig_handle, u.ig_handle); assert.equal(p.status, 'active');
  assert.deepEqual(p.character, { title: 't', superpower: 's', weakness: 'w' });
  assert.deepEqual(Object.keys(p).sort(), ['character', 'created_at', 'fun_name', 'id', 'ig_handle', 'pose_at', 'random_at', 'status', 'vibe_at', 'win_code']);

  assert.equal((await call('POST', '/api/register', { body: { fun_name: u.fun_name.toUpperCase(), ig_handle: 'anders_' + RUN } })).json.error, 'fun_name_unique');
  assert.equal((await call('POST', '/api/register', { body: { fun_name: 'Anders ' + RUN, ig_handle: u.ig_handle } })).json.error, 'ig_handle_unique');
  assert.equal((await call('POST', '/api/register', { token: r.json.token, body: uniq() })).json.error, 'already_registered');

  const noChar = await register({ character: null });
  assert.equal(noChar.player.character, null);
});

test('me, Challenges idempotent, Vibe mit Filter und Limits', async () => {
  assert.equal((await call('GET', '/api/me')).json.error, 'not_registered');
  assert.equal((await call('GET', '/api/me', { token: 'A'.repeat(43) })).json.error, 'not_registered');
  const { token } = await register();
  assert.equal((await call('GET', '/api/me', { token })).json.status, 'active');

  assert.equal((await call('POST', '/api/challenge', { token, body: { key: 'vibe' } })).json.error, 'invalid_input');
  const a = await call('POST', '/api/challenge', { token, body: { key: 'random' } });
  assert.ok(a.json.random_at);
  await sleep(20);
  const b = await call('POST', '/api/challenge', { token, body: { key: 'random' } });
  assert.equal(b.json.random_at, a.json.random_at, 'zweites Abhaken ändert nichts');

  assert.equal((await call('POST', '/api/vibe', { token, body: { stars: 6, text: 'ok ok' } })).json.error, 'invalid_input');
  assert.equal((await call('POST', '/api/vibe', { token, body: { stars: 3, text: 'du wichser' } })).json.error, 'blocked_text');
  const v1 = await call('POST', '/api/vibe', { token, body: { stars: 4, text: 'läuft  bei\nmir' } });
  assert.equal(v1.status, 200); assert.ok(v1.json.vibe_at);
  assert.equal((await call('POST', '/api/vibe', { token, body: { stars: 4, text: 'zu schnell' } })).json.error, 'rate_limited');
  await sleep(1100);
  assert.equal((await call('POST', '/api/vibe', { token, body: { stars: 2, text: 'zweiter' } })).status, 200);
  await sleep(1100);
  assert.equal((await call('POST', '/api/vibe', { token, body: { stars: 2, text: 'dritter' } })).json.error, 'rate_limited', 'max. 2 pro Spieler im Test');

  const s = await call('GET', '/api/stats');
  assert.equal(s.status, 200);
  assert.ok(s.json.players >= 1); assert.ok(s.json.vibe_count >= 2); assert.equal(typeof s.json.vibe_avg, 'number');
  assert.equal(s.json.recent[0].text, 'zweiter');
  assert.equal(s.json.recent[1].text, 'läuft bei mir', 'Leerraum normalisiert');
  assert.doesNotMatch(s.text, /ig_handle|t_/, 'keine Instagram-Namen in der Statistik');
});

test('fremde Origin wird abgewiesen', async () => {
  const r = await call('POST', '/api/register', { body: uniq(), origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  assert.equal((await call('POST', '/api/admin/login', { body: ADMIN, origin: null })).status, 403);
});

test('Daten löschen', async () => {
  const { token } = await register();
  assert.equal((await call('DELETE', '/api/me', { token })).status, 204);
  assert.equal((await call('GET', '/api/me', { token })).json.error, 'not_registered');
});

test('Admin: Login, Ziehung, Bestätigen, Ablehnen, Sperren, Obergrenze', async () => {
  assert.equal((await call('GET', '/api/admin/overview')).json.error, 'not_admin');
  assert.deepEqual((await call('GET', '/api/admin/session')).json, { admin: false });
  assert.equal((await call('POST', '/api/admin/login', { body: { email: ADMIN.email, password: 'falsch-falsch' } })).json.error, 'not_admin');
  assert.equal((await call('POST', '/api/admin/login', { body: { email: 'gibts@nicht.de', password: 'egal-egal-egal' } })).json.error, 'not_admin');

  const cookie = await adminCookie();
  assert.deepEqual((await call('GET', '/api/admin/session', { cookie })).json, { admin: true });

  // Lostopf leeren: alle bisherigen Test-Spieler mit 3/3 gibt es nicht → genau 3 neue mit 3/3
  const ps = [await register(), await register(), await register()];
  for (const p of ps) await complete3(p.token);
  const byId = Object.fromEntries(ps.map(p => [p.player.id, p]));
  const o1 = (await call('GET', '/api/admin/overview', { cookie })).json;
  assert.equal(o1.eligible, 3);
  assert.doesNotMatch(JSON.stringify(o1), /token/);

  const d1 = await call('POST', '/api/admin/draw', { cookie, body: {} });
  assert.equal(d1.status, 200); assert.ok(byId[d1.json.id]);
  assert.equal((await call('GET', '/api/me', { token: byId[d1.json.id].token })).json.status, 'drawn');
  assert.equal((await call('DELETE', '/api/me', { token: byId[d1.json.id].token })).json.error, 'locked_after_draw');

  const c1 = await call('POST', '/api/admin/confirm', { cookie, body: { id: d1.json.id } });
  assert.match(c1.json.win_code, /^AB-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal((await call('POST', '/api/admin/confirm', { cookie, body: { id: d1.json.id } })).json.error, 'not_drawn');
  const won = (await call('GET', '/api/me', { token: byId[d1.json.id].token })).json;
  assert.equal(won.status, 'won'); assert.equal(won.win_code, c1.json.win_code);

  const d2 = await call('POST', '/api/admin/draw', { cookie, body: {} });
  assert.notEqual(d2.json.id, d1.json.id);
  assert.equal((await call('POST', '/api/admin/reject', { cookie, body: { id: d2.json.id } })).status, 204);
  const rej = byId[d2.json.id];
  assert.equal((await call('GET', '/api/me', { token: rej.token })).json.status, 'rejected');
  assert.equal((await call('DELETE', '/api/me', { token: rej.token })).json.error, 'locked_after_draw');
  assert.equal((await call('POST', '/api/register', { body: { fun_name: 'Neu ' + RUN, ig_handle: rej.player.ig_handle } })).json.error, 'ig_handle_unique', 'Handle bleibt gesperrt');

  const d3 = await call('POST', '/api/admin/draw', { cookie, body: {} });
  assert.equal(d3.status, 200);
  assert.equal((await call('POST', '/api/admin/draw', { cookie, body: {} })).json.error, 'all_prizes_won', '1 won + 1 drawn = PRIZE_TOTAL 2');
  const o2 = (await call('GET', '/api/admin/overview', { cookie })).json;
  assert.equal(o2.winners.length, 1); assert.equal(o2.drawn.length, 1); assert.equal(o2.drawn[0].id, d3.json.id);
  await call('POST', '/api/admin/reject', { cookie, body: { id: d3.json.id } });
  assert.equal((await call('POST', '/api/admin/draw', { cookie, body: {} })).json.error, 'empty_pot');
  assert.equal((await call('POST', '/api/admin/confirm', { cookie, body: { id: 'kein-uuid' } })).json.error, 'invalid_input');

  assert.equal((await call('POST', '/api/admin/logout', { cookie, body: {} })).status, 204);
  assert.deepEqual((await call('GET', '/api/admin/session', { cookie })).json, { admin: false });
});

test('Admin-Login Rate-Limit', async () => {
  let last;
  for (let i = 0; i < 7; i++) last = await call('POST', '/api/admin/login', { body: { email: 'brute@force.de', password: 'versuch-' + i } });
  assert.equal(last.json.error, 'rate_limited');
});
