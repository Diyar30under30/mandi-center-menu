// Сверка: улучшенное меню против оригинала по ключам позиций.
// Запуск: node check_prices.js
const fs = require('fs');
const orig = JSON.parse(fs.readFileSync('menu_data.json', 'utf8'));
const impr = JSON.parse(fs.readFileSync('menu_improved.json', 'utf8'));
const htmlFile = process.argv[2] || 'menu_improved.html'; // например: node check_prices.js menu_v2.html
const html = fs.readFileSync(htmlFile, 'utf8');
console.log(`Проверяю ${htmlFile}`);

const origItems = new Map();
for (const g of orig.groups) for (const c of g.cats) for (const i of c.items) origItems.set(i.key, i);

// Собираем из improved все объекты, у которых есть key вида "0-0-0"
const found = [];
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    if (typeof o.key === 'string' && /^\d+-\d+-\d+$/.test(o.key)) found.push(o);
    Object.values(o).forEach(walk);
  }
})(impr);

const errors = [];
const seen = new Map();
for (const f of found) seen.set(f.key, (seen.get(f.key) || 0) + 1);
for (const [k, n] of seen) if (n > 1) errors.push(`Ключ ${k} встречается ${n} раз`);
for (const k of seen.keys()) if (!origItems.has(k)) errors.push(`Лишний ключ ${k}, его нет в оригинале`);

let sumO = 0, sumI = 0;
for (const [k, o] of origItems) {
  sumO += o.price || 0;
  const f = found.find(x => x.key === k);
  if (!f) { errors.push(`Нет позиции ${k} «${o.name}» ${o.variant}`); continue; }
  const p = f.price === undefined ? null : f.price;
  sumI += p || 0;
  if (p !== o.price) errors.push(`Цена изменена: ${k} «${o.name}» ${o.variant}: было ${o.price}, стало ${p}`);
  if (!!f.outOfStock !== o.outOfStock) errors.push(`Статус «нет в наличии» изменён: ${k} «${o.name}»`);
  if (!new RegExp(`data-key=["']${k}["']`).test(html)) errors.push(`В HTML нет data-key="${k}" («${o.name}» ${o.variant})`);
}

console.log(`Позиций в оригинале: ${origItems.size}, найдено в улучшенном: ${seen.size}`);
console.log(`Сумма цен: оригинал ${sumO}, улучшенное ${sumI}`);
if (errors.length) { console.log(`ОШИБОК: ${errors.length}`); errors.forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('OK: все позиции на месте, ни одна цена не изменилась, статусы наличия сохранены, все data-key есть в HTML.');
