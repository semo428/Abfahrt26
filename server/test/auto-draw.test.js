'use strict';
// Automatische Auslosung (Instanz app-auto, eigene DB): DRAW_AT liegt in der Vergangenheit, Prüfung alle 0,5 s, PRIZES meet:1, shirt:1.
const test = require('node:test');
const assert = require('node:assert/strict');

const API = process.env.API_AUTO || 'http://localhost:3000';
const ORIGIN = process.env.PUBLIC_ORIGIN;
const ADMIN = { email: process.env.ADMIN_1_EMAIL, password: process.env.ADMIN_1_PASSWORD };
const RUN = Date.now().toString(36);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(method, path, { body, token, cookie } = {}){
  const h = {};
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = 'Bearer ' + token;
  if (cookie) h.cookie = cookie;
  if (method !== 'GET') h.origin = ORIGIN;
  const r = await fetch(API + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let json = null; try{ json = JSON.parse(text); }catch(_){}
  return { status: r.status, json, headers: r.headers };
}

test('lost automatisch genau einmal, sobald jemand im Lostopf ist', async () => {
  const login = await call('POST', '/api/admin/login', { body: ADMIN });
  assert.equal(login.status, 204);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const overview = async () => (await call('GET', '/api/admin/overview', { cookie })).json;

  await sleep(1200);
  assert.equal((await overview()).winners.length, 0, 'leerer Lostopf → nichts gezogen');

  const tokens = [];
  for (let i = 0; i < 3; i++){
    const r = await call('POST', '/api/register', { body: { fun_name: 'Auto ' + RUN + i, ig_handle: 'auto_' + RUN + '_' + i } });
    assert.equal(r.status, 201);
    tokens.push(r.json.token);
  }
  for (const token of tokens){
    await call('POST', '/api/challenge', { token, body: { key: 'photo' } });
    await call('POST', '/api/vibe', { token, body: { stars: 4, text: 'auto test' } });
  }

  let o;
  for (let i = 0; i < 20; i++){ o = await overview(); if (o.winners.length) break; await sleep(250); }
  assert.ok(o.winners.length >= 1, 'Automatik hat gelost');
  for (const w of o.winners) assert.ok(['meet', 'shirt'].includes(w.prize));
  const count = o.winners.length;

  // Nach einer Ablehnung (Ersatz wird gezogen) darf die Automatik nicht noch einmal losen
  assert.equal((await call('POST', '/api/admin/reject', { cookie, body: { id: o.winners[0].id } })).status, 204);
  await sleep(1500);
  assert.equal((await overview()).winners.length, count, 'kein zweiter automatischer Durchlauf');

  // Freie Plätze füllt weiterhin der Knopf
  const manual = await call('POST', '/api/admin/draw-all', { cookie, body: {} });
  assert.equal(manual.status, 200);
  assert.equal(manual.json.winners.length, 2);
});
