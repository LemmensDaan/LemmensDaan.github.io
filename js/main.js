(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Starfield -----------------------------------------------------------
  var canvas = document.getElementById('stars');
  var ctx = canvas.getContext('2d');
  var stars = [], w = 0, h = 0, warp = 0, warpMode = false, scrollY = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), oldW = w, oldH = h;
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (stars.length && w === oldW) { // height-only change (phone address bar): keep the sky, just fill any new strip
      if (h > oldH) {
        for (var k = Math.round(w * (h - oldH) / 4500); k > 0; k--) stars.push({ x: Math.random() * w, y: oldH + Math.random() * (h - oldH), z: Math.random() * 0.9 + 0.1 });
      }
      return;
    }
    var count = Math.round((w * h) / 4500);
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.9 + 0.1 });
    }
  }

  function draw() {
    if (document.documentElement.classList.contains('plain')) { requestAnimationFrame(draw); return; } // plain mode: no sky to paint
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var y = (s.y - scrollY * s.z * 0.25) % h;
      if (y < 0) y += h;
      ctx.globalAlpha = 0.25 + s.z * 0.75;
      ctx.fillStyle = '#e8ecff';
      if (warp > 0.5) {
        ctx.fillRect(s.x, y, 1.2 * s.z, 2 + warp * 40 * s.z);
      } else {
        ctx.fillRect(s.x, y, 1.6 * s.z, 1.6 * s.z);
      }
      if (!reduce) {
        s.y += (0.05 + warp * 14) * s.z;
        if (s.y > h) s.y -= h;
      }
    }
    if (warp > 0) warp = Math.max(0, warp - 0.012);
    if (warpMode && warp < 0.7) warp = 0.7; // warp mode: the stars keep streaking
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (reduce) {
    draw = function () {}; // static sky: draw once below
    ctx.fillStyle = '#e8ecff';
    stars.forEach(function (s) { ctx.globalAlpha = 0.25 + s.z * 0.75; ctx.fillRect(s.x, s.y, 1.6 * s.z, 1.6 * s.z); });
  } else {
    requestAnimationFrame(draw);
  }

  // --- XP bar, level, achievements ----------------------------------------
  var toast = document.getElementById('toast');
  var toastTimer;

  var toastQueue = [], toastBusy = false;
  function notify(msg, icon) {
    toastQueue.push({ icon: icon || '★', msg: msg });
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    var item = toastQueue.shift();
    if (!item) { toastBusy = false; return; }
    toastBusy = true;
    toast.textContent = '';
    var mark = document.createElement('i');
    mark.className = 'toast-icon';
    mark.textContent = item.icon;
    toast.appendChild(mark);
    toast.appendChild(document.createTextNode(item.msg));
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(nextToast, 350);
    }, 2600);
  }

  function onScroll() {
    scrollY = window.scrollY;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Achievements (saved in this browser only) ----------------------------
  var KEY = 'dl-achievements';
  var unlocked = {};
  try { unlocked = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}

  function render() {
    var n = 0, total = 0;
    document.querySelectorAll('.achv-grid li').forEach(function (li) {
      total++;
      var on = !!unlocked[li.getAttribute('data-id')];
      li.classList.toggle('on', on);
      if (on) n++;
      if (li.hasAttribute('data-secret')) {
        li.querySelector('b').textContent = on ? 'Warp speed' : '???';
        li.querySelector('span').textContent = on ? 'Found the secret code. Flip the switch for warp mode.' : 'A secret. Hint: Konami. Tap to open a controller.';
      }
    });
    var padEl = document.getElementById('pad');
    if (padEl && unlocked.konami) padEl.hidden = true;
    var wt = document.getElementById('warp-toggle-wrap');
    if (wt) wt.hidden = !unlocked.konami || reduce; // the switch only exists once the secret is found
    var c = document.getElementById('achv-n');
    if (c) c.textContent = n;
    var t = document.getElementById('achv-total');
    if (t) t.textContent = total;
  }

  function unlock(id) {
    if (unlocked[id]) return;
    unlocked[id] = 1;
    var li = document.querySelector('.achv-grid li[data-id="' + id + '"]');
    var name = li ? li.querySelector('b').textContent : id;
    if (id !== 'konami') notify('Achievement unlocked: ' + name); // the secret one has its own popup
    try { localStorage.setItem(KEY, JSON.stringify(unlocked)); } catch (e) {}
    render();
    var rest = Array.prototype.filter.call(document.querySelectorAll('.achv-grid li'), function (li) {
      return li.getAttribute('data-id') !== 'completionist' && !unlocked[li.getAttribute('data-id')];
    });
    if (!rest.length) unlock('completionist');
    var b = document.getElementById('achv-btn');
    if (b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
  }
  document.addEventListener('unlock', function (e) { unlock(e.detail); });
  render();

  // The 404 page writes to the same store without loading this script, so the last tile can
  // already be filled in by the time we get here: re-check the cascade once on load.
  (function () {
    var rest = Array.prototype.filter.call(document.querySelectorAll('.achv-grid li'), function (li) {
      return li.getAttribute('data-id') !== 'completionist' && !unlocked[li.getAttribute('data-id')];
    });
    if (!rest.length) unlock('completionist');
  })();

  var warpBox = document.getElementById('warp-toggle');
  if (warpBox) {
    try { if (unlocked.konami && localStorage.getItem('dl-warp') === '1') { warpBox.checked = true; warpMode = true; } } catch (e) {}
    warpBox.addEventListener('change', function () {
      warpMode = warpBox.checked;
      try { localStorage.setItem('dl-warp', warpMode ? '1' : '0'); } catch (e) {}
    });
  }

  var btn = document.getElementById('achv-btn');
  var panel = document.getElementById('achv-panel');
  function setPanel(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  var burger = document.getElementById('burger');
  var nav = document.getElementById('hud-nav');
  function setNav(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) setPanel(false);
  }
  burger.addEventListener('click', function (e) { e.stopPropagation(); setNav(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setNav(false); });
  btn.addEventListener('click', function (e) { e.stopPropagation(); if (panel.hidden) setNav(false); setPanel(panel.hidden); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) setNav(false);
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target)) setPanel(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setPanel(false); setNav(false); } });

  // --- Plain mode: strip the game off, leave the CV -------------------------
  // The class is set in the <head> from localStorage, so a returning reader never sees the starfield flash.
  var modeBtn = document.getElementById('mode-btn');
  if (modeBtn) {
    var root = document.documentElement;
    var syncMode = function () {
      var on = root.classList.contains('plain');
      modeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      modeBtn.textContent = on ? 'Full site' : 'Plain CV';
      modeBtn.title = on ? 'Back to the full site' : 'Plain mode: drop the animations and the game, keep the CV';
    };
    syncMode();
    modeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var on = root.classList.toggle('plain');
      try { localStorage.setItem('dl-plain', on ? '1' : '0'); } catch (err) {}
      if (on) { setPanel(false); setNav(false); }
      syncMode();
    });
  }

  var astro = document.getElementById('astro');
  var pokes = 0;
  var driftPos = { x: 0, y: 0 }; // how far he has drifted from his home spot (CSS 'translate', independent of the float animation)

  function astroSize() { // his untilted on-screen size (CSS width times any 'scale')
    return parseFloat(getComputedStyle(astro).width) * (parseFloat(astro.style.scale) || 1);
  }
  function rectsOverlap(a, b, pad) {
    return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
  }

  // pick a spot anywhere on the page (page coordinates), pushed away from where he was poked, clear of forms and buttons
  function driftTarget(ev) {
    var r = astro.getBoundingClientRect();
    var sx = window.pageXOffset, sy = window.pageYOffset;
    var docW = document.documentElement.clientWidth, docH = document.documentElement.scrollHeight;
    var hud = document.querySelector('.hud').getBoundingClientRect();
    var m = 16, w = astroSize(), h = w; // real size: the bounding box grows while he tilts
    var minX = m, maxX = docW - m - w, minY = hud.bottom + sy + m, maxY = docH - m - h;
    if (maxX <= minX || maxY <= minY) return null;
    var curL = r.left + r.width / 2 + sx - w / 2, curT = r.top + r.height / 2 + sy - h / 2; // centre-based, so tilting doesn't matter
    var maxD = Math.max(700, window.innerHeight * 0.9); // one push never goes further than this
    // poked off-centre = pushed the opposite way (taps have coordinates too); a poke near the middle goes anywhere
    var vx = (r.left + w / 2) - ev.clientX, vy = (r.top + h / 2) - ev.clientY, vl = Math.hypot(vx, vy);
    var aimed = (ev.clientX || ev.clientY) && vl > w * 0.12;
    if (aimed) { vx /= vl; vy /= vl; }
    if (docked && ship) { // pushed towards the docked ship (or poked when he is already close to it): glide right onto it
      var sr = ship.getBoundingClientRect();
      // the dock sits in the very corner of the page, so for this one target he may go right up to the page edge
      var tx = Math.min(docW - w, Math.max(0, sr.left + sx + sr.width / 2 - w / 2));
      var ty = Math.min(docH - h, Math.max(minY, sr.top + sy + sr.height / 2 - h / 2));
      var ddx = tx - curL, ddy = ty - curT, dd = Math.hypot(ddx, ddy);
      var near = dd <= 350; // close to the ship, any poke will do
      if (dd > 8 && dd <= maxD * 1.4 && (aimed ? (ddx * vx + ddy * vy) / dd >= (near ? 0 : 0.75) : near)) return { dx: ddx, dy: ddy, h: h, top: ty };
    }
    var best = null, bestScore = aimed ? 0.2 : -2; // aimed: must head at least roughly the way he was pushed
    for (var i = 0; i < 120; i++) {
      var x = Math.min(maxX, Math.max(minX, curL + (Math.random() * 2 - 1) * maxD));
      var y = Math.min(maxY, Math.max(minY, curT + (Math.random() * 2 - 1) * maxD));
      var d = Math.hypot(x - curL, y - curT);
      if (d < 120 || d > maxD) continue; // a real trip, but not across the whole page in one go
      var score = aimed ? ((x - curL) * vx + (y - curT) * vy) / d : Math.random();
      if (score > bestScore) { bestScore = score; best = { dx: x - curL, dy: y - curT, h: h, top: y }; }
    }
    return best; // null when cornered: he just wobbles
  }

  // --- Spaceship: touch it and the astronaut climbs in and flies off; afterwards it cruises through the background ---
  var ship = document.getElementById('ship');
  var docked = true, boardTimer = null;

  function inset(r, f) {
    var dx = r.width * f, dy = r.height * f;
    return { left: r.left + dx, right: r.right - dx, top: r.top + dy, bottom: r.bottom - dy };
  }
  function touchingShip() {
    var r = astro.getBoundingClientRect(), w = astroSize(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var body = { left: cx - w * 0.3, right: cx + w * 0.3, top: cy - w * 0.3, bottom: cy + w * 0.3 }; // his body, not the empty corners
    return docked && ship && rectsOverlap(body, ship.getBoundingClientRect(), -2);
  }

  function board() {
    docked = false;
    clearTimeout(boardTimer);
    var ar = astro.getBoundingClientRect(), sr = ship.getBoundingClientRect();
    var cur = (getComputedStyle(astro).translate || '').split(' ').map(parseFloat);
    var tx = (isNaN(cur[0]) ? 0 : cur[0]) + (sr.left + sr.width / 2) - (ar.left + ar.width / 2);
    var ty = (isNaN(cur[1]) ? 0 : cur[1]) + (sr.top + sr.height / 2) - (ar.top + ar.height / 2);
    astro.style.transition = 'translate .55s ease-in, scale .55s ease-in, opacity .55s ease-in';
    astro.style.translate = tx + 'px ' + ty + 'px';
    astro.style.scale = 0.08;
    astro.style.opacity = 0;
    setTimeout(liftoff, 650);
  }

  function liftoff() {
    astro.style.visibility = 'hidden';
    document.documentElement.classList.add('away');
    document.dispatchEvent(new Event('away'));
    ship.classList.add('thrust');
    var sr = ship.getBoundingClientRect();
    // all the way up past the TOP OF THE PAGE (page coordinates, not just off the top of the screen); a longer trip takes longer
    var dist = sr.bottom + window.pageYOffset + 200;
    var ms = reduce ? 0 : Math.min(7000, 1900 + dist / 2.2);
    if (ship.animate && !reduce) {
      ship.animate([
        { transform: 'translate(0, 0)' },
        { transform: 'translate(0, 6px)', offset: 0.08 },
        { transform: 'translate(-30px, ' + (-dist) + 'px) rotate(-8deg)' }
      ], { duration: ms, easing: 'cubic-bezier(.5, 0, .9, .6)', fill: 'forwards' });
    }
    setTimeout(function () {
      ship.style.visibility = 'hidden';
      unlock('ship');
      if (!reduce) startCruise();
    }, ms);
  }

  var cruiseEl = null, skyEl = null;
  function startCruise() {
    skyEl = document.createElement('div');
    skyEl.className = 'sky';
    skyEl.setAttribute('aria-hidden', 'true');
    cruiseEl = document.createElement('div');
    cruiseEl.className = 'cruise thrust';
    cruiseEl.appendChild(ship.querySelector('svg').cloneNode(true));
    skyEl.appendChild(cruiseEl);
    document.body.insertBefore(skyEl, document.getElementById('stars').nextSibling); // above the stars, behind the page
    setTimeout(fly, 3500);
  }
  // each flight starts just outside the part of the page you are looking at, but then stays where it is in the page:
  // scroll away and you leave the ship behind
  function fly() {
    if (document.hidden) { setTimeout(fly, 5000); return; }
    var W = document.documentElement.clientWidth, H = window.innerHeight, oy = window.pageYOffset, M = 90, sx, sy, ex, ey;
    skyEl.style.height = document.documentElement.scrollHeight + 'px';
    if (Math.random() < 0.65) { // in from one side, out the other
      var ltr = Math.random() < 0.5;
      sx = ltr ? -M : W + M; ex = ltr ? W + M : -M;
      sy = oy + H * (0.1 + Math.random() * 0.8); ey = oy + H * (0.1 + Math.random() * 0.8);
    } else {
      var ttb = Math.random() < 0.5;
      sy = oy + (ttb ? -M : H + M); ey = oy + (ttb ? H + M : -M);
      sx = W * (0.1 + Math.random() * 0.8); ex = W * (0.1 + Math.random() * 0.8);
    }
    var ang = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI + 90; // the sprite points up
    var sc = 0.7 + Math.random() * 0.6, dur = 9000 + Math.random() * 7000;
    function tf(x, y) { return 'translate(' + x + 'px, ' + y + 'px) rotate(' + ang + 'deg) scale(' + sc + ')'; }
    cruiseEl.style.visibility = 'visible';
    cruiseEl.animate([{ transform: tf(sx, sy) }, { transform: tf(ex, ey) }], { duration: dur, easing: 'linear', fill: 'forwards' });
    setTimeout(function () {
      cruiseEl.style.visibility = 'hidden';
      setTimeout(fly, 12000 + Math.random() * 16000);
    }, dur);
  }

  if (astro) {
    astro.addEventListener('click', function (e) {
      unlock('hello');
      var asleep = astro.getAttribute('data-state') === 'sleep';
      if (asleep) {
        // woken up: annoyed for a few seconds, then back to sleep
        astro.setAttribute('data-state', 'annoyed');
        astro.setAttribute('data-annoyed', '1');
        unlock('wake');
        setTimeout(function () {
          astro.removeAttribute('data-annoyed');
          astro.setAttribute('data-state', 'sleep');
        }, 6000);
        if (astro.animate) astro.animate([{ rotate: '0deg' }, { rotate: '-8deg' }, { rotate: '8deg' }, { rotate: '-5deg' }, { rotate: '0deg' }], { duration: 500 });
      } else {
        var t = driftTarget(e);
        if (t) {
          // start from where he actually is right now (he may still be mid-glide from the last click)
          var cur = (getComputedStyle(astro).translate || '').split(' ').map(parseFloat);
          driftPos.x = (isNaN(cur[0]) ? 0 : cur[0]) + t.dx;
          driftPos.y = (isNaN(cur[1]) ? 0 : cur[1]) + t.dy;
          var dist = Math.hypot(t.dx, t.dy), secs = Math.min(3.4, 1.5 + dist / 700);
          astro.style.transition = 'scale .6s ease-in, translate ' + secs + 's cubic-bezier(.22, .8, .3, 1)';
          astro.style.translate = driftPos.x + 'px ' + driftPos.y + 'px';
          clearTimeout(boardTimer);
          boardTimer = setTimeout(function () { if (touchingShip()) board(); }, secs * 1000 + 150);
          if (astro.animate) astro.animate([{ rotate: '0deg' }, { rotate: (t.dx > 0 ? 14 : -14) + 'deg', offset: 0.35 }, { rotate: '0deg' }], { duration: secs * 1000, easing: 'ease-in-out' });
        } else if (astro.animate) { // no room to go anywhere: a little tumble so the click still gets an answer
          astro.animate([{ rotate: '0deg' }, { rotate: '-12deg' }, { rotate: '10deg' }, { rotate: '0deg' }], { duration: 700, easing: 'ease-in-out' });
        }
      }
      if (++pokes === 10) {
        unlock('poke');
        astro.style.scale = 0.15; // zooms away, CSS 'scale' is independent of the float and drift
      }
    });
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return; // height-only change = phone address bar, ignore
      lastW = window.innerWidth;
      driftPos.x = driftPos.y = 0; astro.style.translate = ''; // back home so he can't end up off-screen
    });
  }
  document.querySelectorAll('a[href*="linkedin.com"], a[href*="github.com"]').forEach(function (a) {
    a.addEventListener('click', function () { unlock('networker'); });
  });
  document.querySelectorAll('a[href*="swn-builder.pages.dev"]').forEach(function (a) {
    a.addEventListener('click', function () { unlock('betatester'); });
  });
  setTimeout(function () { unlock('stargazer'); }, 60000);

  // --- d20 on the D&D chip --------------------------------------------------
  var d20 = document.getElementById('d20');
  if (d20) {
    var chip = d20.parentNode, label = d20.textContent, spin, back;
    var roll = function () { return 1 + Math.floor(Math.random() * 20); };
    var settle = function (n) {
      d20.textContent = '\uD83C\uDFB2 ' + n;
      chip.classList.remove('rolling');
      if (n === 20) { chip.classList.add('nat20'); notify('Natural 20. That\'s a critical hit!', '\uD83C\uDFB2'); unlock('nat20'); }
      else if (n === 1) { chip.classList.add('nat1'); notify('Natural 1. Straight to dice jail.', '\uD83C\uDFB2'); }
      back = setTimeout(function () {
        d20.textContent = label;
        chip.classList.remove('nat20', 'nat1');
      }, 2800);
    };
    d20.addEventListener('click', function () {
      clearInterval(spin); clearTimeout(back);
      chip.classList.remove('nat20', 'nat1');
      if (reduce) { settle(roll()); return; } // no tumbling for anyone who asked for stillness
      chip.classList.add('rolling');
      var n = 0;
      spin = setInterval(function () {
        d20.textContent = '\uD83C\uDFB2 ' + roll();
        if (++n < 9) return;
        clearInterval(spin);
        settle(roll());
      }, 55);
    });
  }

  // The CV is being rewritten, so the download button says so instead of handing over a stale PDF.
  var CV_LINES = [
    'CV is in drydock. The astronaut is arguing with the layout.',
    'Still under construction. Everything worth knowing is on this page anyway.',
    'Hull plating is off. Ask me and I will send you the current one.',
    'Nope. Try the mission log.',
    'Patience, commander.'
  ];
  var cvAt = 0;
  document.querySelectorAll('.cv-wip').forEach(function (b) {
    b.addEventListener('click', function () {
      notify(CV_LINES[cvAt % CV_LINES.length], '🚧');
      cvAt++;
      unlock('cv');
    });
  });

  if ('IntersectionObserver' in window) {
    var sections = document.querySelectorAll('main section[id]');
    var seen = 0, visited = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !visited[e.target.id]) {
          visited[e.target.id] = true;
          if (++seen === sections.length) unlock('explorer');
        }
      });
    }, { threshold: 0.3 });
    sections.forEach(function (el) { io.observe(el); });
  }

  // --- Konami code ---------------------------------------------------------
  // Keyboard: the arrow keys, then B and A. Phone (or mouse): tap the locked secret tile in the achievements panel and
  // enter the code on the on-screen controller.
  var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var pos = 0;
  var pad = document.getElementById('pad'), secretTile = document.querySelector('[data-id="konami"]'), wrongTimer = null;

  function renderPad() { // the ten lights follow the progress, whichever way the code is being entered
    if (!pad) return;
    var leds = pad.querySelectorAll('.pad-leds i');
    for (var i = 0; i < leds.length; i++) leds[i].classList.toggle('on', i < pos);
  }

  function feed(k) {
    pos = (k === code[pos]) ? pos + 1 : (k === code[0] ? 1 : 0);
    if (pos === code.length) {
      pos = 0;
      if (!unlocked.konami) { // the popup and the burst only happen the first time; after that it is a switch in the panel
        warp = 1;
        notify('Secret unlocked: warp speed!');
        document.dispatchEvent(new CustomEvent('unlock', { detail: 'konami' }));
      }
    }
    renderPad();
  }

  document.addEventListener('keydown', function (e) {
    feed(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });

  if (pad && secretTile) {
    secretTile.addEventListener('click', function (e) {
      if (unlocked.konami || pad.contains(e.target)) return;
      pad.hidden = !pad.hidden;
    });
    pad.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-k]') : null;
      if (!btn) return;
      var before = pos;
      feed(btn.getAttribute('data-k'));
      if (navigator.vibrate) navigator.vibrate(10);
      if (!unlocked.konami && pos <= before) { // wrong button: the lights flash red and the code starts over
        pad.classList.add('wrong');
        clearTimeout(wrongTimer);
        wrongTimer = setTimeout(function () { pad.classList.remove('wrong'); }, 450); // a short flash, then back to normal
      }
    });
  }
})();

