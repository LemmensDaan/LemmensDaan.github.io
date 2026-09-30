(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Starfield -----------------------------------------------------------
  var canvas = document.getElementById('stars');
  var ctx = canvas.getContext('2d');
  var stars = [], w = 0, h = 0, warp = 0, scrollY = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        li.querySelector('span').textContent = on ? 'Found the secret code' : 'A secret. Hint: Konami';
      }
    });
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
  if (astro) {
    astro.addEventListener('click', function () {
      unlock('hello');
      if (astro.getAttribute('data-state') === 'sleep') {
        // woken up: annoyed for a few seconds, then back to sleep
        astro.setAttribute('data-state', 'annoyed');
        astro.setAttribute('data-annoyed', '1');
        unlock('wake');
        setTimeout(function () {
          astro.removeAttribute('data-annoyed');
          astro.setAttribute('data-state', 'sleep');
        }, 6000);
      }
      if (++pokes === 10) {
        unlock('poke');
        astro.style.scale = 0.15; // zooms away, CSS 'scale' is independent of the hop/float animations
      }
      astro.classList.remove('hop');
      void astro.getBoundingClientRect();
      astro.classList.add('hop');
    });
    astro.addEventListener('animationend', function (e) {
      if (e.animationName === 'hop') astro.classList.remove('hop');
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
  var pos = 0;

  function feed(k) {
    pos = (k === code[pos]) ? pos + 1 : (k === code[0] ? 1 : 0);
    if (pos === code.length) {
      pos = 0;
      warp = 1;
      notify('Secret unlocked: warp speed!');
      document.dispatchEvent(new CustomEvent('unlock', { detail: 'konami' }));
    }
  }

  document.addEventListener('keydown', function (e) {
    feed(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });

  // Touch version: swipes stand in for the arrow keys, and the last two taps for B and A.
  // Phone browsers often fire touchcancel (not touchend) once they start scrolling,
  // so the gesture is finished from the last touchmove position on either event.
  var dbg = null;
  if (/[?&]debug/.test(window.location.search)) {
    dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;padding:6px 10px;border-radius:6px;background:#000c;color:#3fe0c5;font:12px monospace;pointer-events:none';
    document.body.appendChild(dbg);
  }
  function report(what) { if (dbg) dbg.textContent = what + ' | step ' + pos + '/' + code.length; }

  var t0 = null, last = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { t0 = null; return; }
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    last = t0;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (t0 && e.touches.length === 1) last = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  function finish() {
    if (!t0) return;
    var dx = last.x - t0.x, dy = last.y - t0.y;
    t0 = null;
    var ax = Math.abs(dx), ay = Math.abs(dy), d = Math.max(ax, ay);
    if (d < 12) { // tap: only counts for the final B, A
      if (pos >= 8) feed(pos === 8 ? 'b' : 'a');
      report('tap');
    } else if (d >= 30) {
      var dir = ay > ax ? (dy < 0 ? 'ArrowUp' : 'ArrowDown') : (dx < 0 ? 'ArrowLeft' : 'ArrowRight');
      feed(dir);
      report(dir.replace('Arrow', 'swipe '));
    }
  }
  document.addEventListener('touchend', finish, { passive: true });
  document.addEventListener('touchcancel', finish, { passive: true });
})();

// --- Contact + feedback forms (FormSubmit, no backend) ----------------------
(function () {
  'use strict';
  document.querySelectorAll('form.form').forEach(function (form) {
    var status = form.querySelector('.status');
    var btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', function (e) {
      if (!window.fetch) return; // fall back to a normal POST
      e.preventDefault();
      btn.disabled = true;
      status.className = 'status';
      status.textContent = 'Sending…';
      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || res.j.success === 'false') throw new Error(res.j.message || 'failed');
          status.className = 'status ok';
          status.textContent = form.dataset.kind === 'feedback' ? 'Thanks for the review!' : 'Message sent, thanks!';
          document.dispatchEvent(new CustomEvent('unlock', { detail: form.dataset.kind === 'feedback' ? 'review' : 'message' }));
          form.reset();
        })
        .catch(function () {
          status.className = 'status err';
          status.textContent = 'Could not send. Please email me directly instead.';
        })
        .then(function () { btn.disabled = false; });
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
    el.textContent = 'Status: ' + what + ' · ' + hh + ':' + mm + ' in Belgium';
  }
  update();
  setInterval(update, 30000);
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
