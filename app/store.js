// Datenschicht: eigene API unter /api (echt) oder localStorage (Demo-Modus auf GitHub Pages und lokal).
(function(){
  var C = window.ABFAHRT_CONFIG;
  var H = location.hostname;
  var DEMO = /\.github\.io$/.test(H) || H === 'localhost' || H === '127.0.0.1' || location.protocol === 'file:';
  var CHALLENGES = ['photo','vibe'];

  function lsGet(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function uuid(){ return (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now() + Math.random().toString(16).slice(2)); }
  function code(){ return 'AB-' + Math.random().toString(16).slice(2, 8).toUpperCase(); }

  // ---------- Charakter ohne KI (Fallback + Demo) ----------
  var TITLES = ['der nachtfalke','die bass-baronin','der discokönig','die beat-pilotin','der tanzflächen-titan','die konfetti-kanone','der groove-gigant','die mitternachts-muse','der lichtorgel-lord','die nebelmaschinen-queen'];
  var POWERS = ['taucht genau dann auf, wenn der Bass droppt','kennt jeden Refrain ab der ersten Sekunde','bringt die ganze Tanzfläche mit einem Move zum Kochen','findet im vollsten Club immer den besten Platz','macht aus jedem Fremden in 5 Minuten einen Freund','hört den Drop zehn Sekunden bevor er kommt'];
  var WEAK = ['„nur noch ein Lied“','vergisst die Zeit, sobald das Licht ausgeht','kann bei diesem einen Song nicht stillstehen','sagt um 3 Uhr immer noch „wir gehen gleich“','verliert jede Diskussion gegen den DJ'];
  function hash(s){ var h = 0; for(var i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0; } return h; }
  function localCharacter(funName, song, move){
    var h = hash((funName||'') + '|' + (song||'') + '|' + (move||''));
    var name = (funName || '').trim().toLowerCase();
    var title = name ? (name.indexOf('der ') === 0 || name.indexOf('die ') === 0 ? name : 'die legende „' + name + '“') : TITLES[h % TITLES.length];
    return {
      title: title,
      superpower: (move ? 'Mit „' + move + '“ ' : '') + POWERS[h % POWERS.length] + '.',
      weakness: song ? 'Bei „' + song + '“ ist alles zu spät.' : WEAK[(h >> 3) % WEAK.length]
    };
  }

  // Uhrzeit des Abends → Datum (Zeiten vor 12 Uhr gehören zum nächsten Tag)
  function eventTime(hhmm){
    var d = C.eventDate.split('.'), t = hhmm.split(':');
    var dt = new Date(+d[2], +d[1] - 1, +d[0], +t[0], +t[1]);
    if (+t[0] < 12) dt.setDate(dt.getDate() + 1);
    return dt;
  }
  var PRIZE_KEYS = (C.prizes || []).map(function(x){ return x.key; });

  // ---------- Testlauf der Live-Auslosung (nur Demo): ?probe=30 → Show startet in 30 s ----------
  var FAKE = ['Nachtfalke','Bass-Baronin','Discokönig','Beat-Pilotin','Konfetti-Kanone','Groove-Gigant','Mitternachts-Muse','Lichtorgel-Lord','Nebel-Queen','Tanzflächen-Titan',
              'Gleis 7','Zugvogel','Schaffnerin','Nachtzug','Bahnsteig-Boss','Funkenflug','Spätschicht','Sternfahrer','Neonfuchs','Weichensteller','Lokführerin','Ticketlos'];
  function probeAt(){ try{ var v = +sessionStorage.getItem('ab_probe'); return v > 0 ? v : 0; }catch(e){ return 0; } }
  function probeWinners(myName){
    var names = FAKE.filter(function(n){ return n !== myName; }), out = [], i = 0;
    (C.prizes || []).forEach(function(pr){ for (var k = 0; k < pr.count; k++) out.push({ fun_name: names[i++ % names.length], prize: pr.key }); });
    var fin = (C.revealOrder || []).slice(-1)[0];
    if (myName){ var j = Math.max(0, out.map(function(w){ return w.prize; }).lastIndexOf(fin)); out[j] = { fun_name: myName, prize: out[j].prize }; }   // eigener Name gewinnt im Finale
    return out;
  }

  function normHandle(h){ return (h || '').trim().replace(/^@+/, '').toLowerCase(); }
  function validate(d){
    var fn = (d.fun_name || '').trim();
    var ig = normHandle(d.ig_handle);
    if (fn.length < 2 || fn.length > 24) return 'Dein Spaßname braucht 2 bis 24 Zeichen.';
    if (!/^[a-z0-9._]{1,30}$/.test(ig)) return 'Bitte gib einen gültigen Instagram-Namen ein (nur Buchstaben, Zahlen, Punkt, Unterstrich).';
    return null;
  }

  // =====================================================================
  // DEMO-BACKEND (localStorage, nur dieses Gerät)
  // =====================================================================
  var demo = {
    mode: 'demo',
    init: function(){ return Promise.resolve(); },
    me: function(){
      var id = lsGet('ab_me', null); if(!id) return Promise.resolve(null);
      var p = lsGet('ab_players', []).filter(function(x){ return x.id === id; })[0] || null;
      var pr = probeAt();
      if (p && pr){ p = JSON.parse(JSON.stringify(p)); if (Date.now() >= pr){ var w = probeWinners(p.fun_name).filter(function(x){ return x.fun_name === p.fun_name; })[0]; p.status = 'won'; p.prize = w.prize; p.win_code = 'AB-TEST01'; } else { p.status = 'active'; p.prize = null; } }
      return Promise.resolve(p);
    },
    register: function(d){
      var err = validate(d); if (err) return Promise.reject(new Error(err));
      var players = lsGet('ab_players', []);
      var fn = d.fun_name.trim(), ig = normHandle(d.ig_handle);
      if (players.some(function(p){ return p.fun_name.toLowerCase() === fn.toLowerCase(); })) return Promise.reject(new Error('Diesen Spaßnamen gibt es schon. Nimm einen anderen.'));
      if (players.some(function(p){ return p.ig_handle === ig; })) return Promise.reject(new Error('Mit diesem Instagram-Namen ist schon jemand angemeldet.'));
      var p = { id: uuid(), fun_name: fn, ig_handle: ig, character: localCharacter(fn, d.song, d.move), photo_at: null, vibe_at: null, status: 'active', prize: null, win_code: null, created_at: new Date().toISOString() };
      players.push(p); lsSet('ab_players', players); lsSet('ab_me', p.id);
      return Promise.resolve(p);
    },
    complete: function(key){
      var id = lsGet('ab_me', null), players = lsGet('ab_players', []);
      players.forEach(function(p){ if (p.id === id && !p[key + '_at']) p[key + '_at'] = new Date().toISOString(); });
      lsSet('ab_players', players); return demo.me();
    },
    submitVibe: function(stars, text){
      var id = lsGet('ab_me', null);
      var vibes = lsGet('ab_vibes', []); vibes.push({ player_id: id, stars: stars, text: text, created_at: new Date().toISOString() }); lsSet('ab_vibes', vibes);
      return demo.complete('vibe');
    },
    stats: function(){
      var players = lsGet('ab_players', []), vibes = lsGet('ab_vibes', []);
      var byId = {}; players.forEach(function(p){ byId[p.id] = p; });
      var avg = vibes.length ? vibes.reduce(function(s,v){ return s + v.stars; }, 0) / vibes.length : null;
      return Promise.resolve({ players: players.length, vibe_avg: avg, vibe_count: vibes.length,
        recent: vibes.slice(-3).reverse().map(function(v){ return { fun_name: (byId[v.player_id]||{}).fun_name || '?', stars: v.stars, text: v.text }; }),
        sample: vibes.slice().sort(function(){ return Math.random() - .5; }).slice(0, 7).map(function(v){ return { fun_name: (byId[v.player_id]||{}).fun_name || '?', stars: v.stars, text: v.text }; }) });
    },
    // Live-Auslosung: Gewinner gibt es erst ab reveal_at (der echte Server hält sie bis dahin zurück)
    reveal: function(){
      var pr = probeAt(), players = lsGet('ab_players', []), id = lsGet('ab_me', null);
      var mine = players.filter(function(x){ return x.id === id; })[0];
      var at = pr || eventTime(C.revealTime).getTime(), now = Date.now();
      var names = players.filter(function(x){ return x.photo_at && x.vibe_at; }).map(function(x){ return x.fun_name; });
      if (names.length < 12) names = names.concat(FAKE);
      var winners = pr ? probeWinners(mine && mine.fun_name)
        : players.filter(function(x){ return (x.status === 'drawn' || x.status === 'won') && x.prize; }).map(function(x){ return { fun_name: x.fun_name, prize: x.prize }; });
      return Promise.resolve({ reveal_at: new Date(at).toISOString(), now: new Date(now).toISOString(), names: names.slice(0, 80),
        winners: now >= at ? winners : null });
    },
    // Admin
    deleteMe: function(){
      var id = lsGet('ab_me', null);
      var p = lsGet('ab_players', []).filter(function(x){ return x.id === id; })[0];
      if (p && (p.status === 'drawn' || p.status === 'won') && Date.now() >= eventTime(C.revealTime).getTime()) return Promise.reject(new Error('Nach der Ziehung kannst du deine Daten nicht mehr selbst löschen. Sprich das Team an.'));
      lsSet('ab_players', lsGet('ab_players', []).filter(function(x){ return x.id !== id; }));
      lsSet('ab_vibes', lsGet('ab_vibes', []).filter(function(v){ return v.player_id !== id; }));
      try{ localStorage.removeItem('ab_me'); }catch(e){}
      return Promise.resolve();
    },
    adminLogin: function(){ return Promise.resolve(); },
    adminIsLoggedIn: function(){ return Promise.resolve(true); },
    adminOverview: function(){
      var ps = lsGet('ab_players', []);
      return Promise.resolve({
        total: ps.length,
        eligible: ps.filter(function(p){ return p.status === 'active' && p.photo_at && p.vibe_at; }).length,
        photo: ps.filter(function(p){ return p.photo_at; }).length,
        vibe: ps.filter(function(p){ return p.vibe_at; }).length,
        // alle gezogenen Gewinner: status drawn = Story noch prüfen, won = geprüft
        winners: ps.filter(function(p){ return (p.status === 'drawn' || p.status === 'won') && p.prize; })
          .sort(function(a, b){ return PRIZE_KEYS.indexOf(a.prize) - PRIZE_KEYS.indexOf(b.prize); })
          .map(function(p){ return { id: p.id, fun_name: p.fun_name, ig_handle: p.ig_handle, prize: p.prize, win_code: p.win_code, checked: p.status === 'won' }; })
      });
    },
    // Füllt alle freien Gewinnplätze zufällig aus dem Lostopf (2/2, jede Person max. 1×)
    adminDrawAll: function(){
      var ps = lsGet('ab_players', []);
      var pool = ps.filter(function(p){ return p.status === 'active' && p.photo_at && p.vibe_at; });
      if (!pool.length) return Promise.reject(new Error('Niemand im Lostopf (2/2 erledigt).'));
      (C.prizes || []).forEach(function(pr){
        var have = ps.filter(function(p){ return p.prize === pr.key && (p.status === 'drawn' || p.status === 'won'); }).length;
        for (var k = have; k < pr.count && pool.length; k++){
          var w = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          w.status = 'drawn'; w.prize = pr.key; w.win_code = code();
        }
      });
      lsSet('ab_players', ps);
      return demo.adminOverview();
    },
    adminConfirm: function(id){
      var ps = lsGet('ab_players', []);
      ps.forEach(function(p){ if (p.id === id && p.status === 'drawn') p.status = 'won'; }); lsSet('ab_players', ps);
      return Promise.resolve();
    },
    // Keine Story gefunden → raus, und für denselben Gewinn wird sofort neu gezogen
    adminReject: function(id){
      var ps = lsGet('ab_players', []), prize = null;
      ps.forEach(function(p){ if (p.id === id && (p.status === 'drawn' || p.status === 'won')){ prize = p.prize; p.status = 'rejected'; p.prize = null; p.win_code = null; } });
      lsSet('ab_players', ps);
      var pool = ps.filter(function(p){ return p.status === 'active' && p.photo_at && p.vibe_at; });
      if (prize && pool.length){ var w = pool[Math.floor(Math.random() * pool.length)]; w.status = 'drawn'; w.prize = prize; w.win_code = code(); lsSet('ab_players', ps); }
      return Promise.resolve();
    },
    adminLogout: function(){ return Promise.resolve(); }
  };

  // =====================================================================
  // LIVE-BACKEND (eigene API, gleiche Domain → kein CORS)
  // =====================================================================
  var TOKEN = 'ab_token';   // Geräte-Kennung (256 Bit Zufall), der Server kennt nur ihren Hash
  function getToken(){ try{ return localStorage.getItem(TOKEN); }catch(e){ return null; } }
  function setToken(t){ try{ if (t) localStorage.setItem(TOKEN, t); else localStorage.removeItem(TOKEN); }catch(e){} }
  function friendly(e){
    var m = (e && e.message) || 'Unbekannter Fehler';
    if (/fun_name_unique/i.test(m)) return 'Diesen Spaßnamen gibt es schon. Nimm einen anderen.';
    if (/ig_handle_unique/i.test(m)) return 'Mit diesem Instagram-Namen ist schon jemand angemeldet.';
    if (/blocked_text/i.test(m)) return 'Bitte ohne Beleidigungen – formulier deinen Satz neu.';
    if (/not_admin/i.test(m)) return 'Kein Admin-Zugang für dieses Konto.';
    if (/empty_pot/i.test(m)) return 'Niemand im Lostopf (2/2 erledigt).';
    if (/not_drawn/i.test(m)) return 'Diese Person ist nicht mehr gezogen. Bitte Seite neu laden.';
    if (/locked_after_draw/i.test(m)) return 'Nach der Ziehung kannst du deine Daten nicht mehr selbst löschen. Sprich das Team an.';
    if (/already_registered/i.test(m)) return 'Auf diesem Handy bist du schon angemeldet. Bitte Seite neu laden.';
    if (/not_registered/i.test(m)) return 'Du bist nicht mehr angemeldet. Bitte Seite neu laden.';
    if (/rate_limited/i.test(m)) return 'Zu viele Versuche. Warte kurz und versuch es dann nochmal.';
    if (/invalid_input/i.test(m)) return 'Bitte prüf deine Eingabe.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Keine Verbindung. Bitte Internet prüfen und nochmal versuchen.';
    if (/server_error|db_down|HTTP 5\d\d/i.test(m)) return 'Gerade hakt es bei uns. Bitte gleich nochmal versuchen.';
    return m;
  }
  async function api(method, path, body){
    var headers = {}, t = getToken();
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (t) headers.Authorization = 'Bearer ' + t;
    var r;
    try{ r = await fetch('/api' + path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin', cache: 'no-store' }); }
    catch(e){ throw new Error(friendly(e)); }
    if (r.status === 204) return null;
    var data = null; try{ data = await r.json(); }catch(e){}
    if (!r.ok){
      var code = (data && data.error) || ('HTTP ' + r.status);
      var err = new Error(friendly({ message: code })); err.code = code; throw err;
    }
    return data;
  }

  var live = {
    mode: 'live',
    init: function(){ return Promise.resolve(); },
    // Server verrät Status/Gewinn/Code erst ab reveal_at
    me: async function(){
      if (!getToken()) return null;
      try{ return await api('GET', '/me'); }
      catch(e){ if (e.code === 'not_registered'){ setToken(null); return null; } throw e; }
    },
    register: async function(d){
      var err = validate(d); if (err) throw new Error(err);
      var fn = d.fun_name.trim();
      var r = await api('POST', '/register', { fun_name: fn, ig_handle: normHandle(d.ig_handle), character: localCharacter(fn, d.song, d.move) });
      setToken(r.token);
      return r.player;
    },
    complete: function(key){ return api('POST', '/challenge', { key: key }); },
    submitVibe: function(stars, text){ return api('POST', '/vibe', { stars: stars, text: text }); },
    stats: function(){ return api('GET', '/stats'); },
    reveal: function(){ return api('GET', '/reveal'); },
    deleteMe: async function(){ await api('DELETE', '/me'); setToken(null); },
    adminLogin: async function(email, pw){ await api('POST', '/admin/login', { email: email, password: pw }); },
    adminIsLoggedIn: async function(){
      try{ var r = await api('GET', '/admin/session'); return !!(r && r.admin); }catch(e){ return false; }
    },
    adminOverview: function(){ return api('GET', '/admin/overview'); },
    adminDrawAll: function(){ return api('POST', '/admin/draw-all', {}); },
    adminConfirm: async function(id){ await api('POST', '/admin/confirm', { id: id }); },
    adminReject: async function(id){ await api('POST', '/admin/reject', { id: id }); },
    adminLogout: async function(){ try{ await api('POST', '/admin/logout', {}); }catch(e){} }
  };

  window.AbfahrtStore = DEMO ? demo : live;
  window.AbfahrtStore.CHALLENGES = CHALLENGES;
  window.AbfahrtStore.isDemo = DEMO;
  window.AbfahrtStore.normHandle = normHandle;
  window.AbfahrtStore.eventTime = eventTime;
})();
