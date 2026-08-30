/* Altın fiyat GEÇMİŞİ (endeks) üretir -> gold-history.json
   Kaynak: COMEX altın (USD/ons, Yahoo) × USD/TRY (frankfurter) = gram altın TL seyri.
   Sonuç, bugünkü değere göre normalize edilmiş bir ENDEKS'tir; uygulama bunu
   bugünkü gerçek altinkaynak fiyatlarıyla çarparak geçmiş portföy değerini bulur.
   Böylece bugünkü değerler birebir gerçek fiyatla, geçmiş ise doğru seyirle çizilir. */
const fs = require("fs");
const path = require("path");
const UA = "Mozilla/5.0 (compatible; ButceBot/1.0)";
const OZ_TO_GRAM = 31.1034768;

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
  return r.json();
}
const iso = ts => new Date(ts * 1000).toISOString().slice(0, 10);

(async () => {
  // 1) Altın ons (USD) günlük kapanış — 5 yıl
  const gc = await getJson("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=5y&interval=1d");
  const res = gc.chart && gc.chart.result && gc.chart.result[0];
  if (!res) throw new Error("altın geçmişi alınamadı");
  const ts = res.timestamp || [];
  const close = (res.indicators.quote[0] || {}).close || [];
  const gold = [];
  for (let i = 0; i < ts.length; i++) if (close[i] != null) gold.push([iso(ts[i]), close[i]]);
  if (gold.length < 100) throw new Error("altın geçmişi yetersiz: " + gold.length);

  // 2) USD/TRY günlük — aynı aralık
  const start = gold[0][0], end = gold[gold.length - 1][0];
  const fx = await getJson("https://api.frankfurter.dev/v1/" + start + ".." + end + "?base=USD&symbols=TRY");
  const rates = fx.rates || {};
  const fxDates = Object.keys(rates).sort();
  if (!fxDates.length) throw new Error("USD/TRY geçmişi alınamadı");

  // 3) Birleştir (kur yoksa en son bilinen kuru taşı)
  const series = [];
  let fi = 0, lastFx = rates[fxDates[0]].TRY;
  for (const [d, oz] of gold) {
    while (fi < fxDates.length && fxDates[fi] <= d) { lastFx = rates[fxDates[fi]].TRY; fi++; }
    series.push([d, (oz / OZ_TO_GRAM) * lastFx]);   // gram altın, TL
  }

  // 4) Bugüne göre endeksle
  const latest = series[series.length - 1][1];
  if (!latest) throw new Error("son değer sıfır");
  const points = series.map(([d, v]) => [d, Math.round(v / latest * 10000) / 10000]);

  const out = {
    updated: new Date().toISOString(),
    note: "Endeks: gram altın TL seyri, son gün = 1. Uygulama bugünkü gerçek fiyatlarla çarpar.",
    modelGramTRY: Math.round(latest * 100) / 100,
    points: points
  };
  fs.writeFileSync(path.join(__dirname, "..", "gold-history.json"), JSON.stringify(out) + "\n");
  console.log("gold-history.json yazıldı:", points.length, "nokta,", points[0][0], "→", points[points.length - 1][0], "| model gram:", out.modelGramTRY);
})().catch(e => { console.error("HATA:", e.message); process.exit(1); });
