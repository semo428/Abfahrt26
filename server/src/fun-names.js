'use strict';
// Spaßnamen-Liste: dieselbe Datei wie im Frontend (app/fun-names.js). Im Container liegt sie unter public/,
// lokal neben server/. Prüft beim Start, dass die Liste sauber ist (Länge, Wortfilter, keine Doppelten).
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { BLOCK } = require('./validate');

const file = [path.join(config.staticRoot, 'fun-names.js'), path.join(__dirname, '..', '..', 'app', 'fun-names.js')].find(f => fs.existsSync(f));
if (!file) throw new Error('fun-names.js nicht gefunden');
const names = require(file);
const seen = new Set();
for (const n of names){
  if (typeof n !== 'string' || n.length < 2 || n.length > 20 || n !== n.trim() || BLOCK.test(n) || seen.has(n.toLowerCase())) throw new Error('fun-names.js: ungültiger Name ' + JSON.stringify(n));
  seen.add(n.toLowerCase());
}
if (names.length < 100) throw new Error('fun-names.js: zu wenige Namen');
module.exports = Object.freeze(names.slice());
