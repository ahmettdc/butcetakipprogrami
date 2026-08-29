/* Başlangıç verisi — Excel'den (butceyillik.xlsx) aktarıldı.
   Yalnızca ilk açılışta localStorage boşsa yüklenir; sonra kullanıcı düzenler. */
window.SEED_DATA = {
  version: 1,
  people: ["AHMET", "ELİF"],
  incomeItems: ["Temel Maaş", "Sabit Ek Ödeme", "Teşvik", "Nöbet & İcap"],

  // Gider kategorileri ve alt kalemleri
  categories: [
    { id: "konut", name: "Konut", icon: "🏠", subs: ["Ev Kredisi", "Aidat"] },
    { id: "faturalar", name: "Faturalar", icon: "💡", subs: ["Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon"] },
    { id: "krediKarti", name: "Kredi Kartı", icon: "💳", subs: ["Kredi Kartı 1 (Elif)", "Kredi Kartı 2 (Ziraat)", "Kredi Kartı 3 (Vakıf)", "Kredi Kartı 4 (YapıKredi)"] },
    { id: "bakici", name: "Bakıcı", icon: "👶", subs: ["Bakıcı Parası"] },
    { id: "egitim", name: "Eğitim", icon: "🎓", subs: ["KYK Ödemesi", "Dershane"] },
    { id: "arac", name: "Araç", icon: "🚗", subs: ["Servis/Bakım"] },
    { id: "vergiler", name: "Vergiler", icon: "🏛️", subs: ["MTV", "Ev Vergisi"] },
    { id: "diger", name: "Diğer", icon: "📦", subs: ["Beklenmeyen Giderler"] }
  ],
  // Birikim/Yatırım kalemleri (aylık bütçede ayrı bölüm)
  savingsItems: ["Birikim", "Acil Durum Fonu", "Yatırım Fonu"],

  // Aylık veriler (YYYY-MM)
  months: {
    "2026-06": {
      carryover: 62689.14,
      income: {
        "Temel Maaş": { "AHMET": 95947.87, "ELİF": 86471.4 },
        "Sabit Ek Ödeme": { "AHMET": 42861.64, "ELİF": 32384.34 },
        "Teşvik": { "AHMET": 44042.9, "ELİF": 20307.62 },
        "Nöbet & İcap": { "AHMET": 9123.31, "ELİF": 0 }
      },
      expenses: {
        "Ev Kredisi": 87000, "Aidat": 3000,
        "Elektrik": 475, "Su": 425.37, "Doğalgaz": 557.73, "İnternet": 1000, "Telefon": 447.08,
        "Kredi Kartı 1 (Elif)": 32434.01, "Kredi Kartı 2 (Ziraat)": 66195.99, "Kredi Kartı 3 (Vakıf)": 55685.72, "Kredi Kartı 4 (YapıKredi)": 17716.5,
        "Bakıcı Parası": 33000,
        "KYK Ödemesi": 470, "Dershane": 18570,
        "Servis/Bakım": 0,
        "MTV": 0, "Ev Vergisi": 0,
        "Beklenmeyen Giderler": 11500
      },
      savings: { "Birikim": 0, "Acil Durum Fonu": 0, "Yatırım Fonu": 0 }
    },
    "2026-07": {
      carryover: 66301.87,
      income: {
        "Temel Maaş": { "AHMET": 114415.41, "ELİF": 96242.75 },
        "Sabit Ek Ödeme": { "AHMET": 42861.64, "ELİF": 32384.34 },
        "Teşvik": { "AHMET": 66445.2, "ELİF": 19863.87 },
        "Nöbet & İcap": { "AHMET": 14544.48, "ELİF": 0 }
      },
      expenses: {
        "Ev Kredisi": 87000, "Aidat": 3000,
        "Elektrik": 545, "Su": 541.74, "Doğalgaz": 685.48, "İnternet": 1000, "Telefon": 447.08,
        "Kredi Kartı 1 (Elif)": 49200, "Kredi Kartı 2 (Ziraat)": 85275, "Kredi Kartı 3 (Vakıf)": 31275.7, "Kredi Kartı 4 (YapıKredi)": 18643.18,
        "Bakıcı Parası": 36000,
        "KYK Ödemesi": 470, "Dershane": 18570,
        "Servis/Bakım": 0,
        "MTV": 4681, "Ev Vergisi": 0,
        "Beklenmeyen Giderler": 26400
      },
      savings: { "Birikim": 0, "Acil Durum Fonu": 0, "Yatırım Fonu": 0 }
    },
    "2026-08": {
      carryover: 96193.35,
      income: {
        "Temel Maaş": { "AHMET": 109720.59, "ELİF": 96569.17 },
        "Sabit Ek Ödeme": { "AHMET": 48656.57, "ELİF": 36762.73 },
        "Teşvik": { "AHMET": 80422.74, "ELİF": 27893.92 },
        "Nöbet & İcap": { "AHMET": 17411.45, "ELİF": 0 }
      },
      expenses: {
        "Ev Kredisi": 87000, "Aidat": 4500,
        "Elektrik": 609, "Su": 493.18, "Doğalgaz": 0, "İnternet": 1000, "Telefon": 0,
        "Kredi Kartı 1 (Elif)": 53933.54, "Kredi Kartı 2 (Ziraat)": 86595.24, "Kredi Kartı 3 (Vakıf)": 21138.44, "Kredi Kartı 4 (YapıKredi)": 22275.85,
        "Bakıcı Parası": 36000,
        "KYK Ödemesi": 470, "Dershane": 18570,
        "Servis/Bakım": 0,
        "MTV": 0, "Ev Vergisi": 0,
        "Beklenmeyen Giderler": 10000
      },
      savings: { "Birikim": 173000, "Acil Durum Fonu": 0, "Yatırım Fonu": 0 }
    }
  },

  // Kredi kartı taksitleri
  installmentCards: [
    { id: "ziraat", name: "Ziraat Bankası", color: "#1e5fbf" },
    { id: "vakif", name: "VakıfBank", color: "#8b5cf6" },
    { id: "yapikredi", name: "Yapı Kredi", color: "#dc2626" },
    { id: "elif", name: "Elif", color: "#16a34a" }
  ],
  installments: [
    // Ziraat
    { card: "ziraat", desc: "Amazon (IYZICO)", total: 116982.66, count: 9, monthly: 12998.07, start: "2026-01" },
    { card: "ziraat", desc: "Sompo Japan (Sigorta)", total: 8739.01, count: 3, monthly: 2913, start: "2026-02" },
    { card: "ziraat", desc: "Sompo Japan (Sigorta)", total: 8396.1, count: 3, monthly: 2798.7, start: "2026-02" },
    { card: "ziraat", desc: "Brisa (SanalPOS)", total: 6200, count: 5, monthly: 1240, start: "2026-03" },
    { card: "ziraat", desc: "SGK Ödeme (Sonradan Taksit)", total: 12138.53, count: 4, monthly: 3034.63, start: "2026-04" },
    { card: "ziraat", desc: "Global Design (Sonradan Taksit)", total: 12000, count: 4, monthly: 3000, start: "2026-04" },
    { card: "ziraat", desc: "Adil Işık", total: 5999.95, count: 3, monthly: 1999.99, start: "2026-07" },
    { card: "ziraat", desc: "A City Ankara Outlet", total: 9988.2, count: 4, monthly: 2497.05, start: "2026-07" },
    { card: "ziraat", desc: "Macun Ford Servis", total: 16886.68, count: 3, monthly: 5628.9, start: "2026-07" },
    { card: "ziraat", desc: "Sompo Japan (Sigorta)", total: 8704.96, count: 3, monthly: 2901.66, start: "2026-07" },
    { card: "ziraat", desc: "Sompo Japan (Sigorta)", total: 14113.94, count: 3, monthly: 4704.66, start: "2026-07" },
    { card: "ziraat", desc: "ETSTUR (Ziraat)", total: 54000, count: 6, monthly: 9000, start: "2026-08" },
    // VakıfBank
    { card: "vakif", desc: "Sompo Sigorta AŞ", total: 15524, count: 8, monthly: 1940.5, start: "2025-07" },
    { card: "vakif", desc: "hbomax.com (İyzico)", total: 2298, count: 12, monthly: 191.5, start: "2025-10" },
    { card: "vakif", desc: "MediaMarkt (Sanal)", total: 10599, count: 3, monthly: 3533, start: "2026-01" },
    { card: "vakif", desc: "Idefix.com", total: 6498, count: 4, monthly: 1624.5, start: "2026-01" },
    { card: "vakif", desc: "Amazon.com.tr (İyzico)", total: 6999, count: 6, monthly: 1166.5, start: "2026-01" },
    { card: "vakif", desc: "Setur Servis Turistik", total: 39921, count: 3, monthly: 13307, start: "2026-05" },
    { card: "vakif", desc: "MediaMarkt (Ankara)", total: 8797.5, count: 3, monthly: 2932.5, start: "2026-05" },
    // Yapı Kredi
    { card: "yapikredi", desc: "HepsiBurada (29.11.25)", total: 69499, count: 9, monthly: 7722.11, start: "2025-12" },
    { card: "yapikredi", desc: "HepsiBurada (24.12.25)", total: 25885.8, count: 9, monthly: 2876.2, start: "2026-01" },
    { card: "yapikredi", desc: "HepsiBurada (09.02.26)", total: 1756.82, count: 3, monthly: 585.61, start: "2026-03" },
    { card: "yapikredi", desc: "HepsiBurada (15.05.26)", total: 42709.24, count: 6, monthly: 7118.2, start: "2026-06" },
    { card: "yapikredi", desc: "HepsiBurada (22.07.26)", total: 23015.35, count: 7, monthly: 3287.91, start: "2026-08" },
    // Elif
    { card: "elif", desc: "ETSTUR (Tatil)", total: 73150, count: 3, monthly: 24383.33, start: "2026-03" },
    { card: "elif", desc: "Mango (Armada)", total: 3402.99, count: 2, monthly: 1701.5, start: "2026-02" },
    { card: "elif", desc: "Mavi (Forum)", total: 5199.97, count: 4, monthly: 1299.99, start: "2026-03" },
    { card: "elif", desc: "Antares Gülsa (Sonradan Taksit)", total: 3463.85, count: 4, monthly: 865.96, start: "2026-05" }
  ],

  // Birikim / Altın portföyü
  gold: {
    // Alım defteri
    purchases: [
      { date: "2026-08-19", type: "Külçe Altın", amount: 10, cost: 68000 },
      { date: "2026-08-20", type: "Külçe Altın", amount: 15, cost: 103500 }
    ],
    // Güncel birim fiyatlar (₺) — kullanıcı elle günceller
    prices: {
      "Çeyrek": 0, "Yarım": 0, "Ata / Tam": 0,
      "22 Ayar Gram": 0, "24 Ayar Gram": 0, "Külçe Altın": 0
    },
    // Aylık nakit akışı (para birikimi / altına harcanan)
    monthlyFlow: {
      "2026-06": { saved: 0, gold: 0 },
      "2026-07": { saved: 0, gold: 0 },
      "2026-08": { saved: 173000, gold: 171500 }
    }
  }
};
