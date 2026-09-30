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

  function notify(msg) {
    toast.textContent = '★ ' + msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
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
  document.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = (k === code[pos]) ? pos + 1 : (k === code[0] ? 1 : 0);
    if (pos === code.length) {
      pos = 0;
      warp = 1;
      notify('Secret unlocked: warp speed!');
      document.dispatchEvent(new CustomEvent('unlock', { detail: 'konami' }));
    }
  });
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
