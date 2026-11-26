// Сборка menu_v2.html (дизайн «Сана») из menu_improved.json.
// Запуск из папки проекта: node design-v2/build.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const J = JSON.parse(fs.readFileSync(path.join(ROOT, 'menu_improved.json'), 'utf8'));
const CSS = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const JS = fs.readFileSync(path.join(__dirname, 'client.js'), 'utf8');

const NB = ' ';
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₸';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const low = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
const AR_NUM = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'];
const SEC_AR = { kitchen: 'مطبخ', drinks: 'مشروبات', desserts: 'حلويات' };
const PALETTES = [
  '--g1:#C8412C;--g2:#EAAA3C;--g3:#2A9D8F;--g4:#4A6BC0;--g5:#5FA34F',
  '--g1:#2A9D8F;--g2:#C8412C;--g3:#EAAA3C;--g4:#5FA34F;--g5:#4A6BC0',
  '--g1:#4A6BC0;--g2:#EAAA3C;--g3:#D9677A;--g4:#2A9D8F;--g5:#C8412C',
  '--g1:#EAAA3C;--g2:#5FA34F;--g3:#C8412C;--g4:#4A6BC0;--g5:#D9677A',
];
const pal = i => PALETTES[i % PALETTES.length];
const ICON = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

// ── Индекс всех позиций ──
const KEY = {};
const ITEMS = {};
for (const s of J.sections) for (const c of s.categories) for (const card of c.cards) for (const o of card.options) {
  KEY[o.key] = { card, o };
  ITEMS[o.key] = { n: card.title, l: o.label || '', p: o.price, o: !!o.outOfStock };
}
const mandiCat = J.sections[0].categories.find(c => c.id === 'mandi');
const UPS_TABLE = mandiCat.pairing.keys;
const UPS_MANDI = ['0-8-0', '0-8-1', '0-8-7'];

// ── Кусочки разметки ──
function addTray(key) {
  const k = KEY[key];
  return `<button type="button" class="add-tray" data-add data-key="${key}" aria-label="В поднос: ${esc(k.card.title)}${k.o.label ? ', ' + esc(k.o.label) : ''}, ${fmt(k.o.price)}">${ICON.plus}В поднос</button>`;
}
function addRound(key) {
  const k = KEY[key];
  if (k.o.outOfStock || k.o.price == null)
    return `<button type="button" class="add-round" data-key="${key}" disabled aria-label="${esc(k.card.title)} — нет в наличии">${ICON.plus}</button>`;
  return `<button type="button" class="add-round" data-add data-key="${key}" aria-label="В поднос: ${esc(k.card.title)}${k.o.label ? ', ' + esc(k.o.label) : ''}, ${fmt(k.o.price)}">${ICON.plus}</button>`;
}
function note(o) {
  if (!o.perPerson) return '';
  let s = `За персону — ${fmt(o.perPerson)}`;
  const v = o.perPersonVs;
  if (v && v.pct >= 5) s += `, на ${v.pct}${NB}% выгоднее, чем порция на ${v.basePersons}`;
  return s;
}
function searchText(card) {
  return low([card.title, card.desc, ...card.options.map(o => o.label)].join(' '));
}
function upsRow(keys, title) {
  return `<div class="ups"><p class="lbl">${title}</p><div class="ups-row">${keys.map(k => {
    const { card, o } = KEY[k];
    return `<button type="button" class="ups-btn" data-add data-ups data-key="${k}" aria-label="В поднос: ${esc(card.title)}, ${fmt(o.price)}"><span class="pl">${ICON.plus}</span>${esc(card.title)} <b>${fmt(o.price)}</b></button>`;
  }).join('')}</div></div>`;
}

