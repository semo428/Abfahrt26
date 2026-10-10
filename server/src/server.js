'use strict';
// Start: auf die DB warten, Admin-Accounts aus der .env abgleichen, HTTP-Server starten.
const config = require('./config');
const { pool } = require('./db');
const { hashPassword } = require('./auth');
const { buildApp } = require('./app');
const { startAutoDraw } = require('./draw');

async function waitForDb(log){
  for (let i = 1; ; i++){
    try{ await pool.query('select 1'); return; }
    catch(e){
      if (i >= 30) throw e;
      log.warn({ attempt: i }, 'db not ready');
      await new Promise(function(r){ setTimeout(r, 1000); });
    }
  }
}

// Admins = genau die Accounts aus ADMIN_n_EMAIL/ADMIN_n_PASSWORD; entfernte verlieren ihren Zugang
async function syncAdmins(log){
  const emails = [];
  for (const a of config.admins){
    const h = await hashPassword(a.password);
    await pool.query('insert into admins (email, pw_hash) values ($1, $2) on conflict (email) do update set pw_hash = excluded.pw_hash', [a.email, h]);
    emails.push(a.email);
  }
  await pool.query('delete from admins where not (email = any($1::text[]))', [emails]);
  if (!emails.length) log.warn('no admin accounts configured');
  else log.info({ admins: emails.length }, 'admins synced');
}

async function main(){
  const app = buildApp();
  await waitForDb(app.log);
  await syncAdmins(app.log);
  await app.listen({ host: '0.0.0.0', port: config.port });
  startAutoDraw(app.log);

  let closing = false;
  async function shutdown(){
    if (closing) return; closing = true;
    try{ await app.close(); await pool.end(); }finally{ process.exit(0); }
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(function(e){
  console.error(JSON.stringify({ level: 'fatal', msg: 'startup failed', err_code: e.code, err_name: e.name, err: e.message }));
  process.exit(1);
});
