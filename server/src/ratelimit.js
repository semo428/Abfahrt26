'use strict';
// Einfaches Rate-Limit im Speicher (fester Zeitfenster-Zähler). Reicht, weil genau ein App-Prozess läuft.
class Limiter {
  constructor(limit, windowMs){
    this.limit = limit;           // 0 = kein Limit
    this.windowMs = windowMs;
    this.map = new Map();
    setInterval(() => this.sweep(), Math.max(windowMs, 10000)).unref();
  }
  hit(key){
    if (!this.limit) return true;
    const now = Date.now();
    let e = this.map.get(key);
    if (!e || now >= e.reset){ e = { n: 0, reset: now + this.windowMs }; this.map.set(key, e); }
    e.n++;
    return e.n <= this.limit;
  }
  sweep(){
    const now = Date.now();
    for (const [k, e] of this.map) if (now >= e.reset) this.map.delete(k);
  }
}
module.exports = { Limiter };
