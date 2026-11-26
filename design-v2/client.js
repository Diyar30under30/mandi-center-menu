(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('menu-data').textContent);
  var ITEMS = DATA.items; // key -> {n, l, p, o}
  var STORE = 'mandi-center-tray-v2';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';
  var MINUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Строка подноса: "ключ" или "ключ|способ приготовления"
  function base(id) { return String(id).split('|')[0]; }
  function meth(id) { return String(id).split('|')[1] || ''; }
  function sub(id) { var it = ITEMS[base(id)]; return [it.l, meth(id)].filter(Boolean).join(', '); }
  function title(id) { var s = sub(id); return ITEMS[base(id)].n + (s ? ', ' + s : ''); }

  // ── Поднос: {id: qty}, только в этом браузере ──
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(function (k) { var it = ITEMS[base(k)]; if (!it || it.o || it.p == null || !(cart[k] > 0)) delete cart[k]; });
  function save() { try { localStorage.setItem(STORE, JSON.stringify(cart)); } catch (e) { /* приватный режим */ } }
  function count() { var c = 0; for (var k in cart) c += cart[k]; return c; }
  function total() { var s = 0; for (var k in cart) s += cart[k] * ITEMS[base(k)].p; return s; }
  function add(id, from) {
    var it = ITEMS[base(id)]; if (!it || it.o || it.p == null) return;
    cart[id] = (cart[id] || 0) + 1; save(); renderAll(); flash('Добавлено: ' + title(id)); fly(from);
  }
  function dec(id) { if (!cart[id]) return; cart[id] -= 1; if (cart[id] <= 0) delete cart[id]; save(); renderAll(); }

  // ── Карточки ──
  function selectedId(card) {
    var o = card.querySelector('.opt[data-key][aria-pressed="true"]');
    var k = o ? o.getAttribute('data-key') : card.getAttribute('data-key');
    var m = card.querySelector('.opt[data-meth][aria-pressed="true"]');
    return m ? k + '|' + m.getAttribute('data-meth') : k;
  }
  function stepper(id) {
    var name = esc(title(id));
    return '<div class="step" role="group" aria-label="Количество: ' + name + '">' +
      '<button type="button" data-dec data-key="' + esc(id) + '" aria-label="Убрать одну: ' + name + '">' + MINUS + '</button>' +
      '<span class="q">' + cart[id] + '</span>' +
      '<button type="button" data-inc data-key="' + esc(id) + '" aria-label="Добавить ещё: ' + name + '">' + PLUS + '</button></div>';
  }
  function addBtn(id, kind) {
    var label = 'В поднос: ' + esc(title(id)) + ', ' + fmt(ITEMS[base(id)].p);
    if (kind === 'tray') return '<button type="button" class="add-tray" data-add data-key="' + esc(id) + '" aria-label="' + label + '">' + PLUS + 'В поднос</button>';
    return '<button type="button" class="add-round" data-add data-key="' + esc(id) + '" aria-label="' + label + '">' + PLUS + '</button>';
  }
  function renderCard(card) {
    var act = card.querySelector('[data-act]'); if (!act) return;
    var id = selectedId(card); var it = ITEMS[base(id)];
    if (!it || it.o || it.p == null) return;
    act.innerHTML = cart[id] ? stepper(id) : addBtn(id, act.getAttribute('data-act'));
  }
  function renderUps() {
    document.querySelectorAll('[data-ups]').forEach(function (b) {
      var k = b.getAttribute('data-key'); var q = b.querySelector('.inq');
      if (cart[k]) { if (!q) { q = document.createElement('span'); q.className = 'inq'; b.appendChild(q); } q.textContent = '×' + cart[k]; }
      else if (q) q.remove();
    });
  }
  function selectOpt(opt) {
    var card = opt.closest('[data-card]');
    opt.parentElement.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', o === opt ? 'true' : 'false'); });
    if (!opt.hasAttribute('data-meth')) {
      var out = card.querySelector('[data-price-out]'); if (out) out.textContent = fmt(+opt.getAttribute('data-price'));
      var img = card.querySelector('img[data-ph]'); var src = opt.getAttribute('data-photo');
      if (img && src && img.getAttribute('src') !== src) img.setAttribute('src', src);
      var note = card.querySelector('[data-pp-note]'); if (note) note.textContent = opt.getAttribute('data-note') || '';
    }
    renderCard(card);
  }

  // ── Панель «Ваш поднос», шторка, чек ──
  var bar = document.getElementById('traybar');
  var barBtn = document.getElementById('open-tray');
  var sheet = document.getElementById('sheet');
  var lines = document.getElementById('lines');
  var waiter = document.getElementById('waiter');
  var live = document.getElementById('live');
  var flashUntil = 0, flashMsg = '', flashT;
  function renderBar() {
    var c = count();
    bar.hidden = c === 0;
    barBtn.querySelector('.cnt').textContent = c;
    barBtn.querySelector('.t').textContent = Date.now() < flashUntil ? flashMsg : 'Ваш поднос';
    barBtn.querySelector('.sum').textContent = c ? fmt(total()) : '';
    barBtn.setAttribute('aria-label', 'Открыть поднос: позиций ' + c + ', сумма ' + fmt(total()));
  }
  function flash(msg) {
    flashMsg = msg; flashUntil = Date.now() + 1600; live.textContent = msg; renderBar();
    if (!reduceMotion) { barBtn.classList.remove('bump'); void barBtn.offsetWidth; barBtn.classList.add('bump'); }
    clearTimeout(flashT); flashT = setTimeout(renderBar, 1650);
  }
  function fly(from) {
    if (reduceMotion || !from || !from.getBoundingClientRect || bar.hidden || !document.body.animate) return;
    var a = from.getBoundingClientRect(), b = barBtn.querySelector('.cnt').getBoundingClientRect();
    if (!a.width) return;
    var dot = document.createElement('div'); dot.className = 'fly';
    var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    dot.style.left = x0 + 'px'; dot.style.top = y0 + 'px'; document.body.appendChild(dot);
    var dx = x1 - x0, dy = y1 - y0;
    dot.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 80) + 'px) scale(1.15)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.4)', opacity: 0.2 }
    ], { duration: 560, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = function () { dot.remove(); };
  }
  function renderSheet() {
    var keys = Object.keys(cart);
    lines.innerHTML = keys.length ? keys.map(function (k) {
      var it = ITEMS[base(k)]; var s = sub(k);
      return '<li class="line"><div class="n">' + esc(it.n) + '<span>' + (s ? esc(s) + ' · ' : '') + fmt(it.p) + '</span></div>' + stepper(k) + '<div class="lp">' + fmt(it.p * cart[k]) + '</div></li>';
    }).join('') : '<li class="line empty">Поднос пока пуст</li>';
    document.getElementById('sheet-total').textContent = fmt(total());
    document.getElementById('clear').hidden = !keys.length;
    document.getElementById('show-waiter').disabled = !keys.length;
    renderSheetUps(keys);
  }
  function renderSheetUps(keys) {
    var box = document.getElementById('sheet-ups');
    var hasMandi = keys.some(function (k) { return base(k).indexOf('0-0-') === 0; });
    var cand = (hasMandi ? DATA.upsMandi : []).concat(DATA.upsTable).filter(function (k) { return !cart[k] && ITEMS[k] && !ITEMS[k].o && ITEMS[k].p != null; }).slice(0, 4);
    if (!keys.length || !cand.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<p>К заказу часто берут</p><div class="ups-row">' + cand.map(function (k) {
      var it = ITEMS[k];
      return '<button type="button" class="ups-btn" data-add data-key="' + k + '" aria-label="В поднос: ' + esc(title(k)) + ', ' + fmt(it.p) + '"><span class="pl">' + PLUS + '</span>' + esc(it.n) + (it.l ? ' ' + esc(it.l) : '') + ' <b>' + fmt(it.p) + '</b></button>';
    }).join('') + '</div>';
  }
  var lastFocus = null;
  function openSheet() { lastFocus = document.activeElement; renderSheet(); sheet.hidden = false; document.body.classList.add('lock'); document.getElementById('close').focus(); }
  function closeSheet() { resetClear(); sheet.hidden = true; document.body.classList.remove('lock'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function openWaiter() {
    document.getElementById('w-lines').innerHTML = Object.keys(cart).map(function (k) {
      var it = ITEMS[base(k)]; var s = sub(k);
      return '<li><span class="wq">' + cart[k] + '×</span><span class="wn">' + esc(it.n) + (s ? '<span>' + esc(s) + '</span>' : '') + '</span><span class="wp">' + fmt(it.p * cart[k]) + '</span></li>';
    }).join('');
    document.getElementById('w-total').textContent = fmt(total());
    waiter.hidden = false; waiter.scrollTop = 0; document.getElementById('waiter-close').focus();
  }
  function closeWaiter() { waiter.hidden = true; document.getElementById('show-waiter').focus(); }
  var clearT;
  function resetClear() { var b = document.getElementById('clear'); clearTimeout(clearT); b.classList.remove('confirm'); b.textContent = 'Очистить'; }
  function renderAll() {
    document.querySelectorAll('[data-card]').forEach(renderCard);
    renderUps(); renderBar(); if (!sheet.hidden) renderSheet();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-close]'); if (!t) return;
    if (t.classList.contains('opt')) { selectOpt(t); return; }
    if (t.hasAttribute('data-dec')) { dec(t.getAttribute('data-key')); return; }
    if (t.hasAttribute('data-add') || t.hasAttribute('data-inc')) { if (!t.disabled) add(t.getAttribute('data-key'), t); return; }
    switch (t.id) {
      case 'open-tray': if (count()) openSheet(); return;
      case 'close': closeSheet(); return;
      case 'show-waiter': if (count()) openWaiter(); return;
      case 'waiter-close': closeWaiter(); return;
      case 'search-toggle': toggleSearch(); return;
      case 'clear':
        if (t.classList.contains('confirm')) { resetClear(); cart = {}; save(); renderAll(); }
        else { t.classList.add('confirm'); t.textContent = 'Точно очистить?'; clearTimeout(clearT); clearT = setTimeout(resetClear, 3000); }
        return;
    }
    if (t.hasAttribute('data-close')) closeSheet();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!waiter.hidden) closeWaiter(); else if (!sheet.hidden) closeSheet();
  });

  // ── Липкая навигация ──
  var nav = document.getElementById('stick');
  var chipsBox = document.getElementById('chips');
  var cats = Array.prototype.slice.call(document.querySelectorAll('section.cat'));
  var current = '';
  function setStickH() { document.documentElement.style.setProperty('--stick-h', nav.offsetHeight + 'px'); }
  function setActive(cat) {
    if (!cat || cat.id === current) return; current = cat.id;
    var sec = cat.getAttribute('data-sec'); var chipOn = null;
    document.querySelectorAll('.tab').forEach(function (a) {
      var on = a.getAttribute('data-sec') === sec; a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('off', c.getAttribute('data-sec') !== sec);
      var on = c.getAttribute('href') === '#' + cat.id; c.classList.toggle('on', on);
      if (on) { chipOn = c; c.setAttribute('aria-current', 'true'); } else c.removeAttribute('aria-current');
    });
    if (chipOn) chipsBox.scrollTo({ left: Math.max(0, chipOn.offsetLeft - 16), behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  var ticking = false;
  function spy() {
    ticking = false;
    var off = nav.offsetHeight + 30, cur = null;
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i]; if (c.hidden) continue;
      if (!cur) cur = c;
      if (c.getBoundingClientRect().top - off <= 0) cur = c; else break;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      for (var j = cats.length - 1; j >= 0; j--) if (!cats[j].hidden) { cur = cats[j]; break; }
    }
    setActive(cur);
    nav.classList.toggle('shadow', nav.getBoundingClientRect().top <= 0 && window.scrollY > 60);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  window.addEventListener('resize', function () { setStickH(); spy(); });
  document.querySelectorAll('.tab').forEach(function (a) {
    a.addEventListener('click', function () {
      var first = document.querySelector('section.cat[data-sec="' + a.getAttribute('data-sec') + '"]:not([hidden])');
      if (first) setTimeout(function () { setActive(first); }, 0);
    });
  });

  // ── Поиск ──
  var searchBox = document.getElementById('searchbar');
  var input = document.getElementById('q');
  function norm(s) { return s.toLowerCase().replace(/ё/g, 'е'); }
  function toggleSearch() {
    var show = searchBox.hidden; searchBox.hidden = !show;
    document.getElementById('search-toggle').setAttribute('aria-expanded', String(show));
    if (show) input.focus(); else { input.value = ''; filter(''); }
  }
  function filter(q) {
    q = norm(q.trim()); var any = false;
    document.querySelectorAll('[data-card]').forEach(function (c) {
      var ok = !q || (c.getAttribute('data-search') || '').indexOf(q) !== -1; c.hidden = !ok; if (ok) any = true;
    });
    cats.forEach(function (cat) { cat.hidden = !!q && !cat.querySelector('[data-card]:not([hidden])'); });
    document.querySelectorAll('[data-pair], .story').forEach(function (p) { p.hidden = !!q; });
    document.querySelectorAll('section.sec').forEach(function (s) { s.hidden = !!q && !s.querySelector('section.cat:not([hidden])'); });
    document.getElementById('nothing').hidden = any; current = ''; spy();
  }
  input.addEventListener('input', function () { filter(input.value); });

  setStickH(); renderAll(); spy();
})();
