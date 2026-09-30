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
  function notify(msg) {
    toastQueue.push(msg);
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    var msg = toastQueue.shift();
    if (!msg) { toastBusy = false; return; }
    toastBusy = true;
    toast.textContent = '★ ' + msg;
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
        li.querySelector('span').textContent = on ? 'Found the secret code. Flip the switch for warp mode.' : 'A secret. Hint: Konami';
      }
    });
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

  document.querySelectorAll('a[href$=".pdf"]').forEach(function (a) {
    a.addEventListener('click', function () { unlock('cv'); });
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

  // --- Skill pips ----------------------------------------------------------
  document.querySelectorAll('.branch li[data-lv]').forEach(function (li) {
    li.style.setProperty('--p', li.getAttribute('data-lv'));
  });

  // --- Konami code ---------------------------------------------------------
  var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  // Touch: people (and phones) can disagree on which way "up" and which way "left" is, and not always for both axes.
  // So four versions of the sequence are tracked at once: up/down normal or mirrored, left/right normal or mirrored.
  // ps[0] is the plain sequence (keyboard + touch); ps[1..3] are only fed by touch.
  var ps = [0, 0, 0, 0];
  var MIRROR = { ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };
  function advance(p, k) { return (k === code[p]) ? p + 1 : (k === code[0] ? 1 : 0); }
  function mapKey(k, i) { // bit 0: mirror up/down, bit 1: mirror left/right
    if ((i & 1) && (k === 'ArrowUp' || k === 'ArrowDown')) return MIRROR[k];
    if ((i & 2) && (k === 'ArrowLeft' || k === 'ArrowRight')) return MIRROR[k];
    return k;
  }

  function feed(k, touch) {
    var before = Math.max.apply(null, ps);
    ps[0] = advance(ps[0], k);
    if (touch) for (var i = 1; i < 4; i++) ps[i] = advance(ps[i], mapKey(k, i));
    var after = Math.max.apply(null, ps);
    // feedback only from step 4 on, so ordinary scrolling never buzzes
    if (touch && navigator.vibrate && after >= 4 && after > before && after < code.length) navigator.vibrate(15);
    if (ps.some(function (p) { return p === code.length; })) {
      if (touch && navigator.vibrate) navigator.vibrate([40, 60, 40]);
      ps = [0, 0, 0, 0];
      if (!unlocked.konami) { // the popup and the burst only happen the first time; after that it is a switch in the panel
        warp = 1;
        notify('Secret unlocked: warp speed!');
        document.dispatchEvent(new CustomEvent('unlock', { detail: 'konami' }));
      }
    }
  }

  document.addEventListener('keydown', function (e) {
    feed(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });

  // Touch version: swipes stand in for the arrow keys and the last two taps for B and A. Either orientation is accepted.
  // Positions are taken in SCREEN coordinates (clientX/Y shift while a phone's address bar collapses during a scroll).
  // The gesture is finished on touchend OR touchcancel, because browsers cancel the touch once they start scrolling.
  var dbg = null, lastLine = 'no gesture yet';
  if (/[?&]debug(&|$)/.test(window.location.search)) {
    dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;padding:6px 10px;border-radius:6px;background:#000d;color:#3fe0c5;font:12px/1.4 monospace;white-space:pre;pointer-events:none;max-width:94vw;overflow:hidden';
    document.body.appendChild(dbg);
  }
  var NAMES = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', b: 'TAP', a: 'TAP' };
  function report() {
    if (!dbg) return;
    var labels = ['up/down normal, left/right normal  ', 'up/down MIRRORED, left/right normal ', 'up/down normal, left/right MIRRORED ', 'up/down MIRRORED, left/right MIRRORED'];
    dbg.textContent = 'konami debug v4\n' + lastLine + '\n' + ps.map(function (p, i) {
      return ps[i] + '/' + code.length + ' next ' + (NAMES[mapKey(code[p], i)] || '-') + '  ' + labels[i];
    }).join('\n');
  }
  report();

  var t0 = null, last = null, c0 = null, cl = null, moves = 0, s0 = 0;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { t0 = null; return; }
    var t = e.touches[0];
    t0 = { x: t.screenX, y: t.screenY }; last = t0;
    c0 = { x: t.clientX, y: t.clientY }; cl = c0;
    moves = 0;
    s0 = window.pageYOffset; // where the page was when the finger came down
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (t0 && e.touches.length === 1) {
      var t = e.touches[0];
      last = { x: t.screenX, y: t.screenY }; cl = { x: t.clientX, y: t.clientY };
      moves++;
    }
  }, { passive: true });

  function finish(e) {
    if (!t0) return;
    if (e && e.type === 'touchend' && e.changedTouches && e.changedTouches.length) {
      var t = e.changedTouches[0];
      last = { x: t.screenX, y: t.screenY }; cl = { x: t.clientX, y: t.clientY };
    }
    var dx = last.x - t0.x, dy = last.y - t0.y, cdx = cl.x - c0.x, cdy = cl.y - c0.y;
    t0 = null;
    var ax = Math.abs(dx), ay = Math.abs(dy), d = Math.max(ax, ay), what;
    if (e && e.type === 'touchcancel' && d < 30) {
      // The browser took over before any real movement reached us (typical when a new swipe starts while the page is
      // still coasting). The page keeps moving though: scrolling down means the finger went up, and the other way round.
      var start = s0;
      setTimeout(function () {
        var ds = window.pageYOffset - start, inferred = ds > 0 ? 'ArrowUp' : 'ArrowDown';
        if (Math.abs(ds) >= 60) {
          feed(inferred, true);
          lastLine = 'swipe ' + NAMES[inferred] + ' (inferred from ' + Math.round(ds) + 'px of scrolling)';
        } else {
          lastLine = 'touch cancelled, page barely moved (' + Math.round(ds) + 'px)';
        }
        report();
      }, 250);
      lastLine = 'touch cancelled, checking the scroll...';
      report();
      return;
    }
    if (d < 12) { // tap: only counts for the final B, A
      var far = Math.max.apply(null, ps);
      if (far >= 8) feed(far === 8 ? 'b' : 'a', true);
      what = 'tap';
    } else if (d >= 30) {
      var dir = ay > ax ? (dy < 0 ? 'ArrowUp' : 'ArrowDown') : (dx < 0 ? 'ArrowLeft' : 'ArrowRight');
      feed(dir, true);
      what = 'swipe ' + NAMES[dir];
    } else {
      what = 'too short (' + Math.round(d) + 'px)';
    }
    lastLine = what + ' | screen dx=' + Math.round(dx) + ' dy=' + Math.round(dy) +
      '\nwindow dx=' + Math.round(cdx) + ' dy=' + Math.round(cdy) + ' | ' + moves + ' moves | ' + (e ? e.type : '?');
    report();
  }
  document.addEventListener('touchend', finish, { passive: true });
  document.addEventListener('touchcancel', finish, { passive: true });
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
  if (reduce || !document.fonts || !window.Promise) { ready(); return; }

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

    var t0 = null, TYPE_START = 700, TYPE_MS = 55, HOLD = 1300;
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
