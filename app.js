/* Bütçe Takip Programı — hane bütçesi, taksitler ve altın birikimi.
   Veriler yalnızca tarayıcıda (localStorage) saklanır. */
(function () {
  "use strict";

  var STORAGE_KEY = "butce_takip_v2";
  var THEME_KEY = "butce_takip_tema";

  var TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var fmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmt0 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
  function money(n) { return fmt.format(+n || 0); }
  function money0(n) { return fmt0.format(+n || 0); }
  function num(v) { var n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; }

  function monthLabel(key) { var p = key.split("-"); return TR_MONTHS[+p[1] - 1] + " " + p[0]; }
  function monthIndex(key) { var p = key.split("-"); return (+p[0]) * 12 + (+p[1] - 1); }
  function indexToKey(idx) { var y = Math.floor(idx / 12); var m = idx % 12; return y + "-" + String(m + 1).padStart(2, "0"); }
  function todayMonth() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function todayDate() { return new Date().toISOString().slice(0, 10); }

  // Güncel altın fiyatları (truncgil v4, ücretsiz, CORS açık)
  var GOLD_API = "https://finans.truncgil.com/v4/today.json";
  var PRICE_DATE_KEY = "butce_altin_fiyat_tarih";
  var GOLD_MAP = {
    "Çeyrek": "CEYREKALTIN",
    "Yarım": "YARIMALTIN",
    "Ata / Tam": "ATAALTIN",
    "22 Ayar Gram": "YIA",
    "24 Ayar Gram": "GRA",
    "Külçe Altın": "GRA"
  };
  function fetchGoldPrices(manual) {
    var info = $("#priceInfo");
    if (manual && info) info.textContent = "Fiyatlar güncelleniyor…";
    return fetch(GOLD_API, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      var updated = 0;
      Object.keys(GOLD_MAP).forEach(function (type) {
        var rec = d[GOLD_MAP[type]];
        var val = rec && (rec.Selling != null ? rec.Selling : rec.Buying);
        if (val) { state.gold.prices[type] = Math.round(+val * 100) / 100; updated++; }
      });
      state.gold.priceUpdate = d.Update_Date || todayDate();
      save();
      try { localStorage.setItem(PRICE_DATE_KEY, todayDate()); } catch (e) {}
      var act = document.querySelector(".tab.active");
      if (act && act.dataset.tab === "birikim") renderGold();
      return updated;
    }).catch(function () {
      if (manual && info) info.textContent = "⚠️ Fiyatlar alınamadı (internet yok veya kaynak yanıt vermedi). Elle girebilirsiniz.";
      return 0;
    });
  }
  function maybeAutoUpdatePrices() {
    var last = null; try { last = localStorage.getItem(PRICE_DATE_KEY); } catch (e) {}
    if (last !== todayDate()) fetchGoldPrices(false);
  }

  // --- Durum ---
  var state = null;
  var selectedMonth = null;

  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return deepCopy(window.SEED_DATA);
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }

  function monthKeys() { return Object.keys(state.months).sort(); }

  function emptyMonth() {
    var m = { carryover: 0, income: {}, expenses: {}, savings: {} };
    state.incomeItems.forEach(function (it) { m.income[it] = {}; state.people.forEach(function (p) { m.income[it][p] = 0; }); });
    state.categories.forEach(function (c) { c.subs.forEach(function (s) { m.expenses[s] = 0; }); });
    state.savingsItems.forEach(function (s) { m.savings[s] = 0; });
    return m;
  }

  // === Hesaplamalar ===
  function calcMonth(key) {
    var m = state.months[key];
    if (!m) return null;
    var sumP = {}; state.people.forEach(function (p) { sumP[p] = 0; });
    state.incomeItems.forEach(function (it) {
      state.people.forEach(function (p) { sumP[p] += (m.income[it] && +m.income[it][p]) || 0; });
    });
    var totalIncome = 0; state.people.forEach(function (p) { totalIncome += sumP[p]; });
    var kaynak = totalIncome + (+m.carryover || 0);
    var totalExpense = 0;
    Object.keys(m.expenses).forEach(function (k) { totalExpense += +m.expenses[k] || 0; });
    var totalSavings = 0;
    Object.keys(m.savings).forEach(function (k) { totalSavings += +m.savings[k] || 0; });
    var kalan = kaynak - totalExpense - totalSavings;
    return { sumP: sumP, totalIncome: totalIncome, kaynak: kaynak, totalExpense: totalExpense, totalSavings: totalSavings, kalan: kalan };
  }

  // Taksit: bir ay için ödeme tutarı
  function instAmountForMonth(inst, key) {
    var s = monthIndex(inst.start), idx = monthIndex(key);
    var offset = idx - s;
    if (offset < 0 || offset >= inst.count) return 0;
    if (offset === inst.count - 1) {
      var paid = inst.monthly * (inst.count - 1);
      return Math.round((inst.total - paid) * 100) / 100;
    }
    return inst.monthly;
  }
  // Taksit: belirli aydan itibaren kalan borç
  function instRemainingFrom(inst, key) {
    var idx = monthIndex(key), total = 0;
    for (var i = 0; i < inst.count; i++) {
      var mIdx = monthIndex(inst.start) + i;
      if (mIdx >= idx) total += instAmountForMonth(inst, indexToKey(mIdx));
    }
    return total;
  }

  // === Render: Ay filtresi ===
  function renderMonthFilter() {
    var sel = $("#monthFilter"); sel.innerHTML = "";
    monthKeys().forEach(function (k) {
      var o = el("option"); o.value = k; o.textContent = monthLabel(k);
      if (k === selectedMonth) o.selected = true; sel.appendChild(o);
    });
  }

  // === Render: ÖZET ===
  var catColors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4", "#ef4444", "#ec4899", "#10b981", "#6366f1", "#94a3b8"];
  function renderOzet() {
    var c = calcMonth(selectedMonth); if (!c) return;
    $("#oKaynak").textContent = money0(c.kaynak);
    $("#oGider").textContent = money0(c.totalExpense);
    $("#oBirikim").textContent = money0(c.totalSavings);
    var kalanEl = $("#oKalan"); kalanEl.textContent = money0(c.kalan);
    kalanEl.className = "card-value " + (c.kalan >= 0 ? "pos" : "neg");

    // Gelir kişi bazlı
    var ip = $("#incomeByPerson"); ip.innerHTML = "";
    state.people.forEach(function (p) {
      var r = el("div", "mini-row");
      r.innerHTML = '<span class="k">👤 ' + p + '</span><span class="v">' + money0(c.sumP[p]) + '</span>';
      ip.appendChild(r);
    });

    // Taksit yükü (kart bazlı, bu ay)
    var ib = $("#installBurden"); ib.innerHTML = "";
    var byCard = {};
    state.installments.forEach(function (inst) {
      var a = instAmountForMonth(inst, selectedMonth);
      if (a > 0) byCard[inst.card] = (byCard[inst.card] || 0) + a;
    });
    var anyInst = false;
    state.installmentCards.forEach(function (card) {
      if (!byCard[card.id]) return; anyInst = true;
      var r = el("div", "mini-row");
      r.innerHTML = '<span class="k"><span class="dot" style="width:11px;height:11px;border-radius:3px;background:' + card.color + '"></span>' + card.name + '</span><span class="v">' + money0(byCard[card.id]) + '</span>';
      ib.appendChild(r);
    });
    if (!anyInst) ib.appendChild(el("div", "chart-empty", "Bu ay taksit ödemesi yok."));

    renderDonut(selectedMonth);
    renderTrend();
  }

  function renderDonut(key) {
    var canvas = $("#chart"), ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1, size = 240;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
    var m = state.months[key];
    var entries = state.categories.map(function (cat, i) {
      var v = 0; cat.subs.forEach(function (s) { v += +m.expenses[s] || 0; });
      return { name: cat.name, icon: cat.icon, color: catColors[i % catColors.length], value: v };
    }).filter(function (e) { return e.value > 0; }).sort(function (a, b) { return b.value - a.value; });
    var total = entries.reduce(function (s, e) { return s + e.value; }, 0);
    var legend = $("#legend"); legend.innerHTML = "";
    var cx = size / 2, cy = size / 2, r = 95, inner = 58;
    var css = getComputedStyle(document.body);
    if (total === 0) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
      ctx.fillStyle = css.getPropertyValue("--border") || "#e2e8f0"; ctx.fill("evenodd");
      legend.appendChild(el("li", "chart-empty", "Bu ay gider kaydı yok.")); return;
    }
    var start = -Math.PI / 2;
    entries.forEach(function (e) {
      var ang = (e.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + ang); ctx.closePath();
      ctx.fillStyle = e.color; ctx.fill(); start += ang;
    });
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = css.getPropertyValue("--surface") || "#fff"; ctx.fill();
    ctx.fillStyle = css.getPropertyValue("--text") || "#1e293b"; ctx.textAlign = "center";
    ctx.font = "600 12px -apple-system, Segoe UI, Roboto, sans-serif"; ctx.fillText("Toplam Gider", cx, cy - 6);
    ctx.font = "700 15px -apple-system, Segoe UI, Roboto, sans-serif"; ctx.fillText(money0(total), cx, cy + 13);
    entries.forEach(function (e) {
      var pct = Math.round((e.value / total) * 100);
      var li = el("li");
      li.innerHTML = '<span class="dot" style="background:' + e.color + '"></span><span class="lg-name">' + e.icon + " " + e.name + '</span><span class="lg-val">' + money0(e.value) + ' (%' + pct + ')</span>';
      legend.appendChild(li);
    });
  }

  function renderTrend() {
    var canvas = $("#trendChart"), ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1, W = 600, H = 220;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = "100%"; canvas.style.height = "auto";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var css = getComputedStyle(document.body);
    var keys = monthKeys();
    var data = keys.map(function (k) { var c = calcMonth(k); return { key: k, kaynak: c.kaynak, gider: c.totalExpense, kalan: c.kalan }; });
    var maxV = 1; data.forEach(function (d) { maxV = Math.max(maxV, d.kaynak, d.gider, Math.abs(d.kalan)); });
    var padL = 8, padR = 8, padB = 34, padT = 10;
    var gw = (W - padL - padR) / data.length;
    var zeroY = H - padB;
    var colors = { kaynak: css.getPropertyValue("--income") || "#16a34a", gider: css.getPropertyValue("--expense") || "#dc2626", kalan: css.getPropertyValue("--primary") || "#0f766e" };
    ctx.strokeStyle = css.getPropertyValue("--border"); ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(W - padR, zeroY); ctx.stroke();
    data.forEach(function (d, i) {
      var x0 = padL + i * gw;
      var bw = gw / 3.4;
      var vals = [["kaynak", d.kaynak], ["gider", d.gider], ["kalan", d.kalan]];
      vals.forEach(function (v, j) {
        var h = (Math.abs(v[1]) / maxV) * (zeroY - padT);
        var x = x0 + gw * 0.12 + j * (bw + 3);
        ctx.fillStyle = colors[v[0]];
        if (v[1] >= 0) ctx.fillRect(x, zeroY - h, bw, h);
        else ctx.fillRect(x, zeroY, bw, h);
      });
      ctx.fillStyle = css.getPropertyValue("--text-muted"); ctx.textAlign = "center"; ctx.font = "11px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(TR_MONTHS[+d.key.split("-")[1] - 1].slice(0, 3), x0 + gw / 2, H - 16);
    });
    // legend
    ctx.textAlign = "left"; ctx.font = "11px -apple-system, Segoe UI, Roboto, sans-serif";
    var lg = [["Kaynak", colors.kaynak], ["Gider", colors.gider], ["Kalan", colors.kalan]]; var lx = padL;
    lg.forEach(function (l) { ctx.fillStyle = l[1]; ctx.fillRect(lx, H - 10, 9, 9); ctx.fillStyle = css.getPropertyValue("--text-muted"); ctx.fillText(l[0], lx + 13, H - 2); lx += ctx.measureText(l[0]).width + 34; });
  }

  // === Render: AYLIK BÜTÇE ===
  function renderBudget() {
    var m = state.months[selectedMonth];
    $("#butceBaslik").textContent = monthLabel(selectedMonth) + " Bütçesi";
    $("#p1Head").textContent = state.people[0];
    $("#p2Head").textContent = state.people[1];

    // Gelir tablosu
    var tb = $("#incomeTable tbody"); tb.innerHTML = "";
    state.incomeItems.forEach(function (it) {
      var tr = el("tr");
      var tdName = el("td", null, it);
      var td1 = el("td"), td2 = el("td"), tdTot = el("td");
      var inp1 = mkNumInput((m.income[it] && m.income[it][state.people[0]]) || 0);
      var inp2 = mkNumInput((m.income[it] && m.income[it][state.people[1]]) || 0);
      inp1.addEventListener("input", function () { setIncome(it, state.people[0], inp1.value); tr.querySelector(".rowtot").textContent = money(rowIncomeTotal(it)); updateBudgetTotals(); });
      inp2.addEventListener("input", function () { setIncome(it, state.people[1], inp2.value); tr.querySelector(".rowtot").textContent = money(rowIncomeTotal(it)); updateBudgetTotals(); });
      td1.appendChild(inp1); td2.appendChild(inp2);
      tdTot.className = "rowtot"; tdTot.textContent = money(rowIncomeTotal(it));
      tr.appendChild(tdName); tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(tdTot);
      tb.appendChild(tr);
    });
    var co = $("#carryover"); co.value = m.carryover || 0;
    co.oninput = function () { m.carryover = num(co.value); $("#carryShow").textContent = money(m.carryover); save(); updateBudgetTotals(); };

    // Gider grupları
    var eg = $("#expenseGroups"); eg.innerHTML = "";
    state.categories.forEach(function (cat) {
      var wrap = el("div", "exp-group");
      var head = el("div", "exp-group-head");
      head.innerHTML = '<span>' + cat.icon + " " + cat.name + '</span><span class="g-tot" data-cat="' + cat.id + '"></span>';
      wrap.appendChild(head);
      var list = el("div", "kv-list");
      cat.subs.forEach(function (s) {
        var row = el("div", "kv-row");
        var name = el("span", "kv-name", s);
        var inp = mkNumInput(m.expenses[s] || 0);
        inp.addEventListener("input", function () { m.expenses[s] = num(inp.value); save(); updateCatTotal(cat); updateBudgetTotals(); });
        row.appendChild(name); row.appendChild(inp);
        list.appendChild(row);
      });
      wrap.appendChild(list); eg.appendChild(wrap);
      updateCatTotal(cat);
    });

    // Birikim
    var sg = $("#savingsGroup"); sg.innerHTML = "";
    state.savingsItems.forEach(function (s) {
      var row = el("div", "kv-row");
      var inp = mkNumInput(m.savings[s] || 0);
      inp.addEventListener("input", function () { m.savings[s] = num(inp.value); save(); updateBudgetTotals(); });
      row.appendChild(el("span", "kv-name", s)); row.appendChild(inp);
      sg.appendChild(row);
    });

    updateBudgetTotals();
  }
  function mkNumInput(val) {
    var i = el("input", "cell-input"); i.type = "number"; i.step = "0.01"; i.inputMode = "decimal"; i.value = val || 0; return i;
  }
  function setIncome(item, person, v) {
    var m = state.months[selectedMonth];
    if (!m.income[item]) m.income[item] = {};
    m.income[item][person] = num(v); save();
  }
  function rowIncomeTotal(item) {
    var m = state.months[selectedMonth], t = 0;
    state.people.forEach(function (p) { t += (m.income[item] && +m.income[item][p]) || 0; });
    return t;
  }
  function updateCatTotal(cat) {
    var m = state.months[selectedMonth], t = 0;
    cat.subs.forEach(function (s) { t += +m.expenses[s] || 0; });
    var elm = document.querySelector('.g-tot[data-cat="' + cat.id + '"]'); if (elm) elm.textContent = money(t);
  }
  function updateBudgetTotals() {
    var c = calcMonth(selectedMonth);
    $("#sumP1").textContent = money(c.sumP[state.people[0]]);
    $("#sumP2").textContent = money(c.sumP[state.people[1]]);
    $("#sumIncome").textContent = money(c.totalIncome);
    $("#carryShow").textContent = money(state.months[selectedMonth].carryover);
    $("#sumKaynak").textContent = money(c.kaynak);
    $("#sumExpense").textContent = money(c.totalExpense);
    $("#sumSavings").textContent = money(c.totalSavings);
    var k = $("#sumKalan"); k.textContent = money(c.kalan); k.style.color = c.kalan >= 0 ? "var(--income)" : "var(--expense)";
  }

  // === Render: TAKSİTLER ===
  function renderInstallments() {
    $("#taksitAyLabel").textContent = monthLabel(selectedMonth) + " Ödenecek";
    var buAy = 0, kalan = 0;
    state.installments.forEach(function (inst) {
      buAy += instAmountForMonth(inst, selectedMonth);
      kalan += instRemainingFrom(inst, selectedMonth);
    });
    $("#taksitBuAy").textContent = money0(buAy);
    $("#taksitKalan").textContent = money0(kalan);

    var wrap = $("#cardsWrap"); wrap.innerHTML = "";
    state.installmentCards.forEach(function (card) {
      var items = state.installments.filter(function (i) { return i.card === card.id; });
      if (!items.length) return;
      var block = el("div", "card-block");
      var cardMonth = 0, cardRemain = 0;
      items.forEach(function (i) { cardMonth += instAmountForMonth(i, selectedMonth); cardRemain += instRemainingFrom(i, selectedMonth); });
      var head = el("div", "card-block-head");
      head.style.background = card.color;
      head.innerHTML = '<span>💳 ' + card.name + '</span><span>Bu ay: ' + money0(cardMonth) + '</span>';
      block.appendChild(head);
      items.forEach(function (inst) {
        var idx = state.installments.indexOf(inst);
        var amt = instAmountForMonth(inst, selectedMonth);
        var remain = instRemainingFrom(inst, selectedMonth);
        var paidOff = monthIndex(selectedMonth) >= monthIndex(inst.start) + inst.count;
        var startIdx = monthIndex(inst.start), curIdx = monthIndex(selectedMonth);
        var installNo = curIdx - startIdx + 1;
        var row = el("div", "inst-row" + (paidOff ? " inst-paid" : ""));
        var dot = el("span", paidOff ? "inst-done-dot" : (amt > 0 ? "inst-active-dot" : "inst-done-dot"));
        var info = el("div", "inst-info");
        var meta = money(inst.monthly) + " × " + inst.count + " • " + monthLabel(inst.start);
        if (amt > 0 && installNo >= 1 && installNo <= inst.count) meta += " • " + installNo + ". taksit";
        else if (paidOff) meta += " • bitti ✓";
        info.innerHTML = '<div class="inst-desc"></div><div class="inst-meta">' + meta + '</div>';
        info.querySelector(".inst-desc").textContent = inst.desc;
        var right = el("div", "inst-right");
        right.innerHTML = '<div class="inst-monthly">' + (amt > 0 ? money0(amt) : "—") + '</div><div class="inst-remaining">kalan ' + money0(remain) + '</div>';
        var del = el("button", "mini-del", "✕"); del.title = "Sil";
        del.addEventListener("click", function () { if (confirm("Bu taksiti silmek istiyor musunuz?")) { state.installments.splice(idx, 1); save(); renderInstallments(); renderOzet(); } });
        row.appendChild(dot); row.appendChild(info); row.appendChild(right); row.appendChild(del);
        block.appendChild(row);
      });
      wrap.appendChild(block);
    });
    if (!wrap.children.length) wrap.appendChild(el("p", "empty", "Henüz taksit kaydı yok."));
  }

  // === Render: BİRİKİM ===
  function renderGold() {
    var g = state.gold;
    // Portföy: türe göre grupla
    var byType = {};
    g.purchases.forEach(function (p) {
      if (!byType[p.type]) byType[p.type] = { amount: 0, cost: 0 };
      byType[p.type].amount += +p.amount || 0;
      byType[p.type].cost += +p.cost || 0;
    });
    var types = Object.keys(byType);
    // prices'ta olmayan türleri ekle
    types.forEach(function (t) { if (!(t in g.prices)) g.prices[t] = 0; });

    var tb = $("#portfolioTable tbody"); tb.innerHTML = "";
    var totCost = 0, totValue = 0;
    types.forEach(function (t) {
      var d = byType[t];
      var price = +g.prices[t] || 0;
      var value = d.amount * price;
      totCost += d.cost; totValue += value;
      var tr = el("tr");
      var priceInp = mkNumInput(price); priceInp.style.maxWidth = "90px";
      priceInp.addEventListener("input", function () { g.prices[t] = num(priceInp.value); save(); renderGold(); });
      tr.appendChild(el("td", null, t));
      tr.appendChild(el("td", null, String(d.amount)));
      tr.appendChild(el("td", null, money0(d.cost)));
      var tdP = el("td"); tdP.appendChild(priceInp); tr.appendChild(tdP);
      tr.appendChild(el("td", null, money0(value)));
      tb.appendChild(tr);
    });
    if (!types.length) { var tr = el("tr"); tr.innerHTML = '<td colspan="5" class="chart-empty">Portföy boş.</td>'; tb.appendChild(tr); }

    $("#gMaliyet").textContent = money0(totCost);
    $("#gDeger").textContent = money0(totValue);
    var kar = totValue - totCost;
    var kEl = $("#gKar"); kEl.textContent = (kar >= 0 ? "+" : "") + money0(kar);
    kEl.className = "card-value " + (kar >= 0 ? "pos" : "neg");

    // Alım defteri
    var list = $("#goldList"); list.innerHTML = "";
    var sorted = g.purchases.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return a.p.date < b.p.date ? 1 : -1; });
    sorted.forEach(function (o) {
      var p = o.p;
      var li = el("li", "tx-item");
      var unit = p.amount ? (p.cost / p.amount) : 0;
      li.innerHTML = '<div class="tx-icon">🥇</div><div class="tx-info"><div class="tx-desc"></div><div class="tx-meta">' + p.amount + ' adet/gr • birim ' + money0(unit) + ' • ' + p.date + '</div></div><div class="tx-amount">' + money0(p.cost) + '</div><button class="mini-del" title="Sil">✕</button>';
      li.querySelector(".tx-desc").textContent = p.type;
      li.querySelector(".mini-del").addEventListener("click", function () { if (confirm("Bu alımı silmek istiyor musunuz?")) { g.purchases.splice(o.i, 1); save(); renderGold(); } });
      list.appendChild(li);
    });
    $("#goldEmpty").hidden = g.purchases.length !== 0;

    var info = $("#priceInfo");
    if (info) {
      if (g.priceUpdate) info.textContent = "Güncel fiyatlar otomatik çekilir (kaynak: truncgil, satış). Son güncelleme: " + g.priceUpdate;
      else info.textContent = "Güncel fiyatlar otomatik çekilir (kaynak: truncgil, satış fiyatı). Dilerseniz elle de değiştirebilirsiniz.";
    }
  }

  // === Modal ===
  function openModal(title, fields, onSave) {
    $("#modalTitle").textContent = title;
    var body = $("#modalBody"); body.innerHTML = "";
    fields.forEach(function (f) {
      var wrap = el("label", "field");
      wrap.appendChild(el("span", null, f.label));
      var input;
      if (f.type === "select") {
        input = el("select");
        f.options.forEach(function (o) { var op = el("option"); op.value = o.value; op.textContent = o.label; input.appendChild(op); });
        if (f.value != null) input.value = f.value;
      } else {
        input = el("input"); input.type = f.type || "text";
        if (f.type === "number") { input.step = "0.01"; input.inputMode = "decimal"; }
        if (f.value != null) input.value = f.value;
        if (f.placeholder) input.placeholder = f.placeholder;
      }
      input.id = "mf_" + f.key;
      wrap.appendChild(input); body.appendChild(wrap);
    });
    $("#modal").hidden = false;
    $("#modalSave").onclick = function () {
      var vals = {};
      fields.forEach(function (f) { vals[f.key] = $("#mf_" + f.key).value; });
      if (onSave(vals) !== false) $("#modal").hidden = true;
    };
  }
  $("#modalCancel").onclick = function () { $("#modal").hidden = true; };

  function addInstallment() {
    openModal("Yeni Taksit", [
      { key: "card", label: "Kart", type: "select", options: state.installmentCards.map(function (c) { return { value: c.id, label: c.name }; }) },
      { key: "desc", label: "Açıklama", placeholder: "Örn. HepsiBurada" },
      { key: "total", label: "Toplam Tutar (₺)", type: "number" },
      { key: "count", label: "Taksit Sayısı", type: "number" },
      { key: "start", label: "Başlangıç Ayı", type: "month", value: selectedMonth }
    ], function (v) {
      var count = parseInt(v.count, 10), total = num(v.total);
      if (!v.desc || !count || count < 1 || !total) { alert("Lütfen açıklama, tutar ve taksit sayısını girin."); return false; }
      state.installments.push({ card: v.card, desc: v.desc, total: total, count: count, monthly: Math.round((total / count) * 100) / 100, start: v.start || selectedMonth });
      save(); renderInstallments(); renderOzet();
    });
  }
  function addGold() {
    var typeOpts = Object.keys(state.gold.prices).map(function (t) { return { value: t, label: t }; });
    openModal("Yeni Altın Alımı", [
      { key: "date", label: "Tarih", type: "date", value: new Date().toISOString().slice(0, 10) },
      { key: "type", label: "Altın Türü", type: "select", options: typeOpts },
      { key: "amount", label: "Miktar (adet/gr)", type: "number" },
      { key: "cost", label: "Alış Tutarı (₺)", type: "number" }
    ], function (v) {
      var amount = num(v.amount), cost = num(v.cost);
      if (!amount || !cost) { alert("Lütfen miktar ve tutarı girin."); return false; }
      state.gold.purchases.push({ date: v.date, type: v.type, amount: amount, cost: cost });
      save(); renderGold();
    });
  }
  function addMonth() {
    var keys = monthKeys();
    var lastIdx = monthIndex(keys[keys.length - 1]);
    var nextKey = indexToKey(lastIdx + 1);
    openModal("Yeni Ay Ekle", [
      { key: "month", label: "Ay", type: "month", value: nextKey }
    ], function (v) {
      var key = v.month; if (!key) return false;
      if (state.months[key]) { alert("Bu ay zaten var."); return false; }
      var m = emptyMonth();
      // devir: bir önceki ayın kalanı
      var prev = calcMonth(keys[keys.length - 1]);
      if (prev) m.carryover = Math.max(0, Math.round(prev.kalan * 100) / 100);
      state.months[key] = m; save();
      selectedMonth = key; renderMonthFilter(); renderAll();
    });
  }

  // === Yedekleme ===
  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a"); a.href = url; a.download = "butce-yedek-" + todayMonth() + ".json";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data.months || !data.categories) throw new Error("geçersiz");
        state = data; save();
        selectedMonth = monthKeys().indexOf(selectedMonth) >= 0 ? selectedMonth : monthKeys()[monthKeys().length - 1];
        renderMonthFilter(); renderAll();
        alert("Yedek başarıyla geri yüklendi.");
      } catch (e) { alert("Dosya okunamadı veya geçersiz."); }
    };
    reader.readAsText(file);
  }

  // === Sekmeler ===
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    document.querySelectorAll(".tabpanel").forEach(function (p) { p.classList.toggle("active", p.id === "tab-" + name); });
    if (name === "ozet") renderOzet();
    else if (name === "butce") renderBudget();
    else if (name === "taksitler") renderInstallments();
    else if (name === "birikim") renderGold();
  }

  function renderAll() {
    renderOzet();
    var active = document.querySelector(".tab.active");
    if (active) switchTab(active.dataset.tab);
  }

  // === Tema ===
  function applyTheme(t) {
    if (t === "dark") { document.documentElement.setAttribute("data-theme", "dark"); $("#themeToggle").textContent = "☀️"; }
    else { document.documentElement.removeAttribute("data-theme"); $("#themeToggle").textContent = "🌙"; }
  }

  // === PWA yükleme ===
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; $("#installHint").hidden = false; });

  // === Başlat ===
  function init() {
    state = load();
    // seed sonrası olası eksikleri tamamla
    if (!state.gold) state.gold = deepCopy(window.SEED_DATA.gold);
    selectedMonth = state.months[todayMonth()] ? todayMonth() : monthKeys()[monthKeys().length - 1];

    var savedTheme = localStorage.getItem(THEME_KEY);
    if (!savedTheme && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) savedTheme = "dark";
    applyTheme(savedTheme || "light");

    renderMonthFilter();
    switchTab("ozet");

    // olaylar
    document.querySelectorAll(".tab").forEach(function (t) { t.addEventListener("click", function () { switchTab(t.dataset.tab); }); });
    $("#monthFilter").addEventListener("change", function (e) { selectedMonth = e.target.value; renderAll(); });
    $("#themeToggle").addEventListener("click", function () {
      var cur = localStorage.getItem(THEME_KEY) === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, cur); } catch (e) {} applyTheme(cur); renderAll();
    });
    $("#menuBtn").addEventListener("click", function () { $("#drawer").hidden = false; });
    $("#closeDrawer").addEventListener("click", function () { $("#drawer").hidden = true; });
    $("#drawer").addEventListener("click", function (e) { if (e.target.id === "drawer") $("#drawer").hidden = true; });
    $("#exportBtn").addEventListener("click", function () { exportData(); $("#drawer").hidden = true; });
    $("#importFile").addEventListener("change", function (e) { if (e.target.files[0]) importData(e.target.files[0]); $("#drawer").hidden = true; });
    $("#addMonthBtn").addEventListener("click", function () { $("#drawer").hidden = true; addMonth(); });
    $("#resetBtn").addEventListener("click", function () {
      if (confirm("Tüm veriler Excel'deki başlangıç haline sıfırlanacak. Emin misiniz?")) {
        state = deepCopy(window.SEED_DATA); save(); selectedMonth = monthKeys()[monthKeys().length - 1];
        renderMonthFilter(); renderAll(); $("#drawer").hidden = true;
      }
    });
    $("#installBtn").addEventListener("click", function () { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(function () { deferredPrompt = null; $("#installHint").hidden = true; }); } });
    $("#addInstallBtn").addEventListener("click", addInstallment);
    $("#addGoldBtn").addEventListener("click", addGold);
    $("#refreshGoldBtn").addEventListener("click", function () {
      fetchGoldPrices(true).then(function (n) {
        if (n > 0) { var i = $("#priceInfo"); if (i && state.gold.priceUpdate) i.textContent = "✅ Güncellendi (kaynak: truncgil, satış). Son güncelleme: " + state.gold.priceUpdate; }
      });
    });

    // günlük otomatik fiyat güncelleme
    maybeAutoUpdatePrices();
  }

  document.addEventListener("DOMContentLoaded", init);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("service-worker.js").catch(function () {}); });
  }
})();
