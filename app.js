/* Bütçe Takip Programı - vanilla JS, veriler localStorage'da saklanır */
(function () {
  "use strict";

  var STORAGE_KEY = "butce_takip_islemler_v1";
  var THEME_KEY = "butce_takip_tema";

  // Kategoriler
  var CATEGORIES = {
    expense: [
      { id: "market", name: "Market", icon: "🛒", color: "#f59e0b" },
      { id: "fatura", name: "Fatura", icon: "🧾", color: "#3b82f6" },
      { id: "kira", name: "Kira", icon: "🏠", color: "#8b5cf6" },
      { id: "ulasim", name: "Ulaşım", icon: "🚌", color: "#06b6d4" },
      { id: "yemek", name: "Yeme-İçme", icon: "🍽️", color: "#ef4444" },
      { id: "eglence", name: "Eğlence", icon: "🎬", color: "#ec4899" },
      { id: "saglik", name: "Sağlık", icon: "💊", color: "#10b981" },
      { id: "giyim", name: "Giyim", icon: "👕", color: "#6366f1" },
      { id: "diger_gider", name: "Diğer", icon: "📦", color: "#94a3b8" }
    ],
    income: [
      { id: "maas", name: "Maaş", icon: "💼", color: "#16a34a" },
      { id: "ek_gelir", name: "Ek Gelir", icon: "💰", color: "#0ea5e9" },
      { id: "hediye", name: "Hediye", icon: "🎁", color: "#d946ef" },
      { id: "faiz", name: "Faiz/Yatırım", icon: "📈", color: "#14b8a6" },
      { id: "diger_gelir", name: "Diğer", icon: "📥", color: "#94a3b8" }
    ]
  };

  // --- Yardımcılar ---
  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  var currencyFmt = new Intl.NumberFormat("tr-TR", {
    style: "currency", currency: "TRY", minimumFractionDigits: 2
  });
  function money(n) { return currencyFmt.format(n || 0); }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveData(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function findCategory(type, id) {
    var arr = CATEGORIES[type] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return { id: id, name: "Diğer", icon: "📦", color: "#94a3b8" };
  }
  function monthKey(dateStr) { return (dateStr || "").slice(0, 7); } // YYYY-MM
  function monthLabel(key) {
    var months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    var parts = key.split("-");
    return months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }

  // --- Durum ---
  var transactions = loadData();
  var selectedMonth = monthKey(new Date().toISOString());

  // --- Kategori seçimini doldur ---
  function populateCategories() {
    var type = $('input[name="type"]:checked').value;
    var sel = $("#category");
    sel.innerHTML = "";
    CATEGORIES[type].forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.icon + " " + c.name;
      sel.appendChild(opt);
    });
  }

  // --- Ay filtresini doldur ---
  function populateMonthFilter() {
    var keys = {};
    transactions.forEach(function (t) { keys[monthKey(t.date)] = true; });
    keys[selectedMonth] = true;
    var sorted = Object.keys(keys).sort().reverse();
    var sel = $("#monthFilter");
    sel.innerHTML = "";
    sorted.forEach(function (k) {
      var opt = document.createElement("option");
      opt.value = k;
      opt.textContent = monthLabel(k);
      if (k === selectedMonth) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // --- Render ---
  function currentMonthTx() {
    return transactions.filter(function (t) { return monthKey(t.date) === selectedMonth; });
  }

  function renderSummary(list) {
    var income = 0, expense = 0;
    list.forEach(function (t) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    $("#incomeValue").textContent = money(income);
    $("#expenseValue").textContent = money(expense);
    $("#balanceValue").textContent = money(income - expense);
  }

  function renderList(list) {
    var ul = $("#txList");
    ul.innerHTML = "";
    var sorted = list.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id;
    });
    sorted.forEach(function (t) {
      var cat = findCategory(t.type, t.category);
      var li = document.createElement("li");
      li.className = "tx-item";
      var sign = t.type === "income" ? "+" : "−";
      li.innerHTML =
        '<div class="tx-icon ' + t.type + '">' + cat.icon + '</div>' +
        '<div class="tx-info">' +
          '<div class="tx-desc"></div>' +
          '<div class="tx-meta">' + cat.name + ' • ' + formatDate(t.date) + '</div>' +
        '</div>' +
        '<div class="tx-amount ' + t.type + '">' + sign + money(t.amount).replace("₺", "₺") + '</div>' +
        '<button class="tx-del" title="Sil" aria-label="Sil">✕</button>';
      li.querySelector(".tx-desc").textContent = t.description || cat.name;
      li.querySelector(".tx-del").addEventListener("click", function () { deleteTx(t.id); });
      ul.appendChild(li);
    });
    $("#txCount").textContent = String(list.length);
    $("#emptyState").hidden = list.length !== 0;
  }

  function formatDate(dateStr) {
    var parts = dateStr.split("-");
    return parts[2] + "." + parts[1] + "." + parts[0];
  }

  // --- Basit donut grafik (kütüphanesiz canvas) ---
  function renderChart(list) {
    var canvas = $("#chart");
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var size = 240;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // Kategori bazında gider topla
    var byCat = {};
    list.forEach(function (t) {
      if (t.type !== "expense") return;
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    var entries = Object.keys(byCat).map(function (id) {
      var c = findCategory("expense", id);
      return { name: c.name, color: c.color, value: byCat[id] };
    }).sort(function (a, b) { return b.value - a.value; });

    var total = entries.reduce(function (s, e) { return s + e.value; }, 0);
    var legend = $("#legend");
    legend.innerHTML = "";

    var cx = size / 2, cy = size / 2, r = 95, inner = 58;

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--border") || "#e2e8f0";
      ctx.fill("evenodd");
      var li = document.createElement("li");
      li.className = "chart-empty";
      li.textContent = "Bu ay gider kaydı yok.";
      legend.appendChild(li);
      return;
    }

    var start = -Math.PI / 2;
    entries.forEach(function (e) {
      var angle = (e.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = e.color;
      ctx.fill();
      start += angle;
    });
    // iç boşluk (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--surface") || "#fff";
    ctx.fill();
    // ortada toplam
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text") || "#1e293b";
    ctx.textAlign = "center";
    ctx.font = "600 13px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("Toplam Gider", cx, cy - 6);
    ctx.font = "700 16px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(money(total), cx, cy + 14);

    // legend
    entries.forEach(function (e) {
      var pct = Math.round((e.value / total) * 100);
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="dot" style="background:' + e.color + '"></span>' +
        '<span class="lg-name"></span>' +
        '<span class="lg-val">' + money(e.value) + ' (%' + pct + ')</span>';
      li.querySelector(".lg-name").textContent = e.name;
      legend.appendChild(li);
    });
  }

  function renderAll() {
    var list = currentMonthTx();
    renderSummary(list);
    renderList(list);
    renderChart(list);
  }

  // --- İşlemler ---
  function addTx(e) {
    e.preventDefault();
    var type = $('input[name="type"]:checked').value;
    var amount = parseFloat(String($("#amount").value).replace(",", "."));
    if (!amount || amount <= 0) { $("#amount").focus(); return; }
    var tx = {
      id: Date.now(),
      type: type,
      amount: Math.round(amount * 100) / 100,
      category: $("#category").value,
      description: $("#description").value.trim(),
      date: $("#date").value
    };
    transactions.push(tx);
    saveData(transactions);
    selectedMonth = monthKey(tx.date);
    populateMonthFilter();
    renderAll();
    // formu sıfırla (tarih ve tip kalsın)
    $("#amount").value = "";
    $("#description").value = "";
    $("#amount").focus();
  }

  function deleteTx(id) {
    if (!confirm("Bu işlemi silmek istediğinize emin misiniz?")) return;
    transactions = transactions.filter(function (t) { return t.id !== id; });
    saveData(transactions);
    populateMonthFilter();
    renderAll();
  }

  // --- Tema ---
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      $("#themeToggle").textContent = "☀️";
    } else {
      document.documentElement.removeAttribute("data-theme");
      $("#themeToggle").textContent = "🌙";
    }
  }
  function toggleTheme() {
    var current = localStorage.getItem(THEME_KEY) === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, current); } catch (e) {}
    applyTheme(current);
    renderChart(currentMonthTx()); // renkler tema ile değişsin
  }

  // --- PWA yükleme ---
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    $("#installHint").hidden = false;
  });
  function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () {
      deferredPrompt = null;
      $("#installHint").hidden = true;
    });
  }

  // --- Başlat ---
  function init() {
    // tema
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (!savedTheme && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      savedTheme = "dark";
    }
    applyTheme(savedTheme || "light");

    // bugünün tarihi
    $("#date").value = new Date().toISOString().slice(0, 10);

    populateCategories();
    populateMonthFilter();
    renderAll();

    $("#txForm").addEventListener("submit", addTx);
    $all('input[name="type"]').forEach(function (r) {
      r.addEventListener("change", populateCategories);
    });
    $("#monthFilter").addEventListener("change", function (e) {
      selectedMonth = e.target.value;
      renderAll();
    });
    $("#themeToggle").addEventListener("click", toggleTheme);
    $("#installBtn").addEventListener("click", installApp);
  }

  document.addEventListener("DOMContentLoaded", init);

  // Service worker (çevrimdışı)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {});
    });
  }
})();
