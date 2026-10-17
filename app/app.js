// Abfahrt · alfons x — Spieler-App (Anmeldung, Gewinnspiel, Challenges, Gewinn)
(function(){
  var C = window.ABFAHRT_CONFIG, S = window.AbfahrtStore, F = window.AbfahrtFrame;
  var root = document.getElementById('app');
  var HANDLE = '@' + C.instagram;
  var me = null, pollTimer = null, clockTimer = null, vibeTimer = null;

  var CH = {
    photo: { n: 1, title: 'abfahrt-foto', label: 'Abfahrt-Foto', sub: 'Du & deine Crew', task: 'Poste ein Bild von dir während der Abfahrt – gerne auch mit deiner Crew – als Story mit ' + HANDLE + '.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.6"/></svg>' },
    vibe: { n: 2, title: 'vibe-check', label: 'Vibe-Check', sub: 'Sterne + ein Satz', task: 'Wie ist dein Vibe gerade? Sterne vergeben und einen Satz schreiben.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>' }
  };
  var ORDER = ['photo', 'vibe'];
  var TOTAL = ORDER.length;
  // Grober Vorfilter im Browser – der eigentliche Filter läuft zusätzlich in der Datenbank (submit_vibe)
  var BLOCK = /(hurensohn|wichser|fotze|schlampe|nutte|missgeburt|spast|behindert|neger|kanake|schwuchtel|fick\s*dich|nazi|heil\s*hitler)/i;

  // ---------- Helfer ----------
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function $(sel){ return root.querySelector(sel); }
  function doneCount(p){ return ORDER.filter(function(k){ return p && p[k + '_at']; }).length; }
  function stopTimers(){ clearInterval(pollTimer); clearInterval(clockTimer); clearInterval(vibeTimer); clearInterval(typeof vibeAuto !== 'undefined' ? vibeAuto : 0); pollTimer = clockTimer = vibeTimer = null; }
  function render(html){ stopTimers(); root.innerHTML = html; window.scrollTo(0, 0); var h = root.querySelector('h1,h2'); if (h){ h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  function top(){
    return '<header class="top"><a class="brand" href="#mission" aria-label="Zum Gewinnspiel"><img src="logo.png" alt=""><b>abfahrt</b></a>' +
      '<span class="date"><b>' + esc(C.eventDate.slice(0, 5).replace('.', '/')) + '</b> · alfons x</span></header>';
  }
  function foot(){
    return '<footer class="foot"><a href="teilnahmebedingungen.html">Teilnahmebedingungen</a><a href="datenschutz.html">Datenschutz</a><span>alfons x · Sigmaringen</span></footer>';
  }
  // ---------- Gewinne ----------
  var PRIZES = C.prizes || [];
  var PRIZE_TOTAL = PRIZES.reduce(function(s, p){ return s + p.count; }, 0);
  function ticker(){
    if (!PRIZES.length) return '';
    var items = '<span><b>🎁 ' + PRIZE_TOTAL + ' Gewinne heute Nacht</b></span><i>✦</i>' +
      PRIZES.map(function(p){ return '<span>' + esc(p.icon) + ' <b>' + p.count + '×</b> ' + esc(p.title + ' ' + p.sub) + '</span><i>✦</i>'; }).join('');
    var label = PRIZE_TOTAL + ' Gewinne heute Nacht: ' + PRIZES.map(function(p){ return p.count + '× ' + p.title + ' ' + p.sub; }).join(', ');
    return '<div class="ticker" role="note" aria-label="' + esc(label) + '"><div class="ticker-track" aria-hidden="true">' +
      '<div class="ticker-set">' + items + '</div><div class="ticker-set">' + items + '</div></div></div>';
  }
  function prizeGrid(){
    if (!PRIZES.length) return '';
    return '<div class="prizes"><ul>' +
      PRIZES.map(function(p){ return '<li><span class="pi" aria-hidden="true">' + esc(p.icon) + '</span><span class="pc">' + p.count + '×</span><b>' + esc(p.title) + '</b><small>' + esc(p.sub) + '</small></li>'; }).join('') +
      '</ul></div>';
  }
  function rulesCard(){
    return '<a class="rules-card" href="#regeln"><span class="ri" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M9 12l2 2 4-4" stroke-linecap="round"/></svg></span>' +
      '<span><b>Zuallererst:</b> Schau dir unsere <u>Rules</u> an – sie gelten ausnahmslos für jeden!</span><span class="ra" aria-hidden="true">›</span></a>';
  }
  function errorBox(id){ return '<p class="error" id="' + id + '" role="alert" hidden></p>'; }
  function showError(id, msg){ var el = $('#' + id); if (el){ el.textContent = msg; el.hidden = false; } }
  function busy(btn, on, label){ if (!btn) return; btn.disabled = on; if (label) btn.textContent = label; }
  function charCard(p, small){
    var c = p.character || S.localCharacter(p.fun_name);
    return '<div class="char' + (small ? ' small' : '') + '">' +
      '<span class="r">' + (small ? 'Dein Charakter · ' + esc(p.fun_name) : 'Dein Charakter für die Abfahrt') + '</span>' +
      '<span class="n">' + esc(c.title || p.fun_name) + '</span>' +
      '<p><b>Superkraft:</b> ' + esc(c.superpower || '') + '</p>' +
      '<p><b>Schwäche:</b> ' + esc(c.weakness || '') + '</p></div>';
  }


  // =====================================================================
  // INFO-SEITEN (ohne Anmeldung nutzbar): Timetable · Events · Lageplan · Regeln
  // =====================================================================
  function exampleNote(on, what){ return on ? '<p class="example-note">BEISPIEL – ' + esc(what) + ' folgt noch</p>' : ''; }

  var eventTime = S.eventTime;

  function viewTimetable(){
    var now = new Date();
    var floors = (C.timetable || []).map(function(fl){
      var list = fl.sets.map(function(it){
        var timed = it.from && it.to, cur = timed && eventTime(it.from) <= now && now < eventTime(it.to), past = timed && eventTime(it.to) <= now;
        return '<li class="slot' + (cur ? ' now' : '') + (past ? ' past' : '') + '"><span class="t' + (timed ? '' : ' all') + '">' + (timed ? esc(it.from) : 'all night') + '</span>' +
          '<span class="d"><b>' + esc(it.artist) + '</b><small>' + (timed ? 'bis ' + esc(it.to) + ' Uhr' : esc(it.note || '')) + '</small>' +
          (cur ? '<span class="chip red">läuft gerade</span>' : '') + '</span></li>';
      }).join('');
      return '<div class="sec"><span>' + esc(fl.floor) + '</span></div><p class="floor-where">' + esc(fl.where) + '</p><ol class="timeline">' + list + '</ol>';
    }).join('');
    render(top() + '<section class="view"><div><span class="eyebrow">Samstag · ' + esc(C.eventDate) + '</span><h1>timetable.</h1></div>' +
      floors +
      '<div class="hint"><span aria-hidden="true">🏆</span><span>Um <b>' + esc(C.revealTime) + ' Uhr</b> werden <b>' + PRIZE_TOTAL + ' Gewinne</b> live auf deinem Handy ausgelost. Mitmachen: unten auf <b>Gewinnspiel</b> tippen.</span></div>' +
      '</section>' + foot());
  }

  // Nächste Events von alfons x (vergangene werden ausgeblendet)
  function viewEvents(){
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var list = (C.events || []).map(function(e){ var d = e.date.split('-'); return Object.assign({ d: new Date(+d[0], +d[1] - 1, +d[2]) }, e); })
      .filter(function(e){ return e.d >= today; }).sort(function(a, b){ return a.d - b.d; });
    function dd(d){ return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
    function wd(d){ return d.toLocaleDateString('de-DE', { weekday: 'long' }); }
    var feat = list.filter(function(e){ return e.featured; }).map(function(e){
      return '<div class="ev-feature">' + (e.badge ? '<span class="chip red">' + esc(e.badge) + '</span>' : '') +
        '<span class="eyebrow">Die nächste</span><div class="big-word">' + esc(e.title.toLowerCase()) + '<span>.</span></div>' +
        '<div class="ev-date">' + esc(dd(e.d)) + '<span>/</span>' + e.d.getFullYear() + ' <small>' + esc(wd(e.d)) + '</small></div>' +
        (e.text ? '<p>' + esc(e.text) + '</p>' : '') + '</div>';
    }).join('');
    var rest = list.filter(function(e){ return !e.featured; }).map(function(e){
      return '<li><span class="ev-day"><b>' + esc(dd(e.d)) + '</b><small>' + esc(wd(e.d).slice(0, 2)) + '</small></span>' +
        '<span><b>' + esc(e.title) + '</b>' + (e.text ? '<small>' + esc(e.text) + '</small>' : '') + '</span></li>';
    }).join('');
    render(top() + '<section class="view"><div><span class="eyebrow">Was als Nächstes kommt</span><h1>events.</h1></div>' +
      (list.length ? feat + (rest ? '<div class="sec"><span>Außerdem im alfons x</span></div><ul class="ev-list">' + rest + '</ul>' : '')
                   : '<p class="lede">Neue Termine folgen bald.</p>') +
      '<a class="route-card" href="https://www.instagram.com/' + encodeURIComponent(C.instagram) + '/" target="_blank" rel="noopener">' +
        '<span class="ri" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg></span>' +
        '<span><b>Folge ' + esc(HANDLE) + '</b><small>' + esc(C.eventsNote || '') + '</small></span><span class="ra" aria-hidden="true">›</span></a>' +
      '</section>' + foot());
  }

  // Lageplan (nach Plan des Inhabers vom 17.10., ins Hochformat gedreht): oben Kiosk & Eingang, darunter DB Halle,
  // Durchgang, Alfons (Bar-Gang links, X Floor + Chill-Area rechts); links durchgehend der Außenbereich. Ca. 20 Einheiten = 1 m.
  var MAP_POINTS = [
    ['Kiosk & Eingang', 'Verzehrkarte holen (EC-/Kreditkarte oder bar) · Garderobe · One Way'],
    ['DB Halle', 'DB Floor (Dancefloor) · Piercing & Tattoo'],
    ['Durchgang', 'Verbindet DB Halle und Alfons · Ausgang zum Außenbereich'],
    ['Alfons', 'X Floor (Dancefloor) · Chill-Area mit gleicher Musik'],
    ['Bar', 'Getränke mit Verzehrkarte · hier holst du deinen Gewinn ab'],
    ['Bunker', 'Bunker Floor · Treppe runter im Außenbereich'],
    ['Außenbereich', 'Foodtruck (Essen & Getränke) · Außenbar · Rauchen nur hier draußen'],
    ['Toiletten', 'WC innen (Alfons, hinter der Bar) und WC außen']
  ];
  function guardIcon(){ return '<circle cx="0" cy="-11" r="3.6" fill="#FFD23F"/><path d="M0 -7 L0 3 M-5.5 -3 L5.5 -3 M0 3 L-4 11 M0 3 L4 11" stroke="#FFD23F" stroke-width="2.6" stroke-linecap="round" fill="none"/>'; }
  function mapSvg(){
    function guard(x, y){ return '<g transform="translate(' + x + ' ' + y + ')">' + guardIcon() + '</g>'; }
    function pin(n, x, y){ return '<g class="pin"><circle cx="' + x + '" cy="' + y + '" r="13"/><text x="' + x + '" y="' + (y + 5) + '">' + n + '</text></g>'; }
    function rect(cls, x1, y1, x2, y2){ return '<rect class="' + cls + '" x="' + x1 + '" y="' + y1 + '" width="' + (x2 - x1) + '" height="' + (y2 - y1) + '"/>'; }
    function line(cls, x1, y1, x2, y2){ return '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>'; }
    function text(cls, x, y, t){ return '<text class="' + cls + '" x="' + x + '" y="' + y + '">' + t + '</text>'; }
    var stairs = ''; for (var sx = 44; sx <= 104; sx += 12) stairs += line('step', sx, 222, sx, 288);
    return '<svg class="floorplan" viewBox="0 0 460 910" role="img" aria-label="Lageplan: Kiosk und Eingang, DB Halle mit DB Floor und Piercing &amp; Tattoo, Durchgang, Alfons mit X Floor, Chill-Area, Bar und WC. Links der Außenbereich mit Bunker, Foodtruck, Außenbar und WC. Security überall verteilt. 8 nummerierte Bereiche.">' +
      '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="hatch"/></pattern></defs>' +
      // Außenbereich (links, von der DB Halle bis zum Ende vom Alfons)
      rect('outside', 10, 200, 150, 900) +
      // Gebäude
      rect('bld', 150, 20, 250, 200) +          // Kiosk & Eingang
      rect('bld', 150, 200, 450, 400) +         // DB Halle
      rect('bld', 150, 400, 230, 510) +         // Durchgang
      rect('bld', 150, 510, 420, 900) +         // Alfons
      // DB Halle: Piercing & Tattoo | DB Floor (offene Zonentrennung)
      line('sep', 150, 300, 450, 300) + rect('zone dance', 160, 308, 440, 392) +
      // Alfons: Bar-Gang links, rechts X Floor und Chill-Area
      line('part', 230, 510, 230, 540) + line('part', 230, 580, 230, 800) + line('part', 230, 840, 230, 900) +
      line('part', 230, 700, 305, 700) + line('part', 345, 700, 420, 700) +
      rect('zone dance', 240, 520, 410, 690) +
      rect('zone strong', 162, 592, 218, 772) +  // Bar
      rect('zone', 160, 830, 220, 890) +         // WC innen
      // Außenbereich: Bunker (Treppe runter), Foodtruck, Außenbar, WC außen
      rect('zone', 30, 215, 120, 295) + stairs + line('arrow', 104, 255, 46, 255) + '<path class="arrowhead" d="M34 255 L48 247 L48 263 Z"/>' +
      rect('zone', 30, 385, 120, 455) +
      rect('zone strong', 35, 690, 115, 790) +
      rect('zone', 40, 825, 110, 885) +
      // Türen / Durchgänge
      line('door', 150, 70, 150, 150) +         // Eingang (4 m)
      line('door', 160, 200, 230, 200) +        // Kiosk → DB Halle
      line('door', 160, 400, 220, 400) +        // DB Halle → Durchgang
      line('door', 160, 510, 220, 510) +        // Durchgang → Alfons
      line('door', 150, 425, 150, 485) +        // Durchgang → Außenbereich
      line('door', 230, 540, 230, 580) + line('door', 230, 800, 230, 840) + line('door', 305, 700, 345, 700) +
      // Eingangspfeil von der Straße
      line('arrow', 40, 110, 126, 110) + '<path class="arrowhead" d="M140 110 L126 102 L126 118 Z"/>' +
      text('lbl', 84, 92, 'Eingang') + text('lbl tiny', 84, 136, '4 m breit') + text('lbl eyebrow', 76, 192, 'ONE WAY') +
      // Beschriftungen
      text('lbl', 200, 96, 'Kiosk') + text('lbl tiny', 200, 116, 'Garderobe') + text('lbl tiny', 200, 134, 'Verzehrkarte') +
      text('lbl eyebrow', 340, 228, 'DB HALLE') + text('lbl', 300, 262, 'Piercing &amp; Tattoo') +
      text('lbl big', 300, 352, 'DB Floor') + text('lbl tiny', 300, 374, 'Dancefloor') +
      text('lbl start', 242, 448, 'Durchgang') + text('lbl tiny start', 242, 468, 'Ausgang Außenbereich') +
      text('lbl eyebrow', 325, 548, 'ALFONS') + text('lbl big', 325, 604, 'X Floor') + text('lbl tiny', 325, 626, 'Dancefloor · DJ') +
      text('lbl', 325, 790, 'Chill-Area') + text('lbl tiny', 325, 810, 'gleiche Musik') +
      text('lbl small', 190, 686, 'Bar') + text('lbl small', 190, 865, 'WC') +
      text('lbl', 75, 320, 'Bunker') + text('lbl tiny', 75, 337, 'Treppe runter') +
      text('lbl small', 75, 413, 'Foodtruck') + text('lbl tiny', 75, 430, 'Essen &amp;') + text('lbl tiny', 75, 445, 'Getränke') +
      text('lbl', 75, 560, 'Außen-') + text('lbl', 75, 580, 'bereich') + text('lbl tiny', 75, 600, 'Rauchen hier') +
      text('lbl small', 75, 744, 'Außenbar') + text('lbl small', 75, 860, 'WC') +
      // Security
      guard(132, 62) + guard(132, 168) + guard(250, 226) + guard(420, 336) + guard(202, 540) + guard(395, 660) + guard(395, 862) +
      guard(132, 262) + guard(122, 505) + guard(132, 650) +
      // Nummern (Legende)
      pin(1, 232, 40) + pin(2, 428, 222) + pin(3, 190, 455) + pin(4, 400, 540) + pin(5, 190, 620) + pin(6, 24, 214) + pin(7, 75, 527) + pin(8, 132, 870) +
      '</svg>';
  }
  function viewMap(){
    var img = C.mapImage ? '<img class="map-img" src="' + esc(C.mapImage) + '" alt="Lageplan alfons x">' : mapSvg();
    var legend = MAP_POINTS.map(function(p, i){ return '<li><span class="num">' + (i + 1) + '</span><span><b>' + esc(p[0]) + '</b>' + (p[1] ? '<small>' + esc(p[1]) + '</small>' : '') + '</span></li>'; }).join('');
    var route = '<a class="route-card" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(C.address) + '" target="_blank" rel="noopener">' +
      '<span class="ri" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg></span>' +
      '<span><b>Route planen</b><small>Weg zum alfons x in Google Maps</small></span><span class="ra" aria-hidden="true">›</span></a>';
    function info(sym, html){ return '<li><span class="sym" aria-hidden="true">' + sym + '</span><span>' + html + '</span></li>'; }
    render(top() + '<section class="view">' + route + '<div><span class="eyebrow">Wo ist was?</span><h1>lageplan.</h1></div>' +
      exampleNote(C.mapIsExample, 'der echte Lageplan') +
      '<ul class="good-to-know">' +
        info('💳', '<b>Verzehrkarte für Getränke.</b> ' + esc(C.kioskInfo)) +
        info('🛡️', '<b>Security ist überall.</b> Bei einem Problem sprich einfach die nächste an – du musst nicht zum Eingang.') +
        info('↺', '<b>One Way:</b> Einmal raus = neuer Eintritt. Kein Wiedereinlass.') +
      '</ul>' +
      '<div class="map-wrap">' + img + '</div>' +
      '<p class="muted guard-note"><svg viewBox="-8 -16 16 30" aria-hidden="true">' + guardIcon() + '</svg><span><b style="color:#FFD23F">Gelbe Figuren</b> = Security. Dort bekommst du Hilfe.</span></p>' +
      '<p class="muted guard-note"><svg viewBox="0 0 16 30" aria-hidden="true"><line x1="8" y1="2" x2="8" y2="28" stroke="var(--ok)" stroke-width="5"/></svg><span><b style="color:var(--ok)">Grüne Striche</b> = Durchgang bzw. Tür. Schematischer Plan, Maße gerundet.</span></p>' +
      '<ol class="legend">' + legend + '</ol>' +
      '</section>' + foot());
  }

  function viewRules(){
    function li(sym, txt){ return '<li><span class="sym" aria-hidden="true">' + sym + '</span><span>' + txt + '</span></li>'; }
    render(top() + '<section class="view">' +
      '<div><span class="eyebrow">Damit alle feiern können</span><h1><span class="red">x</span> rules.</h1></div>' +
      '<div class="rules no"><h2>no go’s</h2><ul>' +
        li('✕', '<b>Nein heißt nein.</b> Immer.') +
        li('✕', '<b>Rauchen im Club.</b> Rauchen nur draußen.') +
        li('✕', '<b>Null Toleranz</b> für Rassismus, Sexismus und Gewalt.') +
      '</ul></div>' +
      '<div class="rules yes"><h2>das geht immer</h2><ul>' +
        li('✓', '<b>Vapes</b> sind okay.') +
        li('✓', '<b>Feiern, tanzen, Spaß haben!</b>') +
        li('✓', '<b>Fotos machen – und ' + esc(HANDLE) + ' verlinken!</b>') +
      '</ul></div>' +
      '<div class="help" role="note"><span class="eyebrow">Du fühlst dich belästigt oder unwohl?</span>' +
        '<b>Sag sofort Bescheid.</b><p>' + esc(C.helpWhere) + '. Wir kümmern uns – ohne Diskussion.</p></div>' +
      '<div class="zero"><span class="z">zero</span><span class="zt">tolerance</span>' +
        '<p>Bei sexueller Belästigung, Rassismus oder Aggression gibt es <b>Hausverbot</b> oder einen <b>Clubverweis</b>.</p>' +
        '<p class="en">We do not tolerate any form of sexual harassment, racism or aggression.</p></div>' +
      '<p class="sign">euer alfons x Team</p>' +
      '</section>' + foot());
  }

  // ---------- Navigation (Tab-Leiste unten) ----------
  var TABS = ['mission', 'timetable', 'events', 'plan', 'regeln'];
  var ready = false;
  function currentTab(){ var t = location.hash.replace('#', ''); return TABS.indexOf(t) >= 0 ? t : 'mission'; }
  function setTab(t){
    document.querySelectorAll('#tabbar a').forEach(function(a){
      if (a.dataset.tab === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function onRoute(){
    var t = currentTab(); setTab(t);
    if (t === 'timetable') return viewTimetable();
    if (t === 'events') return viewEvents();
    if (t === 'plan') return viewMap();
    if (t === 'regeln') return viewRules();
    if (!ready) return boot();
    if (me && me.status !== 'won' && history.state && CH[history.state.ch]) return viewChallenge(history.state.ch);
    route();
  }
  var routeQueued = false;
  function queueRoute(){ if (routeQueued) return; routeQueued = true; setTimeout(function(){ routeQueued = false; onRoute(); }, 0); }
  window.addEventListener('hashchange', queueRoute);
  window.addEventListener('popstate', queueRoute);   // Zurück-Geste / Zurück-Taste des Handys
  function goBack(){ if (history.state && history.state.ch) history.back(); else viewDashboard(); }
  document.querySelectorAll('#tabbar a').forEach(function(a){
    a.addEventListener('click', function(ev){
      if (('#' + a.dataset.tab) !== (location.hash || '#mission')) return;   // anderer Tab: normaler Hash-Wechsel
      ev.preventDefault();
      if (a.dataset.tab === 'mission' && history.state && history.state.ch) history.back(); else queueRoute();
    });
  });

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

  var inited = null;
  function initOnce(){ return inited || (inited = S.init().catch(function(e){ inited = null; throw e; })); }
  async function boot(){
    render(top() + '<div class="spin" role="status" aria-label="Lädt"></div>');
    try{
      await initOnce();
      me = await S.me();
      await flushPending();
    }catch(e){
      render(top() + '<div class="view"><h2>keine verbindung.</h2><p class="lede">' + esc(e.message) + '</p><button class="btn red" id="retry">Nochmal versuchen</button></div>');
      $('#retry').onclick = boot; return;
    }
    ready = true;
    if (currentTab() === 'mission') route();
  }
  function route(){
    if (!me) return viewRegister();
    if (isWinner(me)) return viewWin();
    var s = takeStation();
    if (s) return viewChallenge(s);
    viewDashboard();
  }

  // ---------- Anmeldung ----------
  async function viewRegister(){
    render(top() + ticker() +
      '<section class="view">' +
        '<div class="hero"><span class="eyebrow">Dein Ticket für die</span><div class="big-word">abfahrt<span>.</span></div>' +
        '<div class="sub">' + esc(C.eventDate.split('.')[0]) + '<span>/</span>' + esc(C.eventDate.split('.')[1]) + ' · alfons x</div></div>' +
        rulesCard() +
        '<form id="reg" class="reg-card" novalidate>' +
          '<div><span class="eyebrow">Mitmachen &amp; gewinnen</span><h1 class="reg-title">ticket lösen.</h1></div>' +
          '<div class="field"><label for="ig">Dein Instagram</label><div class="input-at"><span>@</span><input class="input" id="ig" name="ig" maxlength="30" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="deinname" required value="' + esc(prefill) + '"></div><small>Damit finden wir bei der Ziehung deine Story.</small></div>' +
          '<label class="check" for="ok"><input type="checkbox" id="ok" required><span>Ich akzeptiere die <a href="teilnahmebedingungen.html" target="_blank" rel="noopener">Teilnahmebedingungen</a>.</span></label>' +
          '<p class="name-hint"><span aria-hidden="true">🎲</span><span>Deinen <b>Spaßnamen</b> ziehst du gleich per Los – unter diesem Namen erscheinst du bei der Live-Auslosung.</span></p>' +
          errorBox('reg-err') +
          '<button class="btn red" id="reg-btn" type="submit">🎲 Spaßnamen ziehen</button>' +
          '<div class="counter" id="counter" hidden><span class="n" id="count">0</span><span>sind schon dabei</span></div>' +
        '</form>' +
        drawCard() +
        vibesBox() +
        '<div class="sec"><span>Das kannst du gewinnen</span></div>' +
        prizeGrid() +
        '<div class="sec"><span>So läuft’s</span></div>' +
        '<ol class="steps"><li><b>Anmelden</b><span>Instagram eintragen, Spaßnamen ziehen – dauert 20 Sekunden.</span></li>' +
        '<li><b>2 Challenges machen</b><span>Foto als Story &amp; Vibe-Check – alles hier in der App.</span></li>' +
        '<li><b>Um ' + esc(C.revealTime) + ' Uhr gewinnen</b><span>Live-Auslosung auf deinem Handy. Gewinne holst du an der Bar ab.</span></li></ol>' +
        '<p class="fineprint">Wir speichern nur Spaßname, Instagram-Name und deine erledigten Challenges. Fotos bleiben auf deinem Handy. Dein Vibe wird nicht öffentlich angezeigt; dein Spaßname nur, falls du gewinnst. Mehr im <a href="datenschutz.html">Datenschutzhinweis</a>.</p>' +
      '</section>' + foot());
    startVibes(); refreshStats(); vibeTimer = setInterval(refreshStats, 60000);
    $('#reg').addEventListener('submit', async function(ev){
      ev.preventDefault();
      var btn = $('#reg-btn'), err = $('#reg-err'); err.hidden = true;
      if (!$('#ok').checked) return showError('reg-err', 'Bitte bestätige die Teilnahmebedingungen.');
      busy(btn, true, 'Wird gezogen …');
      try{
        me = await S.register({ ig_handle: $('#ig').value });
        try{ sessionStorage.removeItem('ab_u'); }catch(e){}
        viewCharacter(true);
      }catch(e){ showError('reg-err', e.message); busy(btn, false, '🎲 Spaßnamen ziehen'); }
    });
  }

  // Nach der Anmeldung: Spaßname wird „ausgelost“ (Namen rattern durch, werden langsamer, rasten ein)
  function viewCharacter(roll){
    var next = peekStation();
    render(top() + '<section class="view">' +
      '<span class="eyebrow">Ticket gelöst ✓</span>' +
      '<div class="name-roll" id="roll"><small>Dein Spaßname für heute Nacht</small><b id="roll-name">' + esc(me.fun_name) + '</b></div>' +
      '<div id="after" class="after-roll"' + (roll ? ' hidden' : '') + '><h1>du bist dabei.</h1><p class="lede">Unter diesem Namen erscheinst du heute Nacht bei der Live-Auslosung.</p>' +
      '<button class="btn red" id="go">' + (next ? 'Weiter zur Challenge' : 'Zu deinen Challenges') + '</button></div>' +
      '</section>' + foot());
    $('#go').onclick = route;
    if (!roll) return;
    var names = window.ABFAHRT_NAMES || [], el = $('#roll-name'), box = $('#roll'), delay = 55;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.classList.add('rolling');
    (function step(){
      if (!$('#roll')) return;
      if (delay > 320 || reduce || !names.length){
        el.textContent = me.fun_name; box.classList.remove('rolling'); box.classList.add('locked');
        try{ navigator.vibrate && navigator.vibrate(120); }catch(e){}
        $('#after').hidden = false; return;
      }
      el.textContent = names[Math.floor(Math.random() * names.length)];
      delay = Math.round(delay * 1.09);
      setTimeout(step, delay);
    })();
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
    var pot = n === TOTAL
      ? '<div class="pot in"><b>du bist im lostopf.</b><p>Um ' + esc(C.revealTime) + ' Uhr werden ' + PRIZE_TOTAL + ' Gewinne live hier auf deinem Handy ausgelost – lass die Seite offen.</p></div>'
      : '<div class="pot"><b>noch ' + (TOTAL - n) + ' bis zum lostopf.</b><p>Tippe oben auf eine Challenge und leg los.</p></div>';
    render(top() + ticker() + '<section class="view">' + rulesCard() + charCard(me, true) +
      '<div class="sec"><span>Deine Challenges</span></div>' +
      '<div><div class="progress-head"><span class="eyebrow">Fortschritt</span><span class="n">' + n + '<span>/' + TOTAL + '</span></span></div>' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + TOTAL + '" aria-valuenow="' + n + '"><i style="width:' + (n / TOTAL * 100) + '%"></i></div></div>' +
      (n < TOTAL ? '<p class="howto">👇 <b>Tippe auf eine Challenge.</b> Foto als Story mit ' + esc(HANDLE) + ' + Vibe-Check – beide erledigt = du bist im Lostopf.</p>' : '') +
      '<ul class="tasks" style="list-style:none;margin:0;padding:0">' + tasks + '</ul>' + pot + drawCard() +
      '<div class="sec"><span>Live im Club</span></div>' + vibesBox() +
      '<div class="counter" id="counter" hidden><span class="n" id="count">0</span><span>sind heute dabei</span></div>' +
      (isWinner(me) ? '' :
        '<div class="reset fineprint-zone"><button class="linkbtn" id="reset">Daten löschen &amp; neu anmelden</button>' +
        '<div class="confirm" id="reset-box" hidden><b>wirklich löschen?</b><p>Dein Spaßname, Charakter, Instagram-Name und alle erledigten Challenges werden <b>komplett gelöscht</b>. Danach kannst du dich neu anmelden.</p>' +
        errorBox('reset-err') + '<div class="btn-row"><button class="btn danger" id="reset-yes">Ja, alles löschen</button><button class="btn ghost" id="reset-no">Abbrechen</button></div></div></div>') +
      '</section>' + foot());
    wireReset();
    root.querySelectorAll('button.task').forEach(function(b){ b.addEventListener('click', function(){ viewChallenge(b.dataset.k); }); });
    startVibes(); refreshStats();
    pollTimer = setInterval(async function(){
      try{
        var fresh = await S.me(); if (!fresh) return;
        var changed = fresh.status !== me.status || doneCount(fresh) !== doneCount(me);
        me = fresh;
        if (isWinner(me)) return viewWin();
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
  // Live-Vibes: feste Auswahl aus config.js (echte Vibes der Gäste werden nicht öffentlich gezeigt), läuft automatisch alle 4 s weiter
  var vibeAuto = null;
  function vibesBox(){
    if (!(C.vibes || []).length) return '';
    return '<div class="vibes" id="vibes"><div class="vibes-head"><span class="eyebrow">Live-Vibes</span><span class="vibes-avg" id="v-avg"></span></div>' +
      '<div class="vibes-strip" id="v-strip" aria-live="off"></div></div>';
  }
  function startVibes(){
    var strip = $('#v-strip'); if (!strip) return;
    var list = C.vibes.slice().sort(function(){ return Math.random() - .5; });
    strip.innerHTML = list.map(function(v){
      return '<div class="vb"><span class="vs">' + '★'.repeat(v.stars) + '<i>' + '★'.repeat(5 - v.stars) + '</i></span><p>„' + esc(v.text) + '“</p><small>— ' + esc(v.name) + '</small></div>';
    }).join('');
    clearInterval(vibeAuto);
    var paused = 0;
    strip.onpointerdown = function(){ paused = Date.now(); };
    vibeAuto = setInterval(function(){
      var el = $('#v-strip'); if (!el){ clearInterval(vibeAuto); return; }
      if (Date.now() - paused < 8000) return;
      var w = el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : 200;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: w, behavior: 'smooth' });
    }, 4000);
  }
  async function refreshStats(){
    try{
      var st = await S.stats(); if (!st) return;
      if (st.players > 0 && $('#count')){ $('#count').textContent = st.players.toLocaleString('de-DE'); $('#counter').hidden = false; }
      if (st.vibe_count && $('#v-avg')) $('#v-avg').innerHTML = esc(Number(st.vibe_avg).toFixed(1).replace('.', ',')) + '<em>★</em> · ' + st.vibe_count;
    }catch(e){}
  }

  // ---------- Challenges ----------
  function viewChallenge(key){
    var ch = CH[key], done = !!me[key + '_at'];
    if (!(history.state && history.state.ch === key)) history.pushState({ ch: key }, '', location.hash || '#mission');
    var head = '<button type="button" class="backbtn" id="back"><span aria-hidden="true">‹</span> Zurück zum Gewinnspiel</button>' +
      '<div class="chal-head"><span class="chip red">Challenge ' + ch.n + '</span><h1>' + esc(ch.title) + '</h1><p class="task-text">' + esc(ch.task) + '</p></div>' +
      '<div class="done-box" id="done-box"' + (done ? '' : ' hidden') + '><b>erledigt ✓</b><span class="status">Die Challenge ist abgehakt. Du kannst sie trotzdem nochmal machen.</span></div>';
    render(top() + '<section class="view">' + head + (key === 'vibe' ? vibeTools() : photoTools(key)) +
      '<button class="btn ghost" id="to-dash">‹ Zurück zum Gewinnspiel</button></section>' + foot());
    $('#to-dash').onclick = goBack;
    $('#back').onclick = goBack;
    if (key === 'vibe') wireVibe(); else wirePhoto(key);
  }
  async function markDone(key){
    var l = pendingList(); if (l.indexOf(key) < 0){ l.push(key); setPending(l); }
    me = await S.complete(key) || me;
    setPending(pendingList().filter(function(k){ return k !== key; }));
    var box = $('#done-box'); if (box){ box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    var n = doneCount(me);
    if (n === TOTAL && box) box.querySelector('.status').textContent = 'Beide geschafft – du bist im Lostopf! Live-Auslosung um ' + C.revealTime + ' Uhr auf deinem Handy.';
  }

  function photoTools(key){
    return '<ol class="steps compact"><li><b>Foto machen</b><span>Selfie oder mit deiner Crew – der Rahmen kommt automatisch drauf.</span></li>' +
      '<li><b>„In Story teilen“ drücken</b><span>Dann Instagram → Story wählen.</span></li>' +
      '<li><b>' + esc(HANDLE) + ' markieren & posten</b><span>@-Sticker → „alfonsx“ tippen → Account in der Liste antippen → aufs Feld schieben.</span></li></ol>' +
      '<label class="btn red" for="cam" id="cam-label">Foto aufnehmen</label>' +
      '<input id="cam" type="file" accept="image/*" capture="user" hidden>' +
      '<img class="preview" id="preview" alt="Dein Foto mit Abfahrt-Rahmen" hidden>' +
      '<div class="hint" id="tag-hint" hidden><span aria-hidden="true">👉</span><span>So markierst du richtig: In Instagram den Sticker <b>„@ Erwähnung“</b> wählen, <b>alfonsx</b> tippen und in der Liste auf <b>' + esc(HANDLE) + '</b> tippen. Dann auf das Feld <b>„hier alfons x markieren“</b> oben im Bild schieben.</span></div>' +
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
      if (r === 'shared' || r === 'aborted') $('#status').innerHTML = 'Challenge abgehakt ✓ Jetzt in Instagram: Erwähnung <b>' + esc(HANDLE) + '</b> auf das Feld „hier alfons x markieren“ oben im Bild setzen und als <b>Story</b> posten – ohne echte Markierung zählt sie bei der Auslosung nicht.';
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
      '<p class="status" id="status" aria-live="polite">Kein Posten nötig. Dein Vibe wird nicht öffentlich angezeigt – vielleicht landet er (ohne deinen Namen) in einem Post von ' + esc(HANDLE) + '.</p>';
  }
  function wireVibe(){
    var stars = 0, btns = root.querySelectorAll('.stars button');
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
        if (doneCount(me) === TOTAL) $('#done-box .status').textContent = 'Beide geschafft – du bist im Lostopf! Live-Auslosung um ' + C.revealTime + ' Uhr auf deinem Handy.';
        $('#status').textContent = 'Abgeschickt ✓ Danke für deinen Vibe!';
      }catch(e){ showError('ch-err', e.message); busy(btn, false, 'Vibe abschicken'); }
    });
  }

  // ---------- Gewonnen ----------
  function viewWin(){
    render(top() + '<section class="view"><div class="win" role="status">' +
      '<span class="eyebrow" style="color:rgba(243,234,230,.8)">Abfahrt · ' + esc(C.eventDate.slice(0, 5).replace('.', '/')) + '</span>' +
      '<span class="n">gewonnen.</span>' +
      (prize(me.prize) ? '<div class="win-prize"><span aria-hidden="true">' + esc(prize(me.prize).icon) + '</span><b>' + esc(prize(me.prize).title) + '</b><small>' + esc(prize(me.prize).sub) + '</small></div>' : '') +
      '<p class="win-go"><b>Komm jetzt zur Bar</b> und hol deinen Gewinn ab. Zeig dort diesen Screen.</p>' +
      '<span class="live-code" id="code">' + esc(me.win_code || '') + '</span>' +
      '<p class="muted" style="color:rgba(243,234,230,.75)">' + esc(me.fun_name) + ' · @' + esc(me.ig_handle) + '</p>' +
      '</div>' + (RV && RV.winners ? '<button class="btn ghost" id="replay">Auslosung nochmal ansehen</button>' : '') + '</section>' + foot());
    if ($('#replay')) $('#replay').onclick = function(){ openShow(true); };
    function tick(){ var d = new Date(); var el = $('#code'); if (el) el.textContent = (me.win_code || '') + ' · ' + d.toLocaleTimeString('de-DE'); }
    tick(); clockTimer = setInterval(tick, 1000);
  }

  // =====================================================================
  // LIVE-AUSLOSUNG: Countdown bis revealTime, dann Show auf allen Handys gleichzeitig.
  // Die Gewinner stehen vorher in der Datenbank fest; der Server gibt sie erst ab reveal_at heraus.
  // =====================================================================
  var RV = null, clockOff = 0, showSeen = false, SHOW = null;
  function serverNow(){ return Date.now() + clockOff; }
  function revealAt(){ return RV ? RV.at : eventTime(C.revealTime).getTime(); }
  function revealed(){ return serverNow() >= revealAt(); }
  function prize(key){ return PRIZES.filter(function(x){ return x.key === key; })[0] || null; }
  function isWinner(p){ return !!(p && p.prize && (p.status === 'won' || p.status === 'drawn') && revealed()); }

  async function loadReveal(){
    try{
      await initOnce();
      var r = await S.reveal(); if (!r) return;
      clockOff = new Date(r.now).getTime() - Date.now();
      RV = { at: new Date(r.reveal_at).getTime(), names: r.names || [], winners: r.winners };
    }catch(e){}
  }
  function fmtLeft(ms){
    var t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
    return (h ? h + ' h ' : '') + (h || m ? m + ' min ' : '') + sec + ' s';
  }
  function drawCard(){
    if (RV && RV.winners) return '<div class="draw-card done"><span class="eyebrow">Live-Auslosung</span><b>die gewinner stehen fest.</b>' +
      '<button class="btn red" type="button" data-show>Auslosung ansehen</button></div>';
    return '<div class="draw-card" data-drawcard><span class="eyebrow">Live-Auslosung · ' + esc(C.revealTime) + ' Uhr</span>' +
      '<span class="draw-cd" data-cd>' + esc(cdText()) + '</span>' +
      '<p>werden die ' + PRIZE_TOTAL + ' Gewinner ausgelost – <b>schau auf dein Handy!</b> Lass diese Seite einfach offen.</p></div>';
  }
  function cdText(){
    var ms = revealAt() - serverNow();
    if (ms > 24 * 3600e3) return 'Nacht auf ' + new Date(revealAt()).toLocaleDateString('de-DE', { weekday: 'long' });
    return 'in ' + fmtLeft(ms);
  }
  document.addEventListener('click', function(ev){ if (ev.target.closest && ev.target.closest('[data-show]')) openShow(true); });

  // Sekunden-Takt (läuft auf allen Tabs)
  var fetching = false;
  setInterval(async function(){
    document.querySelectorAll('[data-cd]').forEach(function(el){ el.textContent = cdText(); });
    if (!revealed() || (RV && RV.winners) || fetching) return;
    fetching = true; await loadReveal(); fetching = false;           // ab revealTime: Gewinner holen
    if (RV && RV.winners){
      if (!showSeen && serverNow() - RV.at < showLength() * 1000) openShow(false);
      if (currentTab() === 'mission' && ready && !(history.state && history.state.ch)){ try{ me = await S.me(); }catch(e){} route(); }
    }
  }, 1000);
  setInterval(function(){ if (!revealed()) loadReveal(); }, 300000);  // Uhr/Startzeit gelegentlich abgleichen

  // ---------- Show ----------
  function rounds(){
    var order = (C.revealOrder || PRIZES.map(function(x){ return x.key; })).filter(prize);
    var list = order.map(function(key){
      return { key: key, p: prize(key), names: (RV.winners || []).filter(function(w){ return w.prize === key; }).map(function(w){ return w.fun_name; }) };
    }).filter(function(r){ return r.names.length; });
    list.forEach(function(r, i){
      r.final = i === list.length - 1 && list.length > 1;
      r.intro = r.final ? 4 : 3; r.cd = r.final ? 10 : 5; r.gap = r.final ? 1.3 : .45; r.hold = r.final ? 8 : 4.5;
      r.len = r.intro + r.cd + r.gap * (r.names.length - 1) + .8 + r.hold;
    });
    return list;
  }
  function showLength(){ return rounds().reduce(function(s, r){ return s + r.len; }, 0); }

  function openShow(replay){
    if (!RV || !RV.winners) return;
    showSeen = true; closeShow();
    var rs = rounds(); if (!rs.length) return;
    var el = document.createElement('div');
    el.className = 'show'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Live-Auslosung');
    document.body.appendChild(el); document.body.classList.add('show-open');
    SHOW = { el: el, rounds: rs, start: replay ? serverNow() : RV.at, cur: -1, phase: '', spinAt: 0, locked: -1, raf: 0 };
    frame();
  }
  function closeShow(){
    if (!SHOW) return;
    cancelAnimationFrame(SHOW.raf); SHOW.el.remove(); SHOW = null; document.body.classList.remove('show-open');
  }
  function myName(){ return me && me.fun_name; }
  function showHead(label){
    return '<div class="show-top"><span class="eyebrow">● live-auslosung · ' + esc(label) + '</span><button type="button" class="show-x" aria-label="Schließen">×</button></div>';
  }
  function frame(){
    if (!SHOW) return;
    var t = (serverNow() - SHOW.start) / 1000, acc = 0, i = 0, rs = SHOW.rounds;
    while (i < rs.length && t >= acc + rs[i].len){ acc += rs[i].len; i++; }
    if (i >= rs.length) return showSummary();
    var r = rs[i], lt = Math.max(0, t - acc);
    if (SHOW.cur !== i) buildRound(i);
    var phase = lt < r.intro ? 'intro' : (lt < r.intro + r.cd ? 'spin' : 'lock');
    if (phase !== SHOW.phase){ SHOW.phase = phase; SHOW.el.dataset.phase = phase; }
    var slots = SHOW.el.querySelectorAll('.show-slot');
    if (phase === 'spin' || phase === 'lock'){
      var left = r.intro + r.cd - lt, lockN = phase === 'lock' ? Math.min(r.names.length, Math.floor((lt - r.intro - r.cd) / r.gap) + 1) : 0;
      var cd = SHOW.el.querySelector('.show-cd');
      var cdTxt = phase === 'spin' ? String(Math.ceil(left)) : '🎉';
      if (cd.textContent !== cdTxt){ cd.textContent = cdTxt; cd.classList.remove('tick'); void cd.offsetWidth; cd.classList.add('tick'); }
      var fast = Date.now() - SHOW.spinAt > 70;
      if (fast) SHOW.spinAt = Date.now();
      slots.forEach(function(sl, k){
        if (k < lockN){
          if (!sl.classList.contains('locked')){
            sl.classList.add('locked'); sl.querySelector('b').textContent = r.names[k];
            if (r.names[k] === myName()){ sl.classList.add('me'); try{ navigator.vibrate && navigator.vibrate([200, 100, 400]); }catch(e){} }
          }
        } else if (fast){
          sl.querySelector('b').textContent = RV.names.length ? RV.names[Math.floor(Math.random() * RV.names.length)] : '???';
        }
      });
      if (lockN === r.names.length && SHOW.locked !== i){
        SHOW.locked = i;
        SHOW.el.querySelector('.show-sr').textContent = r.p.title + ': ' + r.names.join(', ');
      }
    }
    SHOW.raf = requestAnimationFrame(frame);
  }
  function buildRound(i){
    var r = SHOW.rounds[i], n = SHOW.rounds.length;
    SHOW.cur = i; SHOW.phase = '';
    SHOW.el.className = 'show' + (r.final ? ' final' : '');
    SHOW.el.innerHTML = showHead(r.final ? 'das finale' : 'runde ' + (i + 1) + ' / ' + n) +
      '<div class="show-intro"><span class="show-round">' + (r.final ? 'das finale.' : 'runde ' + (i + 1) + '.') + '</span>' +
        '<span class="show-icon" aria-hidden="true">' + esc(r.p.icon) + '</span><b>' + r.names.length + '× ' + esc(r.p.title) + '</b><small>' + esc(r.p.sub) + '</small></div>' +
      '<div class="show-main"><div class="show-prize"><span aria-hidden="true">' + esc(r.p.icon) + '</span> ' + r.names.length + '× ' + esc(r.p.title) + '</div>' +
        '<div class="show-cd" aria-hidden="true"></div>' +
        '<ol class="show-slots">' + r.names.map(function(){ return '<li class="show-slot"><b>&nbsp;</b></li>'; }).join('') + '</ol></div>' +
      '<p class="show-sr" aria-live="polite" style="position:absolute;left:-9999px"></p>';
    SHOW.el.querySelector('.show-x').onclick = closeShow;
  }
  function showSummary(){
    var mine = myName(), won = null;
    var groups = SHOW.rounds.slice().reverse().map(function(r){
      if (r.names.indexOf(mine) >= 0) won = r.p;
      return '<div class="sum-group"><span class="eyebrow">' + esc(r.p.icon + ' ' + r.p.title + ' ' + r.p.sub) + '</span><ul>' +
        r.names.map(function(nm){ return '<li' + (nm === mine ? ' class="me"' : '') + '>' + esc(nm) + (nm === mine ? ' <i>du!</i>' : '') + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    SHOW.el.className = 'show summary';
    SHOW.el.innerHTML = showHead('ergebnis') +
      '<div class="sum"><h2>die gewinner.</h2>' +
      (won ? '<div class="sum-you"><b>du hast gewonnen!</b><span>' + esc(won.icon + ' ' + won.title) + ' – komm jetzt zur Bar und hol deinen Gewinn ab.</span></div>' +
             '<button class="btn red" id="show-win">Zu deinem Gewinn ›</button>' : '') +
      groups +
      '<p class="muted">Gewinne werden an der Bar abgeholt. Danke fürs Mitmachen – feiert weiter!</p>' +
      '<button class="btn ghost" id="show-close">Schließen</button></div>';
    SHOW.el.querySelector('.show-x').onclick = closeShow;
    SHOW.el.querySelector('#show-close').onclick = closeShow;
    var w = SHOW.el.querySelector('#show-win');
    if (w) w.onclick = async function(){ closeShow(); try{ me = await S.me(); }catch(e){} location.hash = '#mission'; queueRoute(); };
  }

  // Testlauf (nur Demo): ?probe=30 → Live-Auslosung startet in 30 Sekunden
  if (S.isDemo && params.has('probe')){
    try{ sessionStorage.setItem('ab_probe', String(Date.now() + 1000 * Math.max(3, +params.get('probe') || 30))); }catch(e){}
    history.replaceState(null, '', location.pathname + location.hash);
  }
  loadReveal().then(function(){ document.querySelectorAll('[data-cd]').forEach(function(el){ el.textContent = cdText(); }); });

  onRoute();
})();
