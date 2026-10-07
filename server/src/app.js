'use strict';
// Fastify-App: Webapp statisch ausliefern + /api. Wird von server.js gestartet und in Tests genutzt.
const fastify = require('fastify');
const config = require('./config');
const { pool } = require('./db');
const { ApiError } = require('./errors');

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "font-src 'self'", "connect-src 'self'",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"
].join('; ');
const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=15552000',
  'content-security-policy': CSP,
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'geolocation=(), microphone=()'
};

function buildApp(){
  const app = fastify({
    trustProxy: 1,                  // genau ein Proxy davor (Traefik) → echte Client-IP aus X-Forwarded-For
    bodyLimit: 4096,
    logController: new fastify.LogController({ disableRequestLogging: true }),   // eigenes Log in onResponse
    return503OnClosing: true,
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      base: null,
      timestamp: function(){ return ',"time":"' + new Date().toISOString() + '"'; }
    }
  });

  app.removeContentTypeParser('text/plain');   // nur JSON-Bodies

  app.addHook('onRequest', async function(req, reply){
    reply.headers(SECURITY_HEADERS);
    if (req.url.startsWith('/api/')) reply.header('cache-control', 'no-store');
  });

  // Schreibende Anfragen nur von der eigenen Domain (zusätzlich zu SameSite=Strict beim Admin-Cookie)
  app.addHook('preHandler', async function(req){
    if (req.method === 'GET' || req.method === 'HEAD' || !req.url.startsWith('/api/')) return;
    const origin = req.headers.origin;
    if (origin && origin !== config.publicOrigin) throw new ApiError(403, 'forbidden');
    if (!origin && req.url.startsWith('/api/admin/')) throw new ApiError(403, 'forbidden');
  });

  // Schlanke Logs ohne personenbezogene Daten: Methode, Routen-Muster, Status, Dauer
  app.addHook('onResponse', async function(req, reply){
    const route = (req.routeOptions && req.routeOptions.url) || 'unmatched';
    if (route === '/api/health' && reply.statusCode < 400) return;
    req.log.info({ m: req.method, r: route, s: reply.statusCode, ms: Math.round(reply.elapsedTime) });
  });

  app.setErrorHandler(function(err, req, reply){
    if (err instanceof ApiError) return reply.code(err.status).send({ error: err.code });
    if (err.statusCode >= 400 && err.statusCode < 500){
      if (!req.url.startsWith('/api/')) return reply.code(err.statusCode).type('text/plain; charset=utf-8').send('Fehler');
      return reply.code(err.statusCode === 413 ? 413 : 400).send({ error: 'invalid_input' });
    }
    req.log.error({ err_code: err.code, err_name: err.name, r: req.routeOptions && req.routeOptions.url }, 'unhandled');
    return reply.code(500).send({ error: 'server_error' });
  });

  app.setNotFoundHandler(function(req, reply){
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not_found' });
    return reply.code(404).type('text/plain; charset=utf-8').send('Nicht gefunden');
  });

  app.get('/api/health', async function(req, reply){
    try{ await pool.query('select 1'); return { status: 'ok' }; }
    catch(e){ return reply.code(503).send({ error: 'db_down' }); }
  });

  app.register(require('./routes/player'));
  app.register(require('./routes/admin'));

  app.get('/admin', function(req, reply){ reply.redirect('/admin.html'); });
  app.register(require('@fastify/static'), {
    root: config.staticRoot,
    cacheControl: false,
    setHeaders: function(reply, file){
      if (file.endsWith('.html')) reply.header('cache-control', 'no-cache');
      else if (file.endsWith('.woff2')) reply.header('cache-control', 'public, max-age=604800, immutable');
      else reply.header('cache-control', 'public, max-age=300');   // Assets sind per ?v= versioniert
    }
  });

  return app;
}

module.exports = { buildApp };
