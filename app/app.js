// Abfahrt · alfons x — Spieler-App (Anmeldung, Mission, Challenges, Gewinn)
(function(){
  var C = window.ABFAHRT_CONFIG, S = window.AbfahrtStore, F = window.AbfahrtFrame;
  var root = document.getElementById('app');
  var HANDLE = '@' + C.instagram;
  var me = null, pollTimer = null, clockTimer = null;

  var CH = {
    random: { n: 1, title: 'random-foto', label: 'Random-Foto', sub: 'Foto mit einer fremden Person', task: 'Mach ein Foto mit jemandem, den du heute zum ersten Mal siehst, und poste es als Story mit ' + HANDLE + '.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 20c.7-3.4 3-5 5.5-5s4.8 1.6 5.5 5M10.5 20c.7-3.4 3-5 5.5-5s4.8 1.6 5.5 5"/></svg>' },
    vibe: { n: 2, title: 'vibe-check', label: 'Vibe-Check', sub: 'Sterne + ein Satz', task: 'Wie ist dein Vibe gerade? Sterne vergeben und einen Satz schreiben.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>' },
    pose: { n: 3, title: 'best pose', label: 'Best Pose', sub: 'Deine beste Pose als Story', task: 'Mach die Pose, die deiner Meinung nach den Abend gewinnt, und poste sie als Story mit ' + HANDLE + '. Die besten Posen kommen in unsere Story-Umfrage.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M12 9l-6-3M12 9l5 -4M12 14l-4 6M12 14l4 6"/></svg>' }
  };
  var ORDER = ['random', 'vibe', 'pose'];
  // Grober Vorfilter im Browser – der eigentliche Filter läuft zusätzlich in der Datenbank (submit_vibe)
  var BLOCK = /(hurensohn|wichser|fotze|schlampe|nutte|missgeburt|spast|behindert|neger|kanake|schwuchtel|fick\s*dich|nazi|heil\s*hitler)/i;

  // ---------- Helfer ----------
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function $(sel){ return root.querySelector(sel); }
  function doneCount(p){ return ORDER.filter(function(k){ return p && p[k + '_at']; }).length; }
  function stopTimers(){ clearInterval(pollTimer); clearInterval(clockTimer); pollTimer = clockTimer = null; }
  function render(html){ stopTimers(); root.innerHTML = html; window.scrollTo(0, 0); var h = root.querySelector('h1,h2'); if (h){ h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  function top(){
    return '<header class="top"><a class="brand" href="./" aria-label="Zur Mission"><img src="logo.png" alt=""><b>abfahrt</b></a>' +
      '<span class="date"><b>' + esc(C.eventDate.slice(0, 5).replace('.', '/')) + '</b> · alfons x</span></header>' +
      (S.isDemo ? '<div class="demo-banner">DEMO-MODUS · Daten bleiben nur auf diesem Gerät</div>' : '');
  }
  function foot(){
    return '<footer class="foot"><a href="teilnahmebedingungen.html">Teilnahmebedingungen</a><a href="datenschutz.html">Datenschutz</a><span>alfons x · Sigmaringen</span></footer>';
  }
  function errorBox(id){ return '<p class="error" id="' + id + '" role="alert" hidden></p>'; }
  function showError(id, msg){ var el = $('#' + id); if (el){ el.textContent = msg; el.hidden = false; } }
  function busy(btn, on, label){ if (!btn) return; btn.disabled = on; if (label) btn.textContent = label; }
  function charCard(p, small){
    var c = p.character || {};
    return '<div class="char' + (small ? ' small' : '') + '">' +
      '<span class="r">' + (small ? 'Dein Charakter · ' + esc(p.fun_name) : 'Dein Charakter für die Abfahrt') + '</span>' +
      '<span class="n">' + esc(c.title || p.fun_name) + '</span>' +
      '<p><b>Superkraft:</b> ' + esc(c.superpower || '') + '</p>' +
      '<p><b>Schwäche:</b> ' + esc(c.weakness || '') + '</p></div>';
  }

  // ---------- Start ----------
  var params = new URLSearchParams(location.search);
  var prefill = S.normHandle(params.get('u') || '');
  var station = params.get('station');
  if (station && CH[station]){ try{ sessionStorage.setItem('ab_station', station); }catch(e){} }
  if (params.has('station') || params.has('u')){
    try{ if (prefill) sessionStorage.setItem('ab_u', prefill); }catch(e){}
    history.replaceState(null, '', location.pathname);
  }
  if (!prefill){ try{ prefill = sessionStorage.getItem('ab_u') || ''; }catch(e){} }
  function takeStation(){ var s = null; try{ s = sessionStorage.getItem('ab_station'); sessionStorage.removeItem('ab_station'); }catch(e){} return CH[s] ? s : null; }
  function pendingList(){ try{ return JSON.parse(localStorage.getItem('ab_pending') || '[]'); }catch(e){ return []; } }
  function setPending(l){ try{ localStorage.setItem('ab_pending', JSON.stringify(l)); }catch(e){} }
  async function flushPending(){
    var l = pendingList(); if (!l.length || !me) return;
    for (var i = 0; i < l.length; i++){ try{ if (!me[l[i] + '_at']) me = await S.complete(l[i]) || me; }catch(e){ return; } }
    setPending([]);
  }
  function peekStation(){ try{ var s = sessionStorage.getItem('ab_station'); return CH[s] ? s : null; }catch(e){ return null; } }

  async function boot(){
    render(top() + '<div class="spin" role="status" aria-label="Lädt"></div>');
    try{
      await S.init();
      me = await S.me();
      await flushPending();
    }catch(e){
      render(top() + '<div class="view"><h2>keine verbindung.</h2><p class="lede">' + esc(e.message) + '</p><button class="btn red" id="retry">Nochmal versuchen</button></div>');
      $('#retry').onclick = boot; return;
    }
    route();
  }
  function route(){
    if (!me) return viewRegister();
    if (me.status === 'won') return viewWin();
    var s = takeStation();
    if (s) return viewChallenge(s);
    viewDashboard();
  }

  // ---------- Anmeldung ----------
  async function viewRegister(){
    render(top() +
      '<section class="view">' +
        '<div class="hero"><span class="eyebrow">Dein Ticket für die</span><div class="big-word">abfahrt<span>.</span></div>' +
        '<div class="sub">' + esc(C.eventDate.split('.')[0]) + '<span>/</span>' + esc(C.eventDate.split('.')[1]) + ' · alfons x</div></div>' +
        '<p class="lede">Melde dich an, schaff im Club <strong>3 Challenges</strong> und du landest im Lostopf für <strong>' + esc(C.prize) + '</strong>.</p>' +
        '<div class="counter" id="counter" hidden><span class="n" id="count">0</span><span>sind schon dabei</span></div>' +
        '<form id="reg" novalidate>' +
          '<h1 style="font-size:34px">ticket lösen.</h1>' +
          '<div class="field"><label for="fn">Dein Spaßname</label><input class="input" id="fn" name="fn" maxlength="24" autocomplete="off" placeholder="z. B. Nachtfalke" required><small>Bitte nicht dein echter Name – so wirst du bei der Ziehung aufgerufen.</small></div>' +
          '<div class="field"><label for="ig">Dein Instagram</label><div class="input-at"><span>@</span><input class="input" id="ig" name="ig" maxlength="30" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="deinname" required value="' + esc(prefill) + '"></div><small>Brauchen wir, um deine Story bei der Ziehung zu finden.</small></div>' +
          '<div class="field"><label for="song">Dein Song heute</label><input class="input" id="song" name="song" maxlength="60" placeholder="z. B. Mr. Brightside"></div>' +
          '<div class="field"><label for="move">Dein Party-Move</label><input class="input" id="move" name="move" maxlength="60" placeholder="z. B. Luftgitarre"></div>' +
          '<label class="check" for="ok"><input type="checkbox" id="ok" required><span>Ich akzeptiere die <a href="teilnahmebedingungen.html" target="_blank" rel="noopener">Teilnahmebedingungen</a> und habe den <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzhinweis</a> gelesen.</span></label>' +
          errorBox('reg-err') +
          '<button class="btn red" id="reg-btn" type="submit">Ticket lösen + Charakter holen</button>' +
          '<p class="muted">Wir speichern nur Spaßname, Instagram-Name und deine erledigten Challenges. Fotos bleiben auf deinem Handy.</p>' +
        '</form>' +
      '</section>' + foot());
    try{ var st = await S.stats(); if (st && st.players > 0){ $('#count').textContent = st.players.toLocaleString('de-DE'); $('#counter').hidden = false; } }catch(e){}
    $('#reg').addEventListener('submit', async function(ev){
      ev.preventDefault();
      var btn = $('#reg-btn'), err = $('#reg-err'); err.hidden = true;
      if (!$('#ok').checked) return showError('reg-err', 'Bitte bestätige die Teilnahmebedingungen.');
      var fn = $('#fn').value;
      if (BLOCK.test(fn)) return showError('reg-err', 'Such dir bitte einen anderen Spaßnamen aus.');
      busy(btn, true, 'Dein Charakter wird erstellt …');
      try{
        me = await S.register({ fun_name: fn, ig_handle: $('#ig').value, song: $('#song').value, move: $('#move').value });
        try{ sessionStorage.removeItem('ab_u'); }catch(e){}
        viewCharacter();
      }catch(e){ showError('reg-err', e.message); busy(btn, false, 'Ticket lösen + Charakter holen'); }
    });
  }

  function viewCharacter(){
    var next = peekStation();
    render(top() + '<section class="view">' +
      '<span class="eyebrow">Ticket gelöst ✓</span><h1>du bist dabei.</h1>' + charCard(me, false) +
      '<button class="btn red" id="go">' + (next ? 'Weiter zur Challenge' : 'Zu deiner Mission') + '</button>' +
      '</section>' + foot());
    $('#go').onclick = route;
  }

  // ---------- Dashboard ----------
  async function viewDashboard(){
    var n = doneCount(me);
    var tasks = ORDER.map(function(k){
      var done = !!me[k + '_at'];
      return '<li><button type="button" class="task' + (done ? ' done' : '') + '" data-k="' + k + '"><span class="ic" aria-hidden="true">' + CH[k].icon + '</span>' +
        '<span><b>' + esc(CH[k].label) + '</b><small>' + esc(CH[k].sub) + '</small></span>' +
        '<span class="st">' + (done ? '✓ erledigt' : 'starten<i aria-hidden="true">›</i>') + '</span></button></li>';
    }).join('');
    var pot = n === 3
      ? '<div class="pot in"><b>du bist im lostopf.</b><p>Ziehung um ' + esc(C.drawTime) + ' Uhr. Der DJ ruft den Gewinner auf – halt dein Handy bereit.</p></div>'
      : '<div class="pot"><b>noch ' + (3 - n) + ' bis zum lostopf.</b><p>Tippe oben auf eine Challenge und leg los.</p></div>';
    var drawn = me.status === 'drawn'
      ? '<div class="drawn" role="status"><span class="eyebrow">Achtung</span><b>du wurdest gezogen!</b><p class="status">Das Team prüft gerade deine Story. Bleib in der Nähe vom DJ-Pult.</p></div>' : '';
    render(top() + '<section class="view">' + drawn + charCard(me, true) +
      '<div><div class="progress-head"><span class="eyebrow">Deine Mission</span><span class="n">' + n + '<span>/3</span></span></div>' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="' + n + '"><i style="width:' + (n / 3 * 100) + '%"></i></div></div>' +
      '<ul class="tasks" style="list-style:none;margin:0;padding:0">' + tasks + '</ul>' + pot +
      '<div class="hint"><span aria-hidden="true">📌</span><span>Storys zählen nur mit Markierung <b>' + esc(HANDLE) + '</b>. Das Team prüft das bei der Ziehung.</span></div>' +
      '<div class="vibe-live" id="vibe-live" hidden><span class="eyebrow">Live-Stimmung</span><div class="avg"><span class="n" id="v-avg"></span><span class="muted" id="v-count"></span></div><ul id="v-list"></ul></div>' +
      '<div class="counter" id="counter" hidden><span class="n" id="count">0</span><span>sind heute dabei</span></div>' +
      (me.status === 'drawn' ? '' :
        '<div class="reset"><button class="linkbtn" id="reset">Daten löschen &amp; neu anmelden</button>' +
        '<div class="confirm" id="reset-box" hidden><b>wirklich löschen?</b><p>Dein Spaßname, Charakter, Instagram-Name und alle erledigten Challenges werden <b>komplett gelöscht</b>. Danach kannst du dich neu anmelden.</p>' +
        errorBox('reset-err') + '<div class="btn-row"><button class="btn danger" id="reset-yes">Ja, alles löschen</button><button class="btn ghost" id="reset-no">Abbrechen</button></div></div></div>') +
      '</section>' + foot());
    wireReset();
    root.querySelectorAll('button.task').forEach(function(b){ b.addEventListener('click', function(){ viewChallenge(b.dataset.k); }); });
    refreshStats();
    pollTimer = setInterval(async function(){
      try{
        var fresh = await S.me(); if (!fresh) return;
        var changed = fresh.status !== me.status || doneCount(fresh) !== doneCount(me);
        me = fresh;
        if (me.status === 'won') return viewWin();
        if (changed) return viewDashboard();
        refreshStats();
      }catch(e){}
    }, 20000);
  }
  function wireReset(){
    if (!$('#reset')) return;
    $('#reset').onclick = function(){ $('#reset-box').hidden = false; this.hidden = true; $('#reset-box').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    $('#reset-no').onclick = function(){ $('#reset-box').hidden = true; $('#reset').hidden = false; };
    $('#reset-yes').onclick = async function(){
      busy(this, true, 'Wird gelöscht …');
      try{
        await S.deleteMe();
        ['ab_pending','ab_unlocked'].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
        try{ sessionStorage.clear(); }catch(e){}
        me = null; prefill = ''; boot();
      }catch(e){ showError('reset-err', e.message); busy(this, false, 'Ja, alles löschen'); }
    };
  }
  async function refreshStats(){
    try{
      var st = await S.stats(); if (!st) return;
      if (st.players > 0 && $('#count')){ $('#count').textContent = st.players.toLocaleString('de-DE'); $('#counter').hidden = false; }
      if (st.vibe_count > 0 && $('#vibe-live')){
        $('#v-avg').innerHTML = esc(Number(st.vibe_avg).toFixed(1).replace('.', ',')) + '<em>★</em>';
        $('#v-count').textContent = st.vibe_count + (st.vibe_count == 1 ? ' Bewertung' : ' Bewertungen');
        $('#v-list').innerHTML = (st.recent || []).map(function(v){ return '<li><b>' + esc(v.fun_name) + '</b> ' + '★'.repeat(v.stars) + ' „' + esc(v.text) + '“</li>'; }).join('');
        $('#vibe-live').hidden = false;
      }
    }catch(e){}
  }

  // ---------- Challenges ----------
  function viewChallenge(key){
    var ch = CH[key], done = !!me[key + '_at'];
    var head = '<a href="./" class="muted" id="back">← Zur Mission</a>' +
      '<div class="chal-head"><span class="chip red">Challenge ' + ch.n + '</span><h1>' + esc(ch.title) + '</h1><p class="task-text">' + esc(ch.task) + '</p></div>' +
      '<div class="done-box" id="done-box"' + (done ? '' : ' hidden') + '><b>erledigt ✓</b><span class="status">Die Challenge ist abgehakt. Du kannst sie trotzdem nochmal machen.</span></div>';
    render(top() + '<section class="view">' + head + (key === 'vibe' ? vibeTools() : photoTools(key)) +
      '<button class="btn ghost" id="to-dash">Zur Mission</button></section>' + foot());
    $('#to-dash').onclick = function(){ viewDashboard(); };
    $('#back').onclick = function(ev){ ev.preventDefault(); viewDashboard(); };
    if (key === 'vibe') wireVibe(); else wirePhoto(key);
  }
  async function markDone(key){
    var l = pendingList(); if (l.indexOf(key) < 0){ l.push(key); setPending(l); }
    me = await S.complete(key) || me;
    setPending(pendingList().filter(function(k){ return k !== key; }));
    var box = $('#done-box'); if (box){ box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    var n = doneCount(me);
    if (n === 3 && box) box.querySelector('.status').textContent = 'Alle 3 geschafft – du bist im Lostopf! Ziehung um ' + C.drawTime + ' Uhr.';
  }

  function photoTools(key){
    return '<label class="btn red" for="cam" id="cam-label">Foto aufnehmen</label>' +
      '<input id="cam" type="file" accept="image/*" capture="environment" hidden>' +
      '<img class="preview" id="preview" alt="Dein Foto mit Abfahrt-Rahmen" hidden>' +
      '<div class="hint" id="tag-hint" hidden><span aria-hidden="true">👉</span><span>Siehst du oben im Bild das gestrichelte Feld <b>„hier alfons x markieren“</b>? Setz genau dort in Instagram die Erwähnung <b>' + esc(HANDLE) + '</b> drauf. Der Name ist schon kopiert – einfach einfügen.</span></div>' +
      '<button class="btn" id="share" hidden>In Story teilen</button>' +
      '<p class="status" id="status" aria-live="polite">Der Abfahrt-Rahmen kommt automatisch aufs Foto. Das Foto bleibt auf deinem Handy.</p>' +
      errorBox('ch-err') +
      '<div class="divider">schon direkt in Instagram gepostet?</div>' +
      '<button class="btn ghost" id="already">Ich habe schon eine Story mit ' + esc(HANDLE) + ' gepostet</button>';
  }
  function wirePhoto(key){
    var file = null;
    $('#cam').addEventListener('change', async function(){
      var f = this.files && this.files[0]; if (!f) return;
      $('#status').textContent = 'Rahmen wird gesetzt …';
      try{
        var out = await F.photo(f, key); file = out.file;
        $('#preview').src = out.url; $('#preview').hidden = false;
        $('#share').hidden = false; $('#tag-hint').hidden = false;
        $('#cam-label').textContent = 'Neues Foto aufnehmen'; $('#cam-label').classList.remove('red'); $('#cam-label').classList.add('ghost');
        $('#status').innerHTML = 'Fertig → <b>In Story teilen</b> → Instagram → <b>Story</b>.';
      }catch(e){ $('#status').textContent = 'Das Foto konnte nicht geladen werden. Bitte nochmal versuchen.'; }
    });
    $('#share').addEventListener('click', async function(){
      if (!file) return;
      markDone(key).catch(function(e){ showError('ch-err', e.message); });   // nicht abwarten – sonst blockt iOS das Teilen
      var r = await F.share(file);
      if (r === 'shared' || r === 'aborted') $('#status').innerHTML = 'Challenge abgehakt ✓ Jetzt in Instagram: Erwähnung <b>' + esc(HANDLE) + '</b> auf das Feld „hier alfons x markieren“ oben im Bild setzen und als <b>Story</b> posten – ohne echte Markierung zählt sie bei der Ziehung nicht.';
      else $('#status').innerHTML = 'Challenge abgehakt ✓ Direktes Teilen geht hier nicht: <b>Bild gedrückt halten → „Bild sichern“</b> → in Instagram als Story posten und ' + esc(HANDLE) + ' markieren.';
    });
    async function confirm(btn){
      busy(btn, true);
      try{ await markDone(key); btn.hidden = true; }
      catch(e){ showError('ch-err', e.message); busy(btn, false); }
    }
    $('#already').addEventListener('click', function(){ confirm(this); });
  }

  function vibeTools(){
    var stars = [1,2,3,4,5].map(function(i){ return '<button type="button" role="radio" aria-checked="false" aria-label="' + i + (i > 1 ? ' Sterne' : ' Stern') + '" data-v="' + i + '">★</button>'; }).join('');
    return '<div class="stars" role="radiogroup" aria-label="Wie ist dein Vibe?">' + stars + '</div>' +
      '<div class="field"><label for="vt">Dein Vibe in einem Satz</label><textarea class="input" id="vt" rows="2" maxlength="80" placeholder="z. B. bester DJ seit Jahren"></textarea></div>' +
      errorBox('ch-err') +
      '<button class="btn red" id="send">Vibe abschicken</button>' +
      '<img class="preview" id="preview" alt="Deine Vibe-Karte" hidden>' +
      '<div class="hint" id="tag-hint" hidden><span aria-hidden="true">👉</span><span>Optional: Teile deine Vibe-Karte als Story – und setz die Erwähnung <b>' + esc(HANDLE) + '</b> auf das Feld <b>„hier alfons x markieren“</b> oben im Bild.</span></div>' +
      '<button class="btn" id="share" hidden>Vibe-Karte in Story teilen</button>' +
      '<p class="status" id="status" aria-live="polite"></p>';
  }
  function wireVibe(){
    var stars = 0, file = null, btns = root.querySelectorAll('.stars button');
    btns.forEach(function(b){
      b.addEventListener('click', function(){
        stars = +b.dataset.v;
        btns.forEach(function(o){ o.classList.toggle('on', +o.dataset.v <= stars); o.setAttribute('aria-checked', +o.dataset.v === stars ? 'true' : 'false'); });
      });
    });
    $('#send').addEventListener('click', async function(){
      var t = $('#vt').value.trim(), btn = this; $('#ch-err').hidden = true;
      if (!stars) return showError('ch-err', 'Bitte zuerst Sterne vergeben.');
      if (t.length < 2) return showError('ch-err', 'Schreib noch einen Satz zu deinem Vibe.');
      if (BLOCK.test(t)) return showError('ch-err', 'Bitte ohne Beleidigungen – formulier deinen Satz neu.');
      busy(btn, true, 'Wird gesendet …');
      try{
        me = await S.submitVibe(stars, t) || me;
        btn.hidden = true;
        $('#done-box').hidden = false;
        if (doneCount(me) === 3) $('#done-box .status').textContent = 'Alle 3 geschafft – du bist im Lostopf! Ziehung um ' + C.drawTime + ' Uhr.';
        var out = await F.vibe(stars, t, me.fun_name); file = out.file;
        $('#preview').src = out.url; $('#preview').hidden = false; $('#share').hidden = false; $('#tag-hint').hidden = false;
        $('#status').textContent = 'Abgeschickt ✓ Dein Vibe zählt jetzt zur Live-Stimmung.';
      }catch(e){ showError('ch-err', e.message); busy(btn, false, 'Vibe abschicken'); }
    });
    $('#share').addEventListener('click', async function(){
      if (!file) return;
      var r = await F.share(file);
      if (r === 'unsupported' || r === 'blocked') $('#status').innerHTML = 'Direktes Teilen geht hier nicht. <b>Bild gedrückt halten → „Bild sichern“</b> → in Instagram als Story posten.';
    });
  }

  // ---------- Gewonnen ----------
  function viewWin(){
    render(top() + '<section class="view"><div class="win" role="status">' +
      '<span class="eyebrow" style="color:rgba(243,234,230,.8)">Abfahrt · ' + esc(C.eventDate.slice(0, 5).replace('.', '/')) + '</span>' +
      '<span class="n">gewonnen.</span>' +
      '<p>Komm zum DJ-Pult und zeig diesen Screen.</p>' +
      '<span class="live-code" id="code">' + esc(me.win_code || '') + '</span>' +
      '<p class="muted" style="color:rgba(243,234,230,.75)">' + esc(me.fun_name) + ' · @' + esc(me.ig_handle) + '</p>' +
      '</div></section>' + foot());
    function tick(){ var d = new Date(); var el = $('#code'); if (el) el.textContent = (me.win_code || '') + ' · ' + d.toLocaleTimeString('de-DE'); }
    tick(); clockTimer = setInterval(tick, 1000);
  }

  boot();
})();
