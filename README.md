# Bütçe Takip Programı 💰

Gelir ve giderlerinizi kolayca takip etmenizi sağlayan, **telefon, tablet ve masaüstünde (Windows)** çalışan responsive bir uygulama (PWA).

## ✨ Özellikler

- 📥 **Gelir / Gider ekleme** — tutar, kategori, açıklama ve tarih ile
- 📊 **Anlık özet** — bakiye, toplam gelir ve toplam gider kartları
- 🥧 **Gider dağılım grafiği** — kategori bazında donut grafik (yüzdelerle)
- 🗂️ **Hazır kategoriler** — market, fatura, kira, ulaşım, maaş ve daha fazlası
- 📅 **Aylık filtreleme** — her ayı ayrı ayrı görüntüleme
- 🌙 **Açık / koyu tema** — cihaz temasına otomatik uyum
- 📲 **Uygulama olarak yüklenebilir** (PWA) — ana ekrana ekle, çevrimdışı kullan
- 🔒 **Gizlilik** — tüm veriler yalnızca **kendi cihazınızda** (tarayıcıda) saklanır, hiçbir sunucuya gönderilmez

## 🔒 Gizlilik

Bu uygulama tamamen **kişiseldir**. Girdiğiniz hiçbir bütçe verisi internete/sunucuya gönderilmez;
veriler yalnızca kullandığınız cihazın tarayıcısında (`localStorage`) tutulur. Repo da özeldir (private).

## 🚀 Nasıl Kullanılır

### Yerel olarak açma
Herhangi bir kurulum gerektirmez. `index.html` dosyasını tarayıcıda açmanız yeterli.

Basit bir yerel sunucu ile (önerilir, PWA için gerekli):

```bash
# Python varsa
python3 -m http.server 8080
# veya Node varsa
npx serve .
```

Ardından tarayıcıdan `http://localhost:8080` adresine gidin.

### Telefona / masaüstüne "uygulama" olarak yükleme
1. Uygulamayı bir web adresinde (örn. GitHub Pages) açın
2. Tarayıcı menüsünden **"Ana ekrana ekle"** / **"Uygulamayı yükle"** seçeneğine dokunun
3. Artık uygulama simgesiyle, tam ekran ve çevrimdışı çalışır

## 🛠️ Teknik

- Saf **HTML + CSS + JavaScript** (kütüphane bağımlılığı yok)
- **PWA**: `manifest.json` + `service-worker.js` ile çevrimdışı destek
- Grafik saf `<canvas>` ile çizilir (harici kütüphane yok)
- Veri saklama: tarayıcı `localStorage`

## 📁 Dosya Yapısı

```
├── index.html          # Ana sayfa
├── style.css           # Stiller (açık/koyu tema)
├── app.js              # Uygulama mantığı
├── manifest.json       # PWA tanımı
├── service-worker.js   # Çevrimdışı önbellek
└── icons/              # Uygulama ikonları
```

## 📄 Lisans

Kişisel kullanım içindir.
