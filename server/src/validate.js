'use strict';
// Serverseitige Eingabeprüfung (wiederholt bewusst die Prüfungen aus dem Frontend).
const { ApiError } = require('./errors');

// Gleiche Liste wie app.js → BLOCK
const BLOCK = /(hurensohn|wichser|fotze|schlampe|nutte|missgeburt|spast|behindert|neger|kanake|schwuchtel|fick\s*dich|nazi|heil\s*hitler)/i;
// Steuerzeichen und Bidi-Overrides (Text-Spoofing) sind nie erlaubt
const BAD = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(){ return new ApiError(400, 'invalid_input'); }
function len(s){ return Array.from(s).length; }
function clean(v){
  if (typeof v !== 'string') throw invalid();
  const s = v.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (BAD.test(s)) throw invalid();
  return s;
}

function body(req){
  const b = req.body;
  if (b == null) return {};
  if (typeof b !== 'object' || Array.isArray(b)) throw invalid();
  return b;
}

function funName(v){
  const s = clean(v);
  if (len(s) < 2 || len(s) > 24) throw invalid();
  if (BLOCK.test(s)) throw new ApiError(422, 'blocked_text');
  return s;
}

function igHandle(v){
  if (typeof v !== 'string') throw invalid();
  const s = v.trim().replace(/^@+/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(s)) throw invalid();
  return s;
}

// Charakter ist optional (Entscheidung offen); nur die drei bekannten Felder werden übernommen
function character(v){
  if (v == null) return null;
  if (typeof v !== 'object' || Array.isArray(v)) throw invalid();
  const out = {};
  for (const k of ['title', 'superpower', 'weakness']){
    const s = clean(v[k] == null ? '' : v[k]);
    if (len(s) > 160) throw invalid();
    out[k] = s;
  }
  return out;
}

function stars(v){
  if (!Number.isInteger(v) || v < 1 || v > 5) throw invalid();
  return v;
}

function vibeText(v){
  const s = clean(v);
  if (len(s) < 2 || len(s) > 80) throw invalid();
  if (BLOCK.test(s)) throw new ApiError(422, 'blocked_text');
  return s;
}

// Nur das Abfahrt-Foto wird so abgehakt; der Vibe läuft über /api/vibe
function challengeKey(v){
  if (v !== 'photo') throw invalid();
  return v;
}

function uuid(v){
  if (typeof v !== 'string' || !UUID.test(v)) throw invalid();
  return v.toLowerCase();
}

function email(v){
  if (typeof v !== 'string') throw invalid();
  const s = v.trim().toLowerCase();
  if (!s || s.length > 254) throw invalid();
  return s;
}

function password(v){
  if (typeof v !== 'string' || !v || v.length > 200) throw invalid();
  return v;
}

module.exports = { body, funName, igHandle, character, stars, vibeText, challengeKey, uuid, email, password };
