// Story-Rahmen (Canvas, komplett im Browser – nichts wird hochgeladen) + Teilen.
(function(){
  var C = window.ABFAHRT_CONFIG;
  var HANDLE = '@' + C.instagram;
  var CH = {
    photo:  { n: 1, name: 'abfahrt-foto', file: 'abfahrt-challenge1-foto.jpg' }
  };
  var W = 1080, H = 1920;
  var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  var logo = new Image(); logo.src = 'logo.png';
  var fontsReady = null;
  function fonts(){
    if (!fontsReady) fontsReady = Promise.all(['800 76px Poppins','700 58px Poppins','600 40px "IBM Plex Mono"','700 78px Figtree','600 44px Figtree']
      .map(function(f){ return document.fonts.load(f).catch(function(){}); }));
    return fontsReady;
  }
  function loadImage(src){ return new Promise(function(res, rej){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = rej; i.src = src; }); }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function frame(ctx, ch){
    var g = ctx.createLinearGradient(0, 0, 0, 460);
    g.addColorStop(0, 'rgba(13,7,6,.88)'); g.addColorStop(1, 'rgba(13,7,6,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 460);
    g = ctx.createLinearGradient(0, H-760, 0, H);
    g.addColorStop(0, 'rgba(126,26,18,0)'); g.addColorStop(.45, 'rgba(74,14,9,.75)'); g.addColorStop(1, 'rgba(13,7,6,.97)');
    ctx.fillStyle = g; ctx.fillRect(0, H-760, W, 760);
    ctx.strokeStyle = '#E5402A'; ctx.lineWidth = 14; ctx.strokeRect(34, 34, W-68, H-68);
    if (logo.complete && logo.naturalWidth){ ctx.save(); rr(ctx, 80, 90, 130, 130, 14); ctx.clip(); ctx.drawImage(logo, 80, 90, 130, 130); ctx.restore(); }
    ctx.fillStyle = '#F3EAE6'; ctx.textBaseline = 'middle';
    ctx.font = '800 76px Poppins, Arial, sans-serif'; ctx.fillText('alfons x', 240, 155);
    var label = ('challenge ' + ch.n + ' · ' + ch.name).toUpperCase();
    ctx.font = '600 40px "IBM Plex Mono", Consolas, monospace';
    var bw = ctx.measureText(label).width + 64;
    ctx.fillStyle = '#E5402A'; rr(ctx, 80, 262, bw, 80, 40); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(label, 112, 303);
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 200px Poppins, Arial, sans-serif';
    ctx.fillStyle = '#F3EAE6'; ctx.fillText('abfahrt', 78, H-300);
    var wA = ctx.measureText('abfahrt').width;
    ctx.fillStyle = '#E5402A'; ctx.fillText('.', 78 + wA, H-300);
    ctx.font = '800 104px Poppins, Arial, sans-serif';
    var x = 86, parts = C.eventDate.split('.').filter(Boolean); // ["24","10","2026"]
    [parts[0], '/', parts[1], '/', parts[2]].forEach(function(p){ ctx.fillStyle = p === '/' ? '#E5402A' : '#F3EAE6'; ctx.fillText(p, x, H-150); x += ctx.measureText(p).width; });
    tagPlaceholder(ctx, 80, 372);   // klein, direkt unter dem Challenge-Badge
  }

  // Platzhalter statt fertigem Handle: hier soll der Gast in Instagram die echte Erwähnung draufsetzen.
  // (Ein ins Bild gedruckter Handle ist KEINE Markierung – deshalb bewusst als leeres Feld gestaltet.)
  function tagPlaceholder(ctx, bx, by){
    var label = 'hier alfons x markieren', bh = 92, r = bh / 2, cr = 28;
    ctx.font = '800 32px Poppins, Arial, sans-serif';
    var bw = 22 + cr * 2 + 18 + ctx.measureText(label).width + 30;
    ctx.save();
    ctx.fillStyle = 'rgba(13,7,6,.6)'; rr(ctx, bx, by, bw, bh, r); ctx.fill();
    ctx.setLineDash([16, 10]); ctx.lineWidth = 5; ctx.strokeStyle = '#FFFFFF'; rr(ctx, bx, by, bw, bh, r); ctx.stroke();
    ctx.restore();
    var cx = bx + 22 + cr, cy = by + bh / 2;
    ctx.fillStyle = '#E5402A'; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 36px Poppins, Arial, sans-serif'; ctx.fillText('@', cx, cy + 2);
    ctx.textAlign = 'left';
    ctx.font = '800 32px Poppins, Arial, sans-serif'; ctx.fillText(label, cx + cr + 18, cy + 2);
    ctx.textBaseline = 'alphabetic';
  }

  async function toFile(name){
    var blob = await new Promise(function(r){ canvas.toBlob(r, 'image/jpeg', .9); });
    return { file: new File([blob], name, { type: 'image/jpeg' }), url: URL.createObjectURL(blob) };
  }

  async function photo(fileInput, key){
    var ch = CH[key]; await fonts();
    var u = URL.createObjectURL(fileInput), img = await loadImage(u);
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0D0706'; ctx.fillRect(0, 0, W, H);
    var s = Math.max(W / img.width, H / img.height), pw = img.width * s, ph = img.height * s;
    ctx.drawImage(img, (W-pw)/2, (H-ph)/2, pw, ph);
    URL.revokeObjectURL(u);
    frame(ctx, ch);
    return toFile(ch.file);
  }

  // Ergebnis: 'shared' | 'aborted' | 'unsupported' | 'blocked'
  async function share(file){
    if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [file] })) return 'unsupported';
    try{ await navigator.share({ files: [file] }); return 'shared'; }
    catch(e){ return e && e.name === 'AbortError' ? 'aborted' : 'blocked'; }
  }

  window.AbfahrtFrame = { photo: photo, share: share, HANDLE: HANDLE };
})();