// --- Contact + feedback forms (FormSubmit, no backend) ----------------------
(function () {
  'use strict';
  var TO = 'daan.lemmens@hotmail.com';
  // Web3Forms access key (free at web3forms.com: enter your email, the key is mailed to you). The key is meant to be public.
  // While it is empty the forms fall back to FormSubmit, which is currently unreliable.
  var W3F_KEY = 'aedc6eb9-b30d-4d68-ab05-c0a9b0831137';

  document.querySelectorAll('form.form').forEach(function (form) {
    var status = form.querySelector('.status');
    var btn = form.querySelector('button[type=submit]');

    // when sending fails: say why, and offer a ready-made email so nothing the visitor typed is lost
    function fail(reason) {
      if (window.console) console.error('Form send failed:', reason);
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k.charAt(0) !== '_') data[k] = v; });
      var subject = form.dataset.kind === 'feedback' ? 'Feedback on your CV site' : 'Message from your CV site';
      var body = Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n');
      var a = document.createElement('a');
      a.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      a.textContent = 'email me instead';
      status.className = 'status err';
      status.textContent = 'Could not send (' + reason + '). Please ';
      status.appendChild(a);
      status.appendChild(document.createTextNode('.'));
    }

    form.addEventListener('submit', function (e) {
      if (!window.fetch) return; // fall back to a normal POST
      e.preventDefault();
      btn.disabled = true;
      status.className = 'status';
      status.textContent = 'Sending…';
      var payload = {};
      new FormData(form).forEach(function (v, k) { payload[k] = v; });
      var url = form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
      if (W3F_KEY) { // Web3Forms: same fields, its own names for key, subject and the spam trap
        url = 'https://api.web3forms.com/submit';
        var spam = payload._honey;
        Object.keys(payload).forEach(function (k) { if (k.charAt(0) === '_') delete payload[k]; });
        payload.access_key = W3F_KEY;
        payload.subject = form.dataset.kind === 'feedback' ? 'CV site: page feedback' : 'CV site: new message';
        payload.from_name = 'CV site';
        payload.botcheck = spam ? 'on' : '';
      }
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.text().then(function (t) {
          var j = {};
          try { j = JSON.parse(t); } catch (err) {}
          return { ok: r.ok, status: r.status, j: j };
        });
      }).then(function (res) {
        if (!res.ok || String(res.j.success) === 'false') {
          fail(res.j.message || ('HTTP ' + res.status));
          return;
        }
        status.className = 'status ok';
        status.textContent = form.dataset.kind === 'feedback' ? 'Thanks for the review!' : 'Message sent, thanks!';
        document.dispatchEvent(new CustomEvent('unlock', { detail: form.dataset.kind === 'feedback' ? 'review' : 'message' }));
        form.reset();
      }).catch(function (err) {
        fail(err && err.message ? err.message : 'network error');
      }).then(function () { btn.disabled = false; });
    });
  });
})();

