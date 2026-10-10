'use strict';
// Regeln rund um die Live-Auslosung: vor reveal_at sieht niemand Status, Gewinn oder Code.
const config = require('./config');

const ELIGIBLE = "status = 'active' and photo_at is not null and vibe_at is not null";
const PLAYER_COLS = 'id, fun_name, ig_handle, character, photo_at, vibe_at, status, prize, win_code, created_at';

function revealed(){ return Date.now() >= config.revealAt.getTime(); }

// Player-Objekt für den Gast: vor dem Reveal immer "active" ohne Gewinn
function mask(p){
  if (!p || revealed()) return p;
  return { ...p, status: 'active', prize: null, win_code: null };
}

module.exports = { ELIGIBLE, PLAYER_COLS, revealed, mask };
