// Abfahrt · Admin-Ansicht (Ziehung)
(function(){
  var C = window.ABFAHRT_CONFIG, S = window.AbfahrtStore;
  var root = document.getElementById('app');
  var HANDLE = '@' + C.instagram;
  var timer = null;

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function $(s){ return root.querySelector(s); }
  function top(){
    return '<header class="top"><span class="brand"><img src="logo.png" alt=""><b>abfahrt · admin</b></span><span class="date"><b>Auslosen</b> ' + esc(C.drawTime) + ' · <b>Live</b> ' + esc(C.revealTime) + '</span></header>';
  }
  function err(msg){ var e = $('#err'); if (e){ e.textContent = msg; e.hidden = false; } }

  async function boot(){
    root.innerHTML = top() + '<div class="spin" role="status" aria-label="Lädt"></div>';
    var ok = false; try{ ok = await S.adminIsLoggedIn(); }catch(e){}
    ok ? panel() : login();
  }

  function login(){
    root.innerHTML = top() + '<section class="view"><h1>team-login.</h1>' +
      '<form id="f"><div class="field"><label for="em">E-Mail</label><input class="input" id="em" type="email" autocomplete="username" required></div>' +
      '<div class="field"><label for="pw">Passwort</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>' +
      '<p class="error" id="err" role="alert" hidden></p><button class="btn red" id="b">Einloggen</button></form></section>';
    $('#f').addEventListener('submit', async function(ev){
      ev.preventDefault(); var b = $('#b'); b.disabled = true;
      try{ await S.adminLogin($('#em').value, $('#pw').value); if (await S.adminIsLoggedIn()) return panel(); err('Kein Admin-Zugang für dieses Konto.'); }
      catch(e){ err(e.message); }
      b.disabled = false;
    });
  }

  var PRIZES = C.prizes || [];
  var PRIZE_TOTAL = PRIZES.reduce(function(s, p){ return s + p.count; }, 0);
  function prize(key){ return PRIZES.filter(function(x){ return x.key === key; })[0] || { icon: '', title: key }; }
  var revealAt = S.eventTime(C.revealTime).getTime();

  async function panel(){
    clearInterval(timer);
    root.innerHTML = top() + '<section class="view">' +
      '<div class="tiles" id="tiles"></div>' +
      '<p class="muted"><b>Ablauf:</b> Um ' + esc(C.drawTime) + ' Uhr „Jetzt auslosen“ – alle ' + PRIZE_TOTAL + ' Gewinner werden gezogen, die Gäste sehen davon noch nichts. ' +
        'Bis ' + esc(C.revealTime) + ' Uhr jede Story im DM-Postfach von ' + esc(HANDLE) + ' prüfen („… hat dich in der Story erwähnt“). Keine Story → „Neu ziehen“. ' +
        'Um ' + esc(C.revealTime) + ' Uhr startet die Live-Auslosung automatisch auf allen Handys. Gewinner holen ihren Gewinn an der Bar ab – der Code auf ihrem Handy muss mit dem hier übereinstimmen.</p>' +
      '<p class="error" id="err" role="alert" hidden></p>' +
      '<button class="btn red" id="draw">Jetzt auslosen</button>' +
      '<div id="winners"></div>' +
      (S.isDemo ? '' : '<button class="btn ghost" id="out">Ausloggen</button>') +
      '</section>';
    $('#draw').onclick = draw;
    if ($('#out')) $('#out').onclick = async function(){ await S.adminLogout(); login(); };
    $('#winners').addEventListener('click', async function(ev){
      var b = ev.target.closest('button[data-id]'); if (!b) return;
      if (b.dataset.act === 'no' && Date.now() >= revealAt && !confirm('Die Live-Auslosung ist schon gelaufen. Trotzdem neu ziehen?')) return;
      b.disabled = true; $('#err').hidden = true;
      try{ await (b.dataset.act === 'yes' ? S.adminConfirm(b.dataset.id) : S.adminReject(b.dataset.id)); }
      catch(e){ err(e.message); }
      refresh();
    });
    await refresh();
    timer = setInterval(refresh, 15000);
  }

  async function refresh(){
    try{
      var o = await S.adminOverview(), ws = o.winners || [];
      var open = ws.filter(function(w){ return !w.checked; }).length;
      $('#tiles').innerHTML =
        tile(o.eligible, 'Im Lostopf (2/2)', true) + tile(o.total, 'Angemeldet') +
        tile(o.photo, 'Abfahrt-Foto') + tile(o.vibe, 'Vibe-Check') +
        tile(ws.length + ' / ' + PRIZE_TOTAL, 'Gezogen') + tile(open, 'Story noch prüfen', open > 0);
      var full = ws.length >= PRIZE_TOTAL;
      $('#draw').hidden = full;
      $('#draw').textContent = ws.length ? 'Freie Plätze nachziehen (' + (PRIZE_TOTAL - ws.length) + ')' : 'Jetzt auslosen';
      $('#winners').innerHTML = PRIZES.map(function(pr){
        var list = ws.filter(function(w){ return w.prize === pr.key; });
        if (!list.length) return '';
        return '<span class="eyebrow">' + esc(pr.icon + ' ' + pr.title) + ' · ' + list.length + ' / ' + pr.count + '</span>' +
          '<ul class="tasks" style="list-style:none;margin:8px 0 18px;padding:0;display:grid;gap:8px">' + list.map(function(w){
            return '<li class="task' + (w.checked ? ' done' : '') + '"><span class="ic" aria-hidden="true">' + (w.checked ? '✓' : '?') + '</span>' +
              '<span><b>' + esc(w.fun_name) + '</b><small><a href="https://instagram.com/' + encodeURIComponent(w.ig_handle) + '" target="_blank" rel="noopener">@' + esc(w.ig_handle) + '</a> · ' + esc(w.win_code || '') + '</small></span>' +
              (w.checked ? '<span class="st">Story ✓</span>' :
                '<div class="btn-row" style="grid-column:1/-1;grid-template-columns:1fr 1fr"><button class="btn red" data-act="yes" data-id="' + esc(w.id) + '">✓ Story da</button><button class="btn ghost" data-act="no" data-id="' + esc(w.id) + '">↻ Neu ziehen</button></div>') +
              '</li>';
          }).join('') + '</ul>';
      }).join('');
    }catch(e){ err(e.message); }
  }
  function tile(n, label, hl){ return '<div class="tile' + (hl ? ' hl' : '') + '"><span class="n">' + esc(n == null ? '–' : n) + '</span><small>' + esc(label) + '</small></div>'; }

  async function draw(){
    var b = $('#draw'); b.disabled = true; $('#err').hidden = true;
    try{ await S.adminDrawAll(); }
    catch(e){ err(e.message); }
    b.disabled = false; refresh();
  }

  boot();
})();