// --- Status line, based on Belgian time (Europe/Brussels) ------------------------------------
(function () {
  'use strict';
  var el = document.getElementById('status');
  if (!el) return;

  function update() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Brussels', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
    var h = parseInt(get('hour'), 10) % 24, day = get('weekday');
    var hh = get('hour'), mm = get('minute');
    // Testing: index.html?time=03:15&day=Sat overrides the clock
    var q = new URLSearchParams(window.location.search);
    var t = /^(\d{1,2}):(\d{2})$/.exec(q.get('time') || '');
    if (t) { h = parseInt(t[1], 10) % 24; hh = ('0' + h).slice(-2); mm = t[2]; }
    if (q.get('day')) day = q.get('day').slice(0, 3);
    var weekend = day === 'Sat' || day === 'Sun';
    var what, state;
    if (h >= 21 || h < 7) { what = 'sleeping (zzz)'; state = 'sleep'; }
    else if (weekend) { what = 'off duty'; state = 'off'; }
    else if (h >= 9 && h < 17) { what = 'at work, shipping code'; state = 'work'; }
    else { what = 'side quest time'; state = 'quest'; }
    var astro = document.getElementById('astro');
    if (astro && !astro.hasAttribute('data-annoyed')) astro.setAttribute('data-state', state);
    var local = /^(localhost|127\.0\.0\.1|\[::1\])?$/.test(window.location.hostname); // '' = file://
    if (state === 'sleep' && (!q.get('time') || local)) document.dispatchEvent(new CustomEvent('unlock', { detail: 'nightowl' }));
    if (document.documentElement.classList.contains('away')) what = 'away, exploring the cosmos';
    el.textContent = 'Status: ' + what + ' · ' + hh + ':' + mm + ' in Belgium';
  }
  update();
  setInterval(update, 30000);
  document.addEventListener('away', update);
})();

