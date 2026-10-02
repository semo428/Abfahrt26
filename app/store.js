// Datenschicht: Supabase (echt) oder localStorage (Demo-Modus).
(function(){
  var C = window.ABFAHRT_CONFIG;
  var DEMO = !C.supabaseUrl || !C.supabaseAnonKey;
  var CHALLENGES = ['random','vibe','pose'];

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
    me: function(){ var id = lsGet('ab_me', null); if(!id) return Promise.resolve(null); var p = lsGet('ab_players', []).filter(function(x){ return x.id === id; })[0]; return Promise.resolve(p || null); },
    register: function(d){
      var err = validate(d); if (err) return Promise.reject(new Error(err));
      var players = lsGet('ab_players', []);
      var fn = d.fun_name.trim(), ig = normHandle(d.ig_handle);
      if (players.some(function(p){ return p.fun_name.toLowerCase() === fn.toLowerCase(); })) return Promise.reject(new Error('Diesen Spaßnamen gibt es schon. Nimm einen anderen.'));
      if (players.some(function(p){ return p.ig_handle === ig; })) return Promise.reject(new Error('Mit diesem Instagram-Namen ist schon jemand angemeldet.'));
      var p = { id: uuid(), fun_name: fn, ig_handle: ig, character: localCharacter(fn, d.song, d.move), random_at: null, vibe_at: null, pose_at: null, status: 'active', win_code: null, created_at: new Date().toISOString() };
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
        recent: vibes.slice(-3).reverse().map(function(v){ return { fun_name: (byId[v.player_id]||{}).fun_name || '?', stars: v.stars, text: v.text }; }) });
    },
    // Admin
    adminLogin: function(){ return Promise.resolve(); },
    adminIsLoggedIn: function(){ return Promise.resolve(true); },
    adminOverview: function(){
      var ps = lsGet('ab_players', []);
      return Promise.resolve({
        total: ps.length,
        eligible: ps.filter(function(p){ return p.status === 'active' && p.random_at && p.vibe_at && p.pose_at; }).length,
        random: ps.filter(function(p){ return p.random_at; }).length,
        vibe: ps.filter(function(p){ return p.vibe_at; }).length,
        pose: ps.filter(function(p){ return p.pose_at; }).length,
        winners: ps.filter(function(p){ return p.status === 'won'; }).map(function(p){ return { fun_name: p.fun_name, ig_handle: p.ig_handle, win_code: p.win_code }; }),
        drawn: ps.filter(function(p){ return p.status === 'drawn'; }).map(function(p){ return { id: p.id, fun_name: p.fun_name, ig_handle: p.ig_handle }; })
      });
    },
    adminDraw: function(){
      var ps = lsGet('ab_players', []);
      var pool = ps.filter(function(p){ return p.status === 'active' && p.random_at && p.vibe_at && p.pose_at; });
      if (!pool.length) return Promise.reject(new Error('Niemand im Lostopf (3/3 erledigt).'));
      var w = pool[Math.floor(Math.random() * pool.length)];
      ps.forEach(function(p){ if (p.id === w.id) p.status = 'drawn'; }); lsSet('ab_players', ps);
      return Promise.resolve({ id: w.id, fun_name: w.fun_name, ig_handle: w.ig_handle });
    },
    adminConfirm: function(id){
      var ps = lsGet('ab_players', []), c = code();
      ps.forEach(function(p){ if (p.id === id){ p.status = 'won'; p.win_code = c; } }); lsSet('ab_players', ps);
      return Promise.resolve({ win_code: c });
    },
    adminReject: function(id){
      var ps = lsGet('ab_players', []);
      ps.forEach(function(p){ if (p.id === id) p.status = 'rejected'; }); lsSet('ab_players', ps);
      return Promise.resolve();
    },
    adminLogout: function(){ return Promise.resolve(); }
  };

  // =====================================================================
  // SUPABASE-BACKEND
  // =====================================================================
  var sb = null;
  function client(){ if (!sb) sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } }); return sb; }
  function unwrap(r){ if (r.error) throw new Error(friendly(r.error)); return r.data; }
  function friendly(e){
    var m = (e && (e.message || e.details)) || 'Unbekannter Fehler';
    if (/players_fun_name_key|fun_name_unique/i.test(m)) return 'Diesen Spaßnamen gibt es schon. Nimm einen anderen.';
    if (/players_ig_unique|ig_handle_unique/i.test(m)) return 'Mit diesem Instagram-Namen ist schon jemand angemeldet.';
    if (/blocked_text/i.test(m)) return 'Bitte ohne Beleidigungen – formulier deinen Satz neu.';
    if (/not_admin/i.test(m)) return 'Kein Admin-Zugang für dieses Konto.';
    if (/empty_pot/i.test(m)) return 'Niemand im Lostopf (3/3 erledigt).';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Keine Verbindung. Bitte Internet prüfen und nochmal versuchen.';
    return m;
  }

  var live = {
    mode: 'live',
    init: async function(){
      var s = await client().auth.getSession();
      if (!s.data.session){ unwrap(await client().auth.signInAnonymously()); }
    },
    me: async function(){
      var u = (await client().auth.getUser()).data.user; if (!u) return null;
      return unwrap(await client().from('players').select('*').eq('id', u.id).maybeSingle());
    },
    register: async function(d){
      var err = validate(d); if (err) throw new Error(err);
      var fn = d.fun_name.trim(), ig = normHandle(d.ig_handle);
      var character = null;
      try{
        var r = await client().functions.invoke('character', { body: { fun_name: fn, song: (d.song||'').slice(0,60), move: (d.move||'').slice(0,60) } });
        if (!r.error && r.data && r.data.title) character = r.data;
      }catch(e){}
      if (!character) character = localCharacter(fn, d.song, d.move);
      var u = (await client().auth.getUser()).data.user;
      return unwrap(await client().from('players').insert({ id: u.id, fun_name: fn, ig_handle: ig, character: character }).select().single());
    },
    complete: async function(key){ return unwrap(await client().rpc('complete_challenge', { p_key: key })); },
    submitVibe: async function(stars, text){ unwrap(await client().rpc('submit_vibe', { p_stars: stars, p_text: text })); return live.me(); },
    stats: async function(){ return unwrap(await client().rpc('public_stats')); },
    adminLogin: async function(email, pw){ unwrap(await client().auth.signInWithPassword({ email: email, password: pw })); },
    adminIsLoggedIn: async function(){
      var u = (await client().auth.getUser()).data.user; if (!u || u.is_anonymous) return false;
      var r = await client().rpc('is_admin'); return !r.error && r.data === true;
    },
    adminOverview: async function(){ return unwrap(await client().rpc('admin_overview')); },
    adminDraw: async function(){ return unwrap(await client().rpc('admin_draw')); },
    adminConfirm: async function(id){ return unwrap(await client().rpc('admin_confirm', { p_id: id })); },
    adminReject: async function(id){ unwrap(await client().rpc('admin_reject', { p_id: id })); },
    adminLogout: async function(){ await client().auth.signOut(); }
  };

  window.AbfahrtStore = DEMO ? demo : live;
  window.AbfahrtStore.CHALLENGES = CHALLENGES;
  window.AbfahrtStore.isDemo = DEMO;
  window.AbfahrtStore.normHandle = normHandle;
})();
