'use strict';
// Auslosung: wird vom Admin-Knopf („Jetzt auslosen“) und von der automatischen Auslosung um DRAW_AT genutzt.
// Reiner Zufall mit gleichen Chancen für alle mit 2/2; jede Person gewinnt höchstens einmal.
const config = require('./config');
const { pool, tx } = require('./db');
const { winCode } = require('./auth');
const { ELIGIBLE } = require('./game');

const LOCK = 2410;   // Advisory-Lock: Knopf, Automatik und zweiter Admin laufen nacheinander, nie doppelt

// n Gewinner für einen Gewinn ziehen (innerhalb einer Transaktion)
async function drawFor(c, key, n){
  if (n <= 0) return 0;
  const { rows } = await c.query('select id from players where ' + ELIGIBLE + ' order by random() limit $1 for update', [n]);
  for (const r of rows) await c.query("update players set status = 'drawn', prize = $2, win_code = $3 where id = $1", [r.id, key, winCode()]);
  return rows.length;
}

// Gewinncode-Kollision (unique) ist extrem selten → ganze Transaktion wiederholen
async function retryOnCodeClash(fn){
  for (let attempt = 0; ; attempt++){
    try{ return await fn(); }
    catch(e){ if (e.code === '23505' && attempt < 3) continue; throw e; }
  }
}

// Füllt alle freien Gewinnplätze (Anzahlen aus PRIZES, in dieser Reihenfolge).
// onlyIfFirst: nur losen, wenn noch nie gelost wurde (für die Automatik) → { skipped: true }
async function drawAll({ onlyIfFirst = false } = {}){
  return retryOnCodeClash(function(){
    return tx(async function(c){
      await c.query('select pg_advisory_xact_lock($1)', [LOCK]);
      if (onlyIfFirst){
        const done = (await c.query("select exists (select 1 from players where status in ('drawn', 'won', 'rejected')) as d")).rows[0].d;
        if (done) return { skipped: true, needed: 0, drawn: 0 };
      }
      const have = {};
      for (const r of (await c.query("select prize, count(*)::int as n from players where status in ('drawn', 'won') and prize is not null group by prize")).rows) have[r.prize] = r.n;
      let needed = 0, drawn = 0;
      for (const p of config.prizes){
        const need = p.count - (have[p.key] || 0);
        if (need > 0){ needed += need; drawn += await drawFor(c, p.key, need); }
      }
      return { skipped: false, needed, drawn };
    });
  });
}

// Gleiche Sperre für andere Transaktionen, die Gewinner ändern (z. B. Ablehnen mit Ersatzziehung)
async function lock(c){ await c.query('select pg_advisory_xact_lock($1)', [LOCK]); }

// Automatische Auslosung ab DRAW_AT: genau einmal, falls bis dahin niemand von Hand gelost hat.
// Bleibt aktiv, bis es geklappt hat (z. B. falls um 03:30 noch niemand 2/2 hat); idempotent, auch nach Neustart.
function startAutoDraw(log){
  if (!config.drawAt) { log.info('auto draw disabled'); return null; }
  let running = false, done = false, lastEmpty = 0;
  const t = setInterval(async function(){
    if (done || running || Date.now() < config.drawAt.getTime()) return;
    running = true;
    try{
      const r = await drawAll({ onlyIfFirst: true });
      if (r.skipped){ done = true; log.info('auto draw skipped (already drawn)'); }
      else if (r.drawn > 0){ done = true; log.info({ drawn: r.drawn, needed: r.needed }, 'auto draw done'); }
      else if (Date.now() - lastEmpty > 10 * 60 * 1000){ lastEmpty = Date.now(); log.warn('auto draw: pot empty, retrying'); }
    }catch(e){
      log.error({ err_code: e.code, err_name: e.name }, 'auto draw failed, retrying');
    }finally{ running = false; }
  }, config.autoDrawCheckMs);
  t.unref();
  return t;
}

module.exports = { drawAll, drawFor, lock, retryOnCodeClash, startAutoDraw };