// --- Decode-on-load: header and hero text start as Aurebesh, then flip to English --------
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ready() { root.classList.add('ready'); }
  if (reduce || root.classList.contains('plain') || !document.fonts || !window.Promise) { ready(); return; }

  var SEL = '.hud-brand, .hud-nav a, .hero-text h1, .hero-text .role, .hero-text .lead, .hero-text .btn, .hero .tag';
  var fonts = Promise.all([document.fonts.ready, document.fonts.load('16px Aurebesh')]);
  Promise.race([fonts, new Promise(function (r) { setTimeout(r, 2000); })]).then(start, start);

  function start() {
    // the "incoming transmission" line types itself out in English, like a console, before the translation starts
    var kick = document.querySelector('.hero-text .kicker');
    var kickFull = kick ? kick.textContent.replace(/_$/, '') : '';
    var kickText = null, kickCur = null;
    if (kick) {
      kick.setAttribute('aria-label', kickFull + '_');
      kick.textContent = '';
      kickText = document.createElement('span');
      kickCur = document.createElement('span');
      kickCur.className = 'cursor';
      kickCur.textContent = '_';
      kick.appendChild(kickText);
      kick.appendChild(kickCur);
    }

    var items = [], roots = [], groups = [];
    document.querySelectorAll(SEL).forEach(function (el) {
      if (!el.getClientRects().length) return; // e.g. the nav links inside a closed mobile menu
      var g = { el: el, items: [], letters: 0, cur: 0, done: 0 };
      groups.push(g);
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        var txt = n.nodeValue;
        if (!txt.trim()) return;
        var wrap = document.createElement('span');
        txt.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { wrap.appendChild(document.createTextNode(tok)); return; }
          var w = document.createElement('span');
          w.className = 'dw';
          w.textContent = tok;
          wrap.appendChild(w);
          var it = { el: w, text: tok, k: 0 };
          items.push(it);
          g.items.push(it);
          g.letters += tok.length;
        });
        n.parentNode.replaceChild(wrap, n);
        roots.push({ wrap: wrap, text: txt });
      });
    });

    // measure every word in English first, then lock its width so nothing jumps while it flips
    items.forEach(function (it) { it.w = it.el.getBoundingClientRect().width; });
    items.forEach(function (it) {
      it.el.style.width = it.w + 'px';
      it.el.textContent = '';
      it.d = document.createElement('span');
      it.p = document.createElement('span');
      it.p.className = 'p';
      it.el.appendChild(it.d);
      it.el.appendChild(it.p);
      setPending(it.p, it.text);
    });
    // Aurebesh glyphs are wider and taller than the Latin ones: shrink each word to fit its English width
    // (punctuation stays in the normal font at full size, so only the letters are scaled)
    items.forEach(function (it) {
      it.pw = it.p.getBoundingClientRect().width;
      it.lw = 0;
      it.p.querySelectorAll('.a').forEach(function (a) { it.lw += a.getBoundingClientRect().width; });
    });
    items.forEach(function (it) {
      var sc = (it.lw > 0 && it.pw > it.w) ? (it.w - (it.pw - it.lw)) / it.lw : 1;
      it.p.style.setProperty('--s', Math.min(1, Math.max(sc, 0.4)));
    });
    ready();

    var t0 = null, TYPE_START = 700, TYPE_MS = 55, HOLD = 400;
    var PAUSE = TYPE_START + kickFull.length * TYPE_MS + HOLD; // translation waits until the line is typed and the cursor has blinked a while
    function setPending(p, str) {
      p.textContent = '';
      str.split(/([\p{L}\p{N}]+)/u).forEach(function (part) {
        if (!part) return;
        if (/^[\p{L}\p{N}]+$/u.test(part)) {
          var a = document.createElement('span');
          a.className = 'a';
          a.textContent = part;
          p.appendChild(a);
        } else {
          p.appendChild(document.createTextNode(part));
        }
      });
    }
    // every piece of text gets its own short timeline starting at zero, so nothing has to "catch up":
    // header links and the name flip first, the paragraph takes its time, buttons and caption follow
    var hdrIdx = 0, btnIdx = 0;
    groups.forEach(function (g) {
      var el = g.el;
      if (el.closest('.hud')) { g.start = hdrIdx++ * 80; g.dur = 700; }
      else if (el.matches('h1')) { g.start = 0; g.dur = 1100; }
      else if (el.matches('.role')) { g.start = 350; g.dur = 800; }
      else if (el.matches('.lead')) { g.start = 600; g.dur = 2000; }
      else if (el.matches('.btn')) { g.start = 1000 + btnIdx++ * 150; g.dur = 700; }
      else { g.start = 1300; g.dur = 900; }
    });
    function advanceGroup(g, target) {
      while (g.done < target && g.cur < g.items.length) {
        var it = g.items[g.cur];
        it.k++;
        g.done++;
        it.d.textContent = it.text.slice(0, it.k);
        setPending(it.p, it.text.slice(it.k));
        if (it.k >= it.text.length) g.cur++;
      }
    }
    function finish() {
      roots.forEach(function (o) {
        if (o.wrap.parentNode) o.wrap.parentNode.replaceChild(document.createTextNode(o.text), o.wrap);
      });
    }
    function tick(ts) {
      if (t0 === null) t0 = ts;
      if (kickText) {
        var n = Math.min(kickFull.length, Math.floor(Math.max(0, ts - t0 - TYPE_START) / TYPE_MS));
        if (kickText.textContent.length !== n) kickText.textContent = kickFull.slice(0, n);
        kickCur.classList.toggle('typing', n > 0 && n < kickFull.length); // solid while typing, blinks when idle
      }
      var elapsed = ts - t0 - PAUSE, pending = false;
      groups.forEach(function (g) {
        var p = Math.min(1, Math.max(0, (elapsed - g.start) / g.dur));
        advanceGroup(g, Math.floor(p * g.letters));
        if (g.done < g.letters) pending = true;
      });
      if (pending) requestAnimationFrame(tick); else finish();
    }
    requestAnimationFrame(tick);
  }
})();

