// Abfahrt · Admin-Ansicht (Ziehung)
(function(){
  var C = window.ABFAHRT_CONFIG, S = window.AbfahrtStore;
  var root = document.getElementById('app');
  var HANDLE = '@' + C.instagram;
  var current = null, timer = null;

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function $(s){ return root.querySelector(s); }
  function top(){
    return '<header class="top"><span class="brand"><img src="logo.png" alt=""><b>abfahrt · admin</b></span><span class="date"><b>Ziehung</b> ' + esc(C.drawTime) + '</span></header>';
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

  async function panel(){
    clearInterval(timer);
    root.innerHTML = top() + '<section class="view">' +
      '<div class="tiles" id="tiles"></div>' +
      '<p class="error" id="err" role="alert" hidden></p>' +
      '<div id="result"></div>' +
      '<button class="btn red" id="draw">Auslosen</button>' +
      '<div id="winners"></div>' +
      '<p class="muted">Ablauf: Auslosen → im DM-Postfach von ' + esc(HANDLE) + ' nach dem Instagram-Namen suchen („… hat dich in der Story erwähnt“) → „Story gefunden“ oder „Neu ziehen“. Der Gewinner sieht dann „gewonnen.“ mit Live-Code auf seinem Handy – der Code muss mit dem hier übereinstimmen.</p>' +
      (S.isDemo ? '' : '<button class="btn ghost" id="out">Ausloggen</button>') +
      '</section>';
    $('#draw').onclick = draw;
    if ($('#out')) $('#out').onclick = async function(){ await S.adminLogout(); login(); };
    await refresh();
    timer = setInterval(refresh, 15000);
  }

  async function refresh(){
    try{
      var o = await S.adminOverview();
      $('#tiles').innerHTML =
        tile(o.eligible, 'Im Lostopf (2/2)', true) + tile(o.total, 'Angemeldet') +
        tile(o.photo, 'Abfahrt-Foto') + tile(o.vibe, 'Vibe-Check') + tile((o.winners || []).length + ' / ' + (C.prizes || []).reduce(function(s, p){ return s + p.count; }, 0), 'Gewinner');
      if (!current && o.drawn && o.drawn.length) showCandidate(o.drawn[0]);
      $('#winners').innerHTML = (o.winners || []).length
        ? '<span class="eyebrow">Bestätigte Gewinner</span><ul class="tasks" style="list-style:none;margin:10px 0 0;padding:0">' + o.winners.map(function(w){
            return '<li class="task done"><span class="ic" aria-hidden="true">★</span><span><b>' + esc(w.fun_name) + '</b><small>@' + esc(w.ig_handle) + '</small></span><span class="st">' + esc(w.win_code) + '</span></li>';
          }).join('') + '</ul>' : '';
    }catch(e){ err(e.message); }
  }
  function tile(n, label, hl){ return '<div class="tile' + (hl ? ' hl' : '') + '"><span class="n">' + esc(n == null ? '–' : n) + '</span><small>' + esc(label) + '</small></div>'; }

  async function draw(){
    var b = $('#draw'); b.disabled = true; $('#err').hidden = true;
    try{ showCandidate(await S.adminDraw()); }
    catch(e){ err(e.message); }
    b.disabled = false; refresh();
  }

  function showCandidate(p){
    current = p;
    $('#draw').hidden = true;
    $('#result').innerHTML = '<div class="winner-card"><span class="eyebrow" style="color:rgba(243,234,230,.75)">Gezogen</span>' +
      '<span class="n">' + esc(p.fun_name) + '</span>' +
      '<a href="https://instagram.com/' + encodeURIComponent(p.ig_handle) + '" target="_blank" rel="noopener">@' + esc(p.ig_handle) + '</a>' +
      '<p class="status" style="color:rgba(243,234,230,.85)">Story mit ' + esc(HANDLE) + ' im DM-Postfach gefunden?</p></div>' +
      '<div class="btn-row"><button class="btn red" id="yes">✓ Story gefunden</button><button class="btn ghost" id="no">↻ Keine Story – neu ziehen</button></div>';
    $('#yes').onclick = async function(){
      this.disabled = true;
      try{
        var r = await S.adminConfirm(p.id);
        $('#result').innerHTML = '<div class="winner-card"><span class="eyebrow" style="color:rgba(243,234,230,.75)">Gewinner bestätigt</span><span class="n">' + esc(p.fun_name) + '</span>' +
          '<p>Code auf seinem Handy: <b class="live-code" style="font-size:16px;padding:6px 12px">' + esc(r.win_code) + '</b></p><p class="status" style="color:rgba(243,234,230,.85)">DJ kann jetzt „' + esc(p.fun_name) + '“ aufrufen.</p></div>';
        current = null; $('#draw').hidden = false; $('#draw').textContent = 'Weiteren Gewinner auslosen'; refresh();
      }catch(e){ err(e.message); this.disabled = false; }
    };
    $('#no').onclick = async function(){
      this.disabled = true;
      try{ await S.adminReject(p.id); current = null; $('#result').innerHTML = ''; $('#draw').hidden = false; draw(); }
      catch(e){ err(e.message); this.disabled = false; }
    };
  }

  boot();
})();
