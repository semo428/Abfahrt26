'use strict';
// Verbindung zur eigenen Postgres (abfahrt-db). Zugangsdaten über PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
const { Pool } = require('pg');
const config = require('./config');
const { ApiError } = require('./errors');

const pool = new Pool({ max: config.dbPoolMax, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
pool.on('error', function(){});   // abgebrochene Leerlauf-Verbindungen nicht als Absturz behandeln

async function tx(fn){
  const c = await pool.connect();
  try{
    await c.query('begin');
    const r = await fn(c);
    await c.query('commit');
    return r;
  }catch(e){
    try{ await c.query('rollback'); }catch(_){}
    throw e;
  }finally{
    c.release();
  }
}

// Postgres-Fehler in die Codes übersetzen, die das Frontend kennt
function mapPgError(e){
  if (e && e.code === '23505'){
    if (e.constraint === 'players_fun_name_unique') return new ApiError(409, 'fun_name_unique');
    if (e.constraint === 'players_ig_handle_unique') return new ApiError(409, 'ig_handle_unique');
  }
  if (e && (e.code === '23514' || e.code === '22P02' || e.code === '22001')) return new ApiError(400, 'invalid_input');
  return e;
}

module.exports = { pool, tx, mapPgError };