function trayBtn(card, o, i) {
  const m = /^(\d+)\s*(.*)$/.exec(o.label || '') || [null, '•', o.label || ''];
  const size = o.persons >= 5 ? 3 : o.persons === 2 ? 2 : 1;
  const save = o.perPersonVs && o.perPersonVs.pct >= 5 ? `<span class="save" aria-hidden="true">−${o.perPersonVs.pct}${NB}%</span>` : '';
  const label = `${card.title}, ${o.label}, ${fmt(o.price)}${o.perPerson ? ', ' + fmt(o.perPerson) + ' за персону' : ''}`;
  return `<button type="button" class="opt tray" aria-pressed="${i === 0}" data-key="${o.key}" data-price="${o.price}" data-photo="${esc(o.photo || card.photo || '')}" data-note="${esc(note(o))}" aria-label="${esc(label)}">` +
    `<span class="plate s${size}" aria-hidden="true">${esc(m[1])}</span><span class="cap">${esc(m[2])}</span><span class="tp">${fmt(o.price)}</span>` +
    (o.perPerson ? `<span class="tpp">${fmt(o.perPerson)}/чел.</span>` : '') + save + `</button>`;
}

function winCard(card, i) {
  const opts = card.options;
  const first = opts[0];
  const minPrice = Math.min(...opts.map(o => o.price));
  const cook = (opts.find(o => o.cookingOptions) || {}).cookingOptions;
  const isPersons = opts.some(o => o.persons);
  const photo = first.photo || card.photo;
  return `<article class="win-card" data-card id="card-${card.id}" data-key="${first.key}" data-search="${esc(searchText(card))}">
<div class="window" style="${pal(i)}"><div class="qam" aria-hidden="true"></div>
<div class="win-photo"><img src="${photo}" data-ph alt="${esc(card.title)}" width="820" height="820" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
${card.badge ? `<span class="seal">${esc(card.badge)}</span>` : ''}
<div class="win-title"><h3>${esc(card.title)}</h3><span class="from">от ${fmt(minPrice)}</span></div></div></div>
<div class="win-body">
<p class="desc">${esc(card.desc)}</p>
<p class="lbl" id="lbl-${card.id}">${isPersons ? 'Размер подноса' : 'Порция'}</p>
<div class="trays" role="group" aria-labelledby="lbl-${card.id}">${opts.map((o, j) => trayBtn(card, o, j)).join('')}</div>
${cook ? `<p class="lbl" id="lbl-${card.id}-m">Способ приготовления</p><div class="meths" role="group" aria-labelledby="lbl-${card.id}-m">${cook.map((m, j) => `<button type="button" class="opt meth" aria-pressed="${j === 0}" data-meth="${esc(m)}">${esc(m[0].toUpperCase() + m.slice(1))}</button>`).join('')}</div>` : ''}
<p class="pp" data-pp-note aria-live="polite">${esc(note(first))}</p>
${cook ? '<p class="hint">Выбранный способ попадёт в ваш заказ — официант увидит его на экране «Показать официанту».</p>' : ''}
<div class="buy"><span class="price-big" data-price-out>${fmt(first.price)}</span><div data-act="tray">${addTray(first.key)}</div></div>
${card.upsellKeys ? upsRow(card.upsellKeys, 'Добавить к манди') : ''}
</div></article>`;
}

function pairing(p) {
  return `<div class="pairing" data-pair><h3>${esc(p.title)}</h3><p>${esc(p.subtitle)}</p><div class="pair-row">${p.keys.map((k, i) => {
    const { card, o } = KEY[k];
    const img = o.photo || card.photo;
    return `<div class="ptile">${img ? `<div class="pimg"><img src="${img}" alt="${esc(card.title)}" loading="lazy" decoding="async" width="300" height="208"></div>` : `<div class="pimg qam" style="${pal(i + 1)}" aria-hidden="true"></div>`}` +
      `<div class="pt">${esc(card.title)}${o.label ? `<span>${esc(o.label)}</span>` : ''}</div>` +
      `<div class="pb">${fmt(o.price)}<button type="button" class="add-round" data-add data-ups data-key="${k}" aria-label="В поднос: ${esc(card.title)}${o.label ? ', ' + esc(o.label) : ''}, ${fmt(o.price)}">${ICON.plus}</button></div></div>`;
  }).join('')}</div></div>`;
}

function pill(card, o, j) {
  return `<button type="button" class="opt pill" aria-pressed="${j === 0}" data-key="${o.key}" data-price="${o.price}" data-photo="${esc(o.photo || '')}" data-note="" aria-label="${esc(card.title + ', ' + o.label + ', ' + fmt(o.price))}"><span class="l">${esc(o.label)}</span><span class="p">${fmt(o.price)}</span></button>`;
}

