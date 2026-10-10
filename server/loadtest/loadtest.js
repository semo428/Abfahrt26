'use strict';
// Lasttest wie am Abend: DEVICES Handys melden sich über RAMP_SEC verteilt an (Einlass-Spitze),
// pollen dann alle POLL_SEC Sekunden me + stats (wie das Dashboard) und erledigen nach und nach ihre 2 Challenges.
// REVEAL=1: zusätzlich ab Start jede Sekunde /api/reveal wie zur Live-Auslosung um 04:00.
// Alles kommt von EINER IP – entspricht dem Fall „alle Gäste im Club-WLAN“.
//
//   node server/loadtest/loadtest.js
//   BASE=https://abfahrt.askconnect.de DEVICES=1000 RAMP_SEC=180 DURATION_SEC=420 node server/loadtest/loadtest.js
//
// Aufräumen danach (auf dem VPS): sh /root/abfahrt/server/scripts/purge.sh --loadtest
const BASE = (process.env.BASE || 'https://abfahrt.askconnect.de').replace(/\/$/, '');
const DEVICES = +(process.env.DEVICES || 1000);
const RAMP_SEC = +(process.env.RAMP_SEC || 180);
const DURATION_SEC = +(process.env.DURATION_SEC || 420);
const POLL_SEC = +(process.env.POLL_SEC || 20);
const REVEAL = process.env.REVEAL === '1';
const RUN = Date.now().toString(36).slice(-6);

const stats = {};          // endpoint → { lat: [], codes: {} }
let netErrors = 0, registered = 0, inFlight = 0, total = 0;
const t0 = Date.now();
const endAt = t0 + DURATION_SEC * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function req(name, method, path, { body, token } = {}){
  const s = stats[name] || (stats[name] = { lat: [], codes: {} });
  const h = { origin: BASE };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = 'Bearer ' + token;
  const start = performance.now();
  inFlight++; total++;
  try{
    const r = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const json = await r.json().catch(() => null);
    s.lat.push(performance.now() - start);
    s.codes[r.status] = (s.codes[r.status] || 0) + 1;
    return { status: r.status, json };
  }catch(e){
    netErrors++;
    s.codes.network = (s.codes.network || 0) + 1;
    return { status: 0, json: null };
  }finally{ inFlight--; }
}

async function device(i){
  await sleep(Math.random() * RAMP_SEC * 1000);
  await req('stats', 'GET', '/api/stats');                       // Startseite zeigt den Zähler
  const r = await req('register', 'POST', '/api/register', { body: { fun_name: 'LT ' + RUN + ' ' + i, ig_handle: 'lt_' + RUN + '_' + i, character: { title: 'die legende', superpower: 'testet', weakness: 'nichts' } } });
  if (r.status !== 201) return;
  registered++;
  const token = r.json.token;
  const todo = ['photo', 'vibe'].sort(() => Math.random() - 0.5);
  while (Date.now() < endAt){
    await sleep(POLL_SEC * 1000 * (0.8 + Math.random() * 0.4));
    if (Date.now() >= endAt) break;
    await Promise.all([req('me', 'GET', '/api/me', { token }), req('stats', 'GET', '/api/stats')]);
    if (REVEAL) for (let s = 0; s < POLL_SEC && Date.now() < endAt; s++){ await req('reveal', 'GET', '/api/reveal'); await sleep(1000); }
    if (todo.length && Math.random() < 0.6){
      const k = todo.shift();
      if (k === 'vibe') await req('vibe', 'POST', '/api/vibe', { token, body: { stars: 1 + Math.floor(Math.random() * 5), text: 'lasttest ' + i } });
      else await req('challenge', 'POST', '/api/challenge', { token, body: { key: k } });
    }
  }
}

function pct(a, p){ if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; }

const progress = setInterval(() => {
  const sec = Math.round((Date.now() - t0) / 1000);
  console.log(`[${sec}s] angemeldet ${registered}/${DEVICES} · Anfragen ${total} · offen ${inFlight} · Netzfehler ${netErrors}`);
}, 10000);

(async () => {
  console.log(`Lasttest ${RUN}: ${DEVICES} Geräte, Anmeldung über ${RAMP_SEC}s, Dauer ${DURATION_SEC}s, Polling ${POLL_SEC}s → ${BASE}`);
  await Promise.all(Array.from({ length: DEVICES }, (_, i) => device(i)));
  clearInterval(progress);
  const dur = (Date.now() - t0) / 1000;
  console.log(`\nFertig nach ${dur.toFixed(0)}s · ${registered}/${DEVICES} angemeldet · ${total} Anfragen (Ø ${(total / dur).toFixed(1)}/s)\n`);
  console.log('Endpunkt    Anzahl    p50ms   p95ms   p99ms   maxms   Statuscodes');
  let bad = 0, all = 0;
  for (const [name, s] of Object.entries(stats)){
    const n = Object.values(s.codes).reduce((a, b) => a + b, 0); all += n;
    for (const [c, k] of Object.entries(s.codes)) if (c === 'network' || +c >= 400) bad += k;
    console.log(name.padEnd(10), String(n).padStart(7), ...[50, 95, 99, 100].map(p => pct(s.lat, p).toFixed(0).padStart(7)), '  ', JSON.stringify(s.codes));
  }
  const rate = all ? bad / all * 100 : 100;
  console.log(`\nFehlerquote: ${rate.toFixed(2)} %  (Ziel < 0,1 %)`);
  process.exit(rate < 1 ? 0 : 1);
})();
