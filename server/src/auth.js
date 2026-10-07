'use strict';
// Geräte-Token, Admin-Passwörter (scrypt) und Session-Cookie.
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;   // 32 Byte base64url
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function newToken(){ return crypto.randomBytes(32).toString('base64url'); }
function hashToken(t){ return crypto.createHash('sha256').update(t).digest(); }

function bearer(req){
  const h = req.headers.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return TOKEN_RE.test(t) ? t : null;
}

function cookie(req, name){
  const c = req.headers.cookie;
  if (typeof c !== 'string') return null;
  for (const part of c.split(';')){
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name){
      const v = part.slice(i + 1).trim();
      return TOKEN_RE.test(v) ? v : null;
    }
  }
  return null;
}

async function hashPassword(pw){
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw, salt, 32, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), h.toString('base64')].join('$');
}

async function verifyPassword(pw, stored){
  const p = String(stored).split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return false;
  const expected = Buffer.from(p[5], 'base64');
  const h = await scrypt(pw, Buffer.from(p[4], 'base64'), expected.length, { N: +p[1], r: +p[2], p: +p[3], maxmem: SCRYPT.maxmem });
  return crypto.timingSafeEqual(h, expected);
}

// Gewinncode ohne verwechselbare Zeichen (0/O, 1/I)
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function winCode(){
  let s = 'AB-';
  for (let i = 0; i < 6; i++) s += ALPHA[crypto.randomInt(ALPHA.length)];
  return s;
}

module.exports = { newToken, hashToken, bearer, cookie, hashPassword, verifyPassword, winCode };
