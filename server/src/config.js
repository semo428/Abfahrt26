'use strict';
// Alle Einstellungen kommen aus Umgebungsvariablen (.env auf dem Server, siehe deploy/.env.example).
const path = require('path');

function int(name, def){
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error('env ' + name + ' muss eine ganze Zahl >= 0 sein');
  return n;
}

function admins(){
  const list = [];
  for (let i = 1; i <= 9; i++){
    const email = (process.env['ADMIN_' + i + '_EMAIL'] || '').trim().toLowerCase();
    const password = process.env['ADMIN_' + i + '_PASSWORD'] || '';
    if (!email) continue;
    if (password.length < 12) throw new Error('ADMIN_' + i + '_PASSWORD muss mindestens 12 Zeichen haben');
    list.push({ email, password });
  }
  return list;
}

module.exports = {
  port: int('PORT', 3000),
  publicOrigin: process.env.PUBLIC_ORIGIN || 'https://abfahrt.askconnect.de',
  staticRoot: process.env.STATIC_ROOT || path.join(__dirname, '..', 'public'),
  prizeTotal: int('PRIZE_TOTAL', 13),
  dbPoolMax: int('DB_POOL_MAX', 20),
  statsCacheMs: int('STATS_CACHE_MS', 5000),
  adminSessionHours: int('ADMIN_SESSION_HOURS', 12),
  limits: {
    registerPerIpPerMin: int('RL_REGISTER_PER_IP_PER_MIN', 600),   // großzügig: viele Gäste können hinter einer IP sitzen
    tokenPerMin: int('RL_TOKEN_PER_MIN', 60),                      // pro Gerät; Polling braucht ~6/min
    vibeMinIntervalSec: int('VIBE_MIN_INTERVAL_SEC', 20),
    vibeMaxPerPlayer: int('VIBE_MAX_PER_PLAYER', 5),
    adminLoginPer15Min: int('RL_ADMIN_LOGIN_PER_15MIN', 10)
  },
  admins: admins()
};