function row(card, i) {
  const opts = card.options;
  const first = opts[0];
  const multi = opts.length > 1;
  const oos = !multi && (first.outOfStock || first.price == null);
  const thumb = card.photo
    ? `<div class="thumb"><img src="${card.photo}" data-ph alt="${esc(card.title)}" loading="lazy" decoding="async" width="300" height="375"></div>`
    : `<div class="thumb glass" style="${pal(i)}" aria-hidden="true"></div>`;
  return `<article class="row${oos ? ' out' : ''}" data-card id="card-${card.id}" data-key="${first.key}" data-search="${esc(searchText(card))}">${thumb}<div class="rb">
${card.badge ? `<span class="tag">${esc(card.badge)}</span>` : ''}<h3>${esc(card.title)}</h3>
${card.desc ? `<p class="desc">${esc(card.desc)}</p>` : ''}
${multi ? `<div class="pills" role="group" aria-label="Вариант: ${esc(card.title)}">${opts.map((o, j) => pill(card, o, j)).join('')}</div>` : (first.label ? `<p class="vol">${esc(first.label)}</p>` : '')}
<div class="buy"><span class="price" data-price-out>${first.price == null ? 'нет в наличии' : fmt(first.price)}</span><div data-act="round">${addRound(first.key)}</div></div>
</div></article>`;
}

function li(card) {
  const first = card.options[0];
  const oos = first.outOfStock || first.price == null;
  return `<li class="li${oos ? ' out' : ''}" data-card id="card-${card.id}" data-key="${first.key}" data-search="${esc(searchText(card))}">` +
    `<div class="li-main"><span class="nm">${esc(card.title)}</span>${first.label ? `<span class="vol">${esc(first.label)}</span>` : ''}${card.desc ? `<span class="ds">${esc(card.desc)}</span>` : ''}</div>` +
    `<span class="lead" aria-hidden="true"></span><span class="pr" data-price-out>${oos ? 'нет в наличии' : fmt(first.price)}</span><div data-act="round">${addRound(first.key)}</div></li>`;
}

function category(sec, c, idx) {
  let body;
  if (c.layout === 'feature') {
    const cards = c.cards.map((card, i) => winCard(card, i));
    if (c.pairing) cards.splice(2, 0, pairing(c.pairing));
    body = `<div class="mandi-grid">${cards.join('\n')}</div>` +
      (c.descriptionFull ? `<details class="story"><summary>Что такое манди</summary><div class="story-b">${c.cover ? `<img src="${c.cover}" alt="Манди на подносе с соусами" loading="lazy" width="96" height="120">` : ''}<p>${esc(c.descriptionFull)}</p></div></details>` : '');
  } else if (c.layout === 'list') {
    body = `<ul class="menu-list">${c.cards.map(li).join('')}</ul>`;
  } else {
    body = `<div class="rows">${c.cards.map((card, i) => row(card, i + idx)).join('\n')}</div>`;
  }
  return `<section class="cat" id="cat-${c.id}" data-sec="${sec.id}" aria-labelledby="h-${c.id}">
<header class="cat-h"><span class="num" aria-hidden="true">${AR_NUM[idx]}</span><div><h2 id="h-${c.id}">${esc(c.label)}</h2>${c.subtitle ? `<small>${esc(c.subtitle)}</small>` : ''}</div></header>
<div class="trim" aria-hidden="true"></div>
${c.lead ? `<p class="lead-t">${esc(c.lead)}</p>` : ''}
${c.cover && c.layout !== 'feature' ? `<div class="cover"><img src="${c.cover}" alt="" loading="lazy" decoding="async" width="900" height="450"></div>` : ''}
${body}
</section>`;
}

function section(s, si) {
  return `<section class="sec" id="sec-${s.id}" data-sec="${s.id}" aria-labelledby="st-${s.id}">
<div class="sec-banner"><div class="qam" style="${pal(si + 1)}" aria-hidden="true"></div><div class="lintel" aria-hidden="true"></div>
<h2 class="sec-title" id="st-${s.id}">${esc(s.label)}</h2><p class="sec-ar" aria-hidden="true" lang="ar">${SEC_AR[s.id] || ''}</p></div>
${s.categories.map((c, i) => category(s, c, i)).join('\n')}
</section>`;
}