// --- Screenshot lightbox ----------------------------------------------------
// Tiles are read from the DOM every time rather than captured once, so a tile appearing or
// dropping out never leaves the arrows pointing at the wrong picture.
(function () {
  'use strict';
  var dlg = document.getElementById('lightbox');
  if (!dlg || !dlg.showModal || !document.querySelector('.shot')) return; // without <dialog> the thumbnails simply do nothing

  var img = document.getElementById('lb-img');
  var vid = document.getElementById('lb-vid');
  var cap = document.getElementById('lb-cap');
  var at = 0;

  function shots() {
    return Array.prototype.slice.call(document.querySelectorAll('.shot:not([hidden])'));
  }

  // Only the first two thumbnails are on screen; the second one says how many more there are,
  // and the arrows in the viewer walk through the whole set.
  function refreshStrip() {
    var list = shots();
    list.forEach(function (btn, i) {
      btn.classList.toggle('extra', i > 1);
      var badge = btn.querySelector('.more');
      if (badge) btn.removeChild(badge);
      var label = btn.querySelector('span');
      if (label) label.hidden = false;
      btn.removeAttribute('aria-label');
    });
    var rest = list.length - 2;
    if (rest > 0) {
      var badge = document.createElement('span');
      badge.className = 'more';
      badge.textContent = '+' + rest + ' more';
      var label = list[1].querySelector('span');
      if (label) label.hidden = true; // the count replaces the caption on this one
      list[1].appendChild(badge);
      list[1].setAttribute('aria-label', 'Open the screenshot viewer: ' + list.length + ' screenshots');
    }
  }
  refreshStrip();

  // A tile may name a file that is not in the folder yet. Rather than hand the reader a broken
  // frame, it stays hidden until a HEAD request says the file is there.
  if (window.fetch) {
    document.querySelectorAll('.shot[hidden][data-src]').forEach(function (btn) {
      fetch(btn.getAttribute('data-src'), { method: 'HEAD' }).then(function (r) {
        if (!r.ok) return;
        btn.hidden = false;
        refreshStrip();
      }).catch(function () {});
    });
  }

  function stopVideo() {
    if (!vid) return;
    vid.pause();
    vid.removeAttribute('src');
    vid.load(); // drop the buffered data instead of leaving it downloading in the background
    vid.hidden = true;
  }

  function show(i) {
    var list = shots();
    if (!list.length) return;
    at = (i + list.length) % list.length;
    var btn = list[at];
    var thumb = btn.querySelector('img');
    var src = btn.getAttribute('data-src');
    if (/\.(mp4|webm)$/i.test(src)) {
      img.hidden = true;
      img.removeAttribute('src');
      vid.hidden = false;
      vid.poster = btn.getAttribute('data-poster') || '';
      vid.src = src;
      vid.play().catch(function () {}); // autoplay can be refused; the controls still work
    } else {
      stopVideo();
      img.hidden = false;
      img.src = src;
      img.alt = thumb ? thumb.alt : '';
    }
    cap.textContent = btn.getAttribute('data-cap') || '';
  }

  // Delegated, so the index is worked out from the tile that was actually clicked.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.shot');
    if (!btn || btn.hidden) return;
    var i = shots().indexOf(btn);
    if (i < 0) return;
    show(i);
    dlg.showModal();
  });

  // Backstop for a file that disappears after the page loaded: drop the tile and renumber.
  function drop() {
    var list = shots();
    var gone = list[at];
    if (!gone) return;
    gone.hidden = true;
    refreshStrip();
    at = 0;
    dlg.close();
  }
  img.addEventListener('error', function () { if (img.getAttribute('src')) drop(); });
  if (vid) vid.addEventListener('error', function () { if (vid.getAttribute('src')) drop(); });

  dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
  dlg.querySelector('.lb-prev').addEventListener('click', function () { show(at - 1); });
  dlg.querySelector('.lb-next').addEventListener('click', function () { show(at + 1); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  });
  // click outside the picture closes it (the dialog box itself is the full-bleed image)
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) dlg.close();
  });
  // put focus back on the thumbnail that was opened, so keyboard users don't lose their place
  dlg.addEventListener('close', function () {
    stopVideo();
    var list = shots();
    if (list[at]) list[at].focus();
  });
})();

