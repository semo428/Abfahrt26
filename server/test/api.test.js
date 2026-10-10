'use strict';
// Ende-zu-Ende-Tests gegen die laufende App (Testprojekt abfahrt-test).
// API = Live-Auslosung noch nicht erreicht (REVEAL_AT 2099), API_REVEALED = gleiche DB, Auslosung vorbei (REVEAL_AT 2000).
// PRIZES im Test: meet:2, shirt:1 → 3 Gewinnplätze. VIBE_MAX_PER_PLAYER=2, VIBE_MIN_INTERVAL_SEC=1.
const test = require('node:test');
const assert = require('node:assert/strict');

const API = process.env.API || 'http://localhost:3000';
const API_REVEALED = process.env.API_REVEALED || API;
const ORIGIN = process.env.PUBLIC_ORIGIN;
const ADMIN = { email: process.env.ADMIN_1_EMAIL, password: process.env.ADMIN_1_PASSWORD };
const RUN = Date.now().toString(36);
let seq = 0;

async function call(method, path, { body, token, cookie, origin = ORIGIN, headers = {}, base = API } = {}){
  const h = { ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = 'Bearer ' + token;
  if (cookie) h.cookie = cookie;
  if (origin && method !== 'GET') h.origin = origin;
  const r = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
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
async function complete2(token){
  assert.equal((await call('POST', '/api/challenge', { token, body: { key: 'photo' } })).status, 200);
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

test('Admin: alle auslosen, maskiert bis reveal_at, bestätigen, ablehnen mit Ersatz, Sperren', async () => {
  assert.equal((await call('GET', '/api/admin/overview')).json.error, 'not_admin');
  assert.deepEqual((await call('GET', '/api/admin/session')).json, { admin: false });
  assert.equal((await call('POST', '/api/admin/login', { body: { email: ADMIN.email, password: 'falsch-falsch' } })).json.error, 'not_admin');
  assert.equal((await call('POST', '/api/admin/login', { body: { email: 'gibts@nicht.de', password: 'egal-egal-egal' } })).json.error, 'not_admin');
  const cookie = await adminCookie();
  assert.deepEqual((await call('GET', '/api/admin/session', { cookie })).json, { admin: true });

  assert.equal((await call('POST', '/api/admin/draw-all', { cookie, body: {} })).json.error, 'empty_pot', 'leere DB');

  // 4 Spieler mit 2/2 + 1 nur mit Foto (nicht im Lostopf)
  const ps = [await register(), await register(), await register(), await register()];
  for (const p of ps) await complete2(p.token);
  const half = await register();
  await call('POST', '/api/challenge', { token: half.token, body: { key: 'photo' } });
  const byId = Object.fromEntries(ps.map(p => [p.player.id, p]));

  const o0 = (await call('GET', '/api/admin/overview', { cookie })).json;
  assert.deepEqual({ total: o0.total, eligible: o0.eligible, photo: o0.photo, vibe: o0.vibe, winners: o0.winners }, { total: 5, eligible: 4, photo: 5, vibe: 4, winners: [] });

  // Alle 3 Plätze füllen (meet 2, shirt 1), Antwort = Overview
  const d = await call('POST', '/api/admin/draw-all', { cookie, body: {} });
  assert.equal(d.status, 200);
  const ws = d.json.winners;
  assert.equal(ws.length, 3);
  assert.deepEqual(ws.map(w => w.prize), ['meet', 'meet', 'shirt'], 'sortiert nach PRIZES-Reihenfolge');
  for (const w of ws){
    assert.ok(byId[w.id]); assert.equal(w.checked, false);
    assert.match(w.win_code, /^AB-[A-HJ-NP-Z2-9]{6}$/);
    assert.deepEqual(Object.keys(w).sort(), ['checked', 'fun_name', 'id', 'ig_handle', 'prize', 'win_code']);
  }
  assert.equal(d.json.eligible, 1);
  assert.equal((await call('POST', '/api/admin/draw-all', { cookie, body: {} })).json.winners.length, 3, 'zweites Auslosen ändert nichts');

  // Vor reveal_at: Gast sieht nichts, öffentliche Liste ohne Gewinner
  const w1 = ws[0], w2 = ws[1], w3 = ws[2];
  const before = (await call('GET', '/api/me', { token: byId[w1.id].token })).json;
  assert.equal(before.status, 'active'); assert.equal(before.prize, null); assert.equal(before.win_code, null);
  const rvBefore = (await call('GET', '/api/reveal')).json;
  assert.equal(rvBefore.winners, null);
  assert.equal(rvBefore.reveal_at, '2099-01-01T00:00:00.000Z');
  assert.ok(Math.abs(Date.parse(rvBefore.now) - Date.now()) < 5000);
  assert.deepEqual(rvBefore.names.slice().sort(), ps.map(p => p.player.fun_name).sort(), 'nur Spaßnamen aus dem Lostopf (2/2)');

  // Nach reveal_at: Gast sieht Gewinn + Code, öffentliche Liste nur Spaßname + Gewinn
  const after = (await call('GET', '/api/me', { token: byId[w1.id].token, base: API_REVEALED })).json;
  assert.equal(after.status, 'drawn'); assert.equal(after.prize, 'meet'); assert.equal(after.win_code, w1.win_code);
  const rvAfter = (await call('GET', '/api/reveal', { base: API_REVEALED })).json;
  assert.equal(rvAfter.winners.length, 3);
  for (const w of rvAfter.winners) assert.deepEqual(Object.keys(w).sort(), ['fun_name', 'prize']);
  assert.doesNotMatch(JSON.stringify(rvAfter), /t_|AB-/, 'keine Handles, keine Codes');

  // Story gefunden
  assert.equal((await call('POST', '/api/admin/confirm', { cookie, body: { id: w1.id } })).status, 204);
  assert.equal((await call('POST', '/api/admin/confirm', { cookie, body: { id: w1.id } })).json.error, 'not_drawn');
  assert.equal((await call('GET', '/api/admin/overview', { cookie })).json.winners.find(w => w.id === w1.id).checked, true);

  // Keine Story bei w2 (meet) → raus, der letzte im Lostopf rückt für "meet" nach
  assert.equal((await call('POST', '/api/admin/reject', { cookie, body: { id: w2.id } })).status, 204);
  const o2 = (await call('GET', '/api/admin/overview', { cookie })).json;
  assert.equal(o2.winners.length, 3); assert.equal(o2.eligible, 0);
  const sub = o2.winners.find(w => ![w1.id, w2.id, w3.id].includes(w.id));
  assert.equal(sub.prize, 'meet'); assert.equal(sub.checked, false);
  const rej = (await call('GET', '/api/me', { token: byId[w2.id].token, base: API_REVEALED })).json;
  assert.equal(rej.status, 'rejected'); assert.equal(rej.prize, null); assert.equal(rej.win_code, null);

  // Auch ein bestätigter Gewinner kann noch abgelehnt werden; Lostopf leer → kein Ersatz, Auslosen meldet empty_pot
  assert.equal((await call('POST', '/api/admin/reject', { cookie, body: { id: w1.id } })).status, 204);
  assert.equal((await call('GET', '/api/admin/overview', { cookie })).json.winners.length, 2);
  assert.equal((await call('POST', '/api/admin/draw-all', { cookie, body: {} })).json.error, 'empty_pot');
  assert.equal((await call('POST', '/api/admin/reject', { cookie, body: { id: w1.id } })).json.error, 'not_drawn');
  assert.equal((await call('POST', '/api/admin/confirm', { cookie, body: { id: 'kein-uuid' } })).json.error, 'invalid_input');

  // Löschen: nach reveal_at gesperrt für drawn/won/rejected, Handle bleibt belegt
  assert.equal((await call('POST', '/api/admin/confirm', { cookie, body: { id: sub.id } })).status, 204);
  for (const id of [w2.id, sub.id, w3.id]){
    assert.equal((await call('DELETE', '/api/me', { token: byId[id].token, base: API_REVEALED })).json.error, 'locked_after_draw');
  }
  assert.equal((await call('POST', '/api/register', { body: { fun_name: 'Neu ' + RUN, ig_handle: byId[w2.id].player.ig_handle } })).json.error, 'ig_handle_unique');
  // Vor reveal_at darf auch ein Gezogener löschen (sonst verriete die Sperre den Gewinn)
  assert.equal((await call('DELETE', '/api/me', { token: byId[w3.id].token })).status, 204);
  assert.equal((await call('GET', '/api/admin/overview', { cookie })).json.winners.length, 1);

  assert.equal((await call('POST', '/api/admin/logout', { cookie, body: {} })).status, 204);
  assert.deepEqual((await call('GET', '/api/admin/session', { cookie })).json, { admin: false });
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
  assert.deepEqual(Object.keys(p).sort(), ['character', 'created_at', 'fun_name', 'id', 'ig_handle', 'photo_at', 'prize', 'status', 'vibe_at', 'win_code']);

  assert.equal((await call('POST', '/api/register', { body: { fun_name: u.fun_name.toUpperCase(), ig_handle: 'anders_' + RUN } })).json.error, 'fun_name_unique');
  assert.equal((await call('POST', '/api/register', { body: { fun_name: 'Anders ' + RUN, ig_handle: u.ig_handle } })).json.error, 'ig_handle_unique');
  assert.equal((await call('POST', '/api/register', { token: r.json.token, body: uniq() })).json.error, 'already_registered');

  const noChar = await register({ character: null });
  assert.equal(noChar.player.character, null);
});

test('me, Foto-Challenge idempotent, Vibe mit Filter und Limits, Statistik', async () => {
  assert.equal((await call('GET', '/api/me')).json.error, 'not_registered');
  assert.equal((await call('GET', '/api/me', { token: 'A'.repeat(43) })).json.error, 'not_registered');
  const { token } = await register();
  assert.equal((await call('GET', '/api/me', { token })).json.status, 'active');

  for (const key of ['vibe', 'random', 'pose']) assert.equal((await call('POST', '/api/challenge', { token, body: { key } })).json.error, 'invalid_input');
  const a = await call('POST', '/api/challenge', { token, body: { key: 'photo' } });
  assert.ok(a.json.photo_at);
  await sleep(20);
  const b = await call('POST', '/api/challenge', { token, body: { key: 'photo' } });
  assert.equal(b.json.photo_at, a.json.photo_at, 'zweites Abhaken ändert nichts');

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
  assert.ok(Array.isArray(s.json.sample) && s.json.sample.length >= 1 && s.json.sample.length <= 7);
  assert.deepEqual(Object.keys(s.json.sample[0]).sort(), ['fun_name', 'stars', 'text']);
  assert.doesNotMatch(s.text, /ig_handle|t_/, 'keine Instagram-Namen in der Statistik');
});

test('fremde Origin wird abgewiesen', async () => {
  const r = await call('POST', '/api/register', { body: uniq(), origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  assert.equal((await call('POST', '/api/admin/login', { body: ADMIN, origin: null })).status, 403);
});

test('Daten löschen (vor und nach reveal_at, Status active)', async () => {
  for (const base of [API, API_REVEALED]){
    const { token } = await register();
    assert.equal((await call('DELETE', '/api/me', { token, base })).status, 204);
    assert.equal((await call('GET', '/api/me', { token })).json.error, 'not_registered');
  }
});

test('Admin-Login Rate-Limit', async () => {
  let last;
  for (let i = 0; i < 7; i++) last = await call('POST', '/api/admin/login', { body: { email: 'brute@force.de', password: 'versuch-' + i } });
  assert.equal(last.json.error, 'rate_limited');
});