// ── Силуэт старой Саны: башенные дома с окнами-камария ──
function skyline() {
  const W = 1200, H = 200;
  const towers = [
    [0, 90, 120], [84, 70, 150], [150, 110, 105], [255, 80, 175], [330, 120, 130], [445, 90, 190],
    [530, 130, 150], [655, 80, 120], [730, 105, 182], [830, 90, 140], [915, 120, 165], [1030, 80, 115], [1105, 95, 150],
  ];
  const glass = ['#C8412C', '#EAAA3C', '#2A9D8F', '#4A6BC0', '#5FA34F', '#D9677A'];
  let out = '', n = 0;
  towers.forEach(([x, w, h], t) => {
    const y = H - h;
    const fill = t % 2 ? '#3B2317' : '#33200F';
    out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    // зубцы на крыше
    for (let cx = x + 4; cx < x + w - 6; cx += 12) out += `<path d="M${cx} ${y} l4 -7 l4 7z" fill="#F4E8D6" opacity=".85"/>`;
    // гипсовые пояса
    for (let by = y + 26; by < H - 20; by += 44) {
      out += `<rect x="${x}" y="${by}" width="${w}" height="2" fill="#F4E8D6" opacity=".55"/>`;
      let zz = `M${x} ${by + 9}`;
      for (let zx = x; zx < x + w; zx += 8) zz += ` L${zx + 4} ${by + 4} L${Math.min(zx + 8, x + w)} ${by + 9}`;
      out += `<path d="${zz}" fill="none" stroke="#F4E8D6" stroke-width="1" opacity=".35"/>`;
    }
    // окна
    const cols = Math.max(1, Math.floor(w / 42));
    for (let wy = y + 36; wy < H - 26; wy += 44) {
      for (let c = 0; c < cols; c++) {
        const wx = x + (w / cols) * (c + 0.5) - 7;
        const g1 = glass[(t + c + wy) % glass.length], g2 = glass[(t + c + wy + 2) % glass.length], g3 = glass[(t + c + wy + 4) % glass.length];
        const delay = ((n++ * 0.73) % 5).toFixed(2);
        out += `<g class="w" style="animation-delay:-${delay}s">` +
          `<path d="M${wx} ${wy} a7 7 0 0 1 4.67 -6.6 L${wx + 7} ${wy}z" fill="${g1}"/>` +
          `<path d="M${wx + 4.67} ${wy - 6.6} a7 7 0 0 1 4.66 0 L${wx + 7} ${wy}z" fill="${g2}"/>` +
          `<path d="M${wx + 9.33} ${wy - 6.6} a7 7 0 0 1 4.67 6.6 L${wx + 7} ${wy}z" fill="${g3}"/>` +
          `<rect x="${wx}" y="${wy}" width="14" height="12" fill="#F2C46B" opacity=".55"/></g>` +
          `<path d="M${wx - 1.5} ${wy + 12.5} V${wy} a8.5 8.5 0 0 1 17 0 V${wy + 12.5}z" fill="none" stroke="#F4E8D6" stroke-width="1.4"/>`;
      }
    }
  });
  return `<svg class="skyline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${out}</svg>`;
}