// --- Live telemetry: solar wind, the planetary K index, and where the ISS is ----
// Two public, key-less feeds. Each line starts as Aurebesh static and decodes into English the
// moment its reading lands, the same way the hero text does on load. A feed that never answers
// has its line dropped rather than left spinning, and if neither answers nothing is shown at all.
(function () {
  'use strict';
  if (document.documentElement.classList.contains('plain')) return; // plain mode hides the whole avatar column
  var box = document.getElementById('telemetry');
  if (!box || !window.fetch) return;
  var spaceEl = document.getElementById('tele-space');
  var issEl = document.getElementById('tele-iss');
  var kpEl = document.getElementById('tele-kp');
  var rangeEl = document.getElementById('tele-range');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nine segments, one per Kp step. Each carries its own band colour from the start, so the
  // meter shows where the storm thresholds sit rather than only how far along we are.
  var KP_STEPS = 9, kpShown = false;
  if (kpEl) {
    for (var kpI = 1; kpI <= KP_STEPS; kpI++) {
      var pip = document.createElement('i');
      pip.className = kpI >= 7 ? 'storm' : (kpI >= 5 ? 'warn' : 'calm');
      kpEl.appendChild(pip);
    }
  }
  function showKp(kp) {
    if (!kpEl) return;
    var lit = Math.max(0, Math.min(KP_STEPS, Math.floor(kp)));
    Array.prototype.forEach.call(kpEl.children, function (pip, i) {
      pip.classList.toggle('on', i < lit);
    });
    kpEl.hidden = false;
  }

  // Rising bars for how close the station is. 20015 km is the distance from any point on the
  // surface to its antipode, so that is an empty meter; directly overhead fills it.
  var RANGE_BARS = 8, ANTIPODE = 20015, rangeShown = false;
  if (rangeEl) {
    for (var rI = 0; rI < RANGE_BARS; rI++) rangeEl.appendChild(document.createElement('i'));
  }
  function showRange(away, horizon) {
    if (!rangeEl) return;
    var lit = Math.round(Math.max(0, Math.min(1, 1 - away / ANTIPODE)) * RANGE_BARS);
    rangeEl.classList.toggle('overhead', away <= horizon);
    Array.prototype.forEach.call(rangeEl.children, function (bar, i) {
      bar.classList.toggle('on', i < lit);
    });
    rangeEl.hidden = false;
  }

  var POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function noise(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += POOL.charAt(Math.floor(Math.random() * POOL.length));
    return s;
  }

  // the .dw / .a scaffold the stylesheet already knows how to draw: an inline-block of fixed
  // width holding a decoded run and a pending run, so nothing reflows mid-animation
  function scaffold(el) {
    var wrap = document.createElement('span');
    wrap.className = 'dw';
    var lit = document.createElement('span');
    var pend = document.createElement('span');
    wrap.appendChild(lit);
    wrap.appendChild(pend);
    el.textContent = '';
    el.appendChild(wrap);
    return { wrap: wrap, lit: lit, pend: pend };
  }

  function aurebesh(pend, str) {
    pend.textContent = '';
    str.split(/([A-Za-z0-9]+)/).forEach(function (part) {
      if (!part) return;
      if (/^[A-Za-z0-9]+$/.test(part)) {
        var a = document.createElement('span');
        a.className = 'a';
        a.textContent = part;
        pend.appendChild(a);
      } else {
        pend.appendChild(document.createTextNode(part));
      }
    });
  }

  // Aurebesh glyphs are wider than the Latin ones: shrink them to the width the English will take
  function fit(pend, target) {
    var pw = pend.getBoundingClientRect().width, lw = 0;
    Array.prototype.forEach.call(pend.querySelectorAll('.a'), function (a) {
      lw += a.getBoundingClientRect().width;
    });
    var sc = (lw > 0 && pw > target) ? (target - (pw - lw)) / lw : 1;
    pend.style.setProperty('--s', Math.min(1, Math.max(sc, 0.4)));
  }

  function waiting(el, n) {
    var p = scaffold(el);
    aurebesh(p.pend, noise(n));
    if (reduce) return function () {};
    var t = setInterval(function () { aurebesh(p.pend, noise(n)); }, 110);
    return function () { clearInterval(t); };
  }

  function decode(el, text, dur) {
    var probe = document.createElement('span');
    probe.className = 'dw';
    probe.textContent = text;
    el.textContent = '';
    el.appendChild(probe);
    var target = probe.getBoundingClientRect().width; // the finished line, measured before anything moves

    var p = scaffold(el);
    p.wrap.style.width = target + 'px';
    aurebesh(p.pend, text);
    fit(p.pend, target);

    var t0 = null;
    function tick(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(text.length, Math.round((ts - t0) / dur * text.length));
      p.lit.textContent = text.slice(0, k);
      aurebesh(p.pend, text.slice(k));
      if (k < text.length) requestAnimationFrame(tick);
      else el.textContent = text; // done: collapse the scaffold back to plain text
    }
    requestAnimationFrame(tick);
  }

  // Each line owns its own loading state. The returned function takes the first reading and
  // decodes into it; later refreshes just swap the value, so it does not re-animate every 30s.
  function channel(el, chars) {
    var stop = waiting(el, chars);
    var settled = false;
    var giveUp = setTimeout(function () {
      if (settled) return;
      stop();
      el.textContent = '';
      if (!spaceEl.textContent && !issEl.textContent) box.hidden = true;
    }, 12000);
    return function (text) {
      if (settled) { el.textContent = text; return; }
      settled = true;
      clearTimeout(giveUp);
      stop();
      if (reduce) { el.textContent = text; return; }
      decode(el, text, 900);
    };
  }

  var setSpace = channel(spaceEl, 26);
  var setIss = channel(issEl, 34);
  box.hidden = false;

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  // NOAA SWPC: a one-row summary carries the wind speed, and the three-hourly planetary
  // K index series carries the current value as its last row.
  function space() {
    Promise.all([
      getJSON('https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json'),
      getJSON('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
    ]).then(function (r) {
      var speed = Math.round(r[0][0].proton_speed);
      var rows = r[1];
      var kp = rows.length ? Number(rows[rows.length - 1].Kp) : NaN;
      if (!isFinite(speed) || !isFinite(kp)) return;
      // NOAA's G scale: a storm only starts at Kp 5, and G5 is the top of it
      var g = kp >= 5 ? ' · G' + Math.min(5, Math.floor(kp) - 4) + ' storm' : '';
      setSpace('Solar wind ' + speed + ' km/s · Kp ' + kp.toFixed(1).replace(/\.0$/, '') + g);
      // the meter waits for the line to finish decoding, then lights up underneath it
      if (kpShown) showKp(kp);
      else { kpShown = true; setTimeout(function () { showKp(kp); }, reduce ? 0 : 950); }
    }).catch(function () {});
  }

  var BRUSSELS = { lat: 50.85, lon: 4.35 };
  function kmApart(a, b) { // haversine; plenty accurate for a caption
    var R = 6371, d = Math.PI / 180;
    var dLat = (b.lat - a.lat) * d, dLon = (b.lon - a.lon) * d;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(x))));
  }

  function iss() {
    getJSON('https://api.wheretheiss.at/v1/satellites/25544').then(function (p) {
      if (!isFinite(p.altitude) || !isFinite(p.latitude)) return;
      var away = kmApart(BRUSSELS, { lat: p.latitude, lon: p.longitude });
      // the feed gives the footprint as a diameter; half of it is how far the station can be
      // and still be above the horizon from here
      var horizon = isFinite(p.footprint) ? p.footprint / 2 : 2250;
      setIss('ISS ' + Math.round(p.altitude) + ' km up, ' +
        away.toLocaleString('en-GB') + ' km from Belgium' +
        (away <= horizon ? ' · above the horizon' : ''));
      if (rangeShown) showRange(away, horizon);
      else { rangeShown = true; setTimeout(function () { showRange(away, horizon); }, reduce ? 0 : 950); }
    }).catch(function () {});
  }

  space();
  iss();
  setInterval(space, 600000); // the K index moves in three-hour steps; ten minutes is generous
  setInterval(iss, 30000);    // the station covers roughly 230 km in that time
})();
