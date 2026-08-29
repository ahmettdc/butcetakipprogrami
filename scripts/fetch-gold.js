/* altinkaynak.com canlı verisinden altın ALIŞ fiyatlarını çeker,
   uygulamanın altın türlerine eşleyip gold-prices.json üretir.
   GitHub Actions'ta (sunucuda) çalışır — CORS yok. */
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (compatible; ButceBot/1.0)";

// altinkaynak Kod -> uygulama türü (Alış fiyatı kullanılır)
const GOLD_MAP = {
  "Çeyrek": "C",
  "Yarım": "Y",
  "Ata / Tam": "A_T",
  "22 Ayar Gram": "B",
  "24 Ayar Gram": "GA",
  "Külçe Altın": "CH"
};

function trNum(s) {
  if (s == null) return 0;
  var t = String(s).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  var n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
  return r.json();
}

(async () => {
  const gold = await getJson("https://static.altinkaynak.com/Gold");
  const byCode = {};
  gold.forEach(function (x) { byCode[x.Kod] = x; });

  const prices = {};
  Object.keys(GOLD_MAP).forEach(function (type) {
    const rec = byCode[GOLD_MAP[type]];
    const v = rec ? trNum(rec.Alis) : 0;
    if (v) prices[type] = Math.round(v * 100) / 100;
  });
  if (!Object.keys(prices).length) throw new Error("Altın fiyatı ayrıştırılamadı");

  // Döviz (USD/EUR) — varsa
  let usd = 0, eur = 0, dateLabel = "";
  try {
    const cur = await getJson("https://static.altinkaynak.com/Currency");
    const c = {};
    cur.forEach(function (x) { c[x.Kod] = x; });
    if (c.USD) usd = trNum(c.USD.Alis);
    if (c.EUR) eur = trNum(c.EUR.Alis);
  } catch (e) {}

  // Güncellenme zamanı (altinkaynak'tan)
  const anyRec = byCode["GA"] || gold[0];
  if (anyRec && anyRec.GuncellenmeZamani) dateLabel = anyRec.GuncellenmeZamani;

  const out = {
    source: "altinkaynak",
    updated: new Date().toISOString(),
    dateLabel: dateLabel,
    prices: prices
  };
  if (usd) out.usd = Math.round(usd * 100) / 100;
  if (eur) out.eur = Math.round(eur * 100) / 100;

  const file = path.join(__dirname, "..", "gold-prices.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log("yazıldı gold-prices.json:", JSON.stringify(out));
})().catch(function (e) { console.error("HATA:", e.message); process.exit(1); });
