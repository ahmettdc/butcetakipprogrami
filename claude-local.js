/* Yerel "window.claude" telafisi.
   Gerçek AI bağlantısı olmadığında, yapıştırılan harcama metnini
   basit kurallarla ayıklayıp aynı JSON biçiminde döndürür.
   (PDF/fotoğraf görüntülerini yerelde okuyamaz — bunlar için AI gerekir.) */
(function () {
  if (window.claude && window.claude.complete) return;

  var KW = [
    [/(migros|a101|a-101|bim|şok|sok|carrefour|market|tarım kredi|macrocenter|metro market)/i, "Market"],
    [/(manav|kasap|sebze|meyve|et\b|balık)/i, "Manav / Kasap"],
    [/(damacana|su\b|içecek|icecek|pınar su|erikli|hayat su)/i, "Su & İçecek"],
    [/(restoran|kafe|cafe|starbucks|kahve|lokanta|burger|pizza|dominos|mcdonald|kfc|börek)/i, "Restoran / Kafe"],
    [/(getir|yemeksepeti|trendyol yemek|gofody|sipariş|siparis|fuudy)/i, "Sipariş"],
    [/(shell|opet|bp\b|petrol ofis|total|po\b|akaryakıt|akaryakit|benzin|motorin|lukoil|aytemiz)/i, "Akaryakıt"],
    [/(otopark|park\b|hgs|ogs|köprü|kopru|otoyol)/i, "Otopark & HGS"],
    [/(otobüs|metro\b|taksi|uber|bitaksi|iett|ego\b|marti|martı|scooter|ulaşım|ulasim|bilet)/i, "Toplu Taşıma / Taksi"],
    [/(eczane|pharmacy|ecza)/i, "Eczane"],
    [/(doktor|hastane|tahlil|laboratuvar|klinik|mr\b|tomografi|diş|dis hekim)/i, "Doktor & Tahlil"],
    [/(netflix|spotify|youtube|disney|exxen|blutv|amazon prime|abonelik|icloud|storage|gain\b)/i, "Dijital Abonelik"],
    [/(sinema|tiyatro|konser|oyun|steam|playstation|eğlence|eglence|hobi|bilet ix|passo)/i, "Eğlence & Hobi"],
    [/(zara|lcw|lc waikiki|mavi|koton|defacto|mango|boyner|h&m|hm\b|pull|bershka|giyim|tekstil)/i, "Giyim"],
    [/(ayakkabı|ayakkabi|çanta|canta|aksesuar|flo\b|nike|adidas|sneaks|deichmann)/i, "Ayakkabı & Aksesuar"],
    [/(enerjisa|bedaş|bedas|ayedaş|elektrik|ck\b)/i, "Elektrik"],
    [/(iski|aski|su fatura|suyu)/i, "Su"],
    [/(doğalgaz|dogalgaz|igdaş|igdas|gaz\b|başkentgaz)/i, "Doğalgaz"],
    [/(ttnet|türk telekom|turk telekom|superonline|fiber|internet|d-smart net)/i, "İnternet"],
    [/(turkcell|vodafone|gsm|hat\b|telefon|bimcell)/i, "Telefon"],
    [/(kredi kartı|kredi karti|asgari|ekstre|nakit avans)/i, "Beklenmeyen Giderler"]
  ];

  function guessSub(desc) {
    for (var i = 0; i < KW.length; i++) if (KW[i][0].test(desc)) return KW[i][1];
    return "Beklenmeyen Giderler";
  }

  function parseAmount(tok) {
    if (!tok) return 0;
    var s = String(tok).replace(/\s/g, "");
    // 1.234,56 -> 1234.56 ; 1234,56 -> 1234.56 ; 1.234 -> 1234
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    var n = parseFloat(s);
    return isNaN(n) ? 0 : Math.abs(n);
  }

  function parseLine(line) {
    var raw = line.trim();
    if (!raw || raw.length < 3) return null;
    // tarih
    var dm = raw.match(/\b(\d{1,2})[.\/](\d{1,2})(?:[.\/]\d{2,4})?\b/);
    var date = dm ? (dm[1].padStart(2, "0") + "." + dm[2].padStart(2, "0")) : "";
    // para: TL/₺ öncesi ya da son sayısal jeton
    var money = raw.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d{3,})\s*(?:tl|try|₺)?/gi);
    if (!money || !money.length) return null;
    var amtTok = money[money.length - 1].replace(/\s*(tl|try|₺)/i, "");
    var amount = parseAmount(amtTok);
    if (!amount) return null;
    // açıklama: tarih ve tutar çıkarılmış hali
    var desc = raw;
    if (dm) desc = desc.replace(dm[0], " ");
    desc = desc.replace(money[money.length - 1], " ").replace(/\b(tl|try|₺)\b/gi, " ");
    desc = desc.replace(/\s+/g, " ").trim();
    if (!desc) desc = "Harcama";
    desc = desc.slice(0, 60);
    return { date: date, desc: desc, amount: amount, sub: guessSub(desc) };
  }

  function extractText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.filter(function (c) { return c && c.type === "text"; })
        .map(function (c) { return c.text || ""; }).join("\n");
    }
    return "";
  }

  window.claude = {
    complete: function (params) {
      return new Promise(function (resolve) {
        var content = params && params.messages && params.messages[0] ? params.messages[0].content : "";
        var text = extractText(content);
        // "Harcama metni:" sonrası kısmı al
        var m = text.split(/Harcama metni:\s*/i);
        var body = m.length > 1 ? m.slice(1).join("\n") : text;
        var lines = body.split(/\r?\n/);
        var out = [];
        lines.forEach(function (ln) { var r = parseLine(ln); if (r) out.push(r); });
        // görüntü verildi ama metin çıkmadıysa boş döndür (AI gerekir)
        setTimeout(function () { resolve(JSON.stringify(out)); }, 150);
      });
    }
  };
})();