// ── Страница ──
const meta = J.meta;
const chips = J.sections.flatMap(s => s.categories.map(c => `<a class="chip${s.id === 'kitchen' ? '' : ' off'}" href="#cat-${c.id}" data-sec="${s.id}">${esc(c.chip || c.label)}</a>`)).join('');
const tabs = J.sections.map((s, i) => `<a class="tab${i === 0 ? ' on' : ''}" href="#sec-${s.id}" data-sec="${s.id}"${i === 0 ? ' aria-current="true"' : ''}>${esc(s.label)}</a>`).join('');
const data = { items: ITEMS, upsMandi: UPS_MANDI, upsTable: UPS_TABLE };
const fontAr = 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@700&display=swap&text=' + encodeURIComponent('مطبخمشروباتحلوياتمندي١٢٣٤٥٦٧٨٩٠');

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Mandi Center — меню</title>
<meta name="description" content="Меню Mandi Center: манди на 1, 2 и 5 персон, карак, лимонады и десерты. Арабская халяльная кухня в Астане.">
<meta name="theme-color" content="#1A100A">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;600;700;800&display=swap" rel="stylesheet">
<link href="${fontAr}" rel="stylesheet">
<style>
${CSS}
</style>
</head>
<body>
<header class="hero">
<span class="hero-ar" aria-hidden="true" lang="ar">مندي</span>
<div class="hero-in"><div>
<p class="kicker">Йеменская кухня · Астана</p>
<h1 class="brand">${esc(meta.brand)}</h1>
<ul class="hero-meta"><li class="halal">${esc(meta.halalNote)}</li><li>${esc(meta.hours.replace('Ежедневно, ', ''))}</li></ul>
</div><button type="button" class="icon-btn" id="search-toggle" aria-label="Поиск по меню" aria-expanded="false" aria-controls="searchbar">${ICON.search}</button></div>
${skyline()}
</header>
<div class="searchbar" id="searchbar" hidden><label class="sr-only" for="q">Поиск по меню</label><input id="q" type="search" placeholder="Найти блюдо или напиток" autocomplete="off"></div>
<nav class="stick" id="stick" aria-label="Разделы меню"><div class="tabs">${tabs}</div><div class="chips" id="chips">${chips}</div></nav>
<main class="wrap" id="main">
<p class="nothing" id="nothing" hidden>Ничего не нашлось. Попробуйте другое слово.</p>
${J.sections.map(section).join('\n')}
</main>
<footer class="about"><div class="about-in">
<h2>О ресторане</h2>
<p>${esc(meta.cuisine)}. ${esc(meta.halalNote)}.</p>
<p>${esc(meta.address)} · ${esc(meta.hours)}</p>
<p>О составе блюд и аллергенах спросите официанта.</p>
<div class="links"><a class="main" href="tel:${esc(meta.links.phone)}">Позвонить</a><a href="${esc(meta.links.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a><a href="${esc(meta.links.instagram)}" target="_blank" rel="noopener">Instagram</a><a href="${esc(meta.links.twogis)}" target="_blank" rel="noopener">2ГИС</a></div>
</div></footer>
<div class="sr-only" id="live" role="status" aria-live="polite"></div>
<div class="traybar" id="traybar" hidden><button type="button" class="traybtn" id="open-tray" aria-haspopup="dialog" aria-controls="sheet"><span class="cnt">0</span><span class="t">Ваш поднос</span><span class="sum"></span></button></div>
<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" hidden><div class="sheet-bg" data-close></div>
<div class="panel"><div class="panel-h"><h2 id="sheet-h">Ваш поднос</h2><button type="button" class="icon-btn" id="close" aria-label="Закрыть">${ICON.close}</button></div>
<ul class="lines" id="lines"></ul><div class="sheet-ups" id="sheet-ups" hidden></div>
<div class="panel-f"><div class="total"><span>Итого</span><span id="sheet-total">0${NB}₸</span></div>
<p>Список хранится только на этом телефоне и никуда не отправляется. Когда будете готовы заказать, нажмите «Показать официанту».</p>
<div class="panel-actions"><button type="button" class="btn-ghost" id="clear">Очистить</button><button type="button" class="btn-main" id="show-waiter">Показать официанту</button></div></div></div></div>
<div class="waiter" id="waiter" role="dialog" aria-modal="true" aria-labelledby="waiter-h" hidden>
<div class="w-top"><button type="button" class="icon-btn" id="waiter-close" aria-label="Закрыть">${ICON.close}</button></div>
<div class="receipt"><p class="r-brand">${esc(meta.brand)}</p><h2 id="waiter-h">Заказ к столу</h2><div class="r-trim" aria-hidden="true"></div>
<ol class="r-lines" id="w-lines"></ol><div class="r-total"><span>Итого</span><span id="w-total"></span></div>
<p class="r-note">Покажите этот экран официанту</p></div></div>
<script type="application/json" id="menu-data">${JSON.stringify(data)}</script>
<script>
${JS}
</script>
</body>
</html>
`;
const out = path.join(ROOT, 'menu_v2.html');
fs.writeFileSync(out, html);
console.log('menu_v2.html:', (html.length / 1024).toFixed(0), 'КБ, позиций', Object.keys(ITEMS).length);
