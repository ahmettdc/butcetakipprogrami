# Aile Bütçesi 🏠

Ahmet & Elif için hane bütçe uygulaması — **telefon, tablet ve masaüstünde** çalışan responsive bir PWA.

## Ekranlar
- **Özet** — devir/gelir/gider/birikim/kalan KPI'ları, 12 aylık ileriye bakış tahmini, kategori limitleri, kişi bazlı gelir katkısı, yaklaşan taksit rahatlamaları
- **Aylık Bütçe** — kişi bazlı gelir, kategorili gider (kart taksitleri otomatik), birikim, denklem
- **Harcama** — ekstre/fiş metnini yapıştır, kalemler kategorilere ayrılıp bütçeye yazılır (yerel ayrıştırıcı; PDF/foto için AI bağlantısı gerekir)
- **Taksitler** — kart özetleri, taksit takvimi ve zaman çizelgesi (gantt)
- **Birikim** — portföy + hedef, altın (canlı fiyat), döviz, alım defteri
- **Yıllık** — ay ay akış ve yıl karşılaştırma

## Teknik
- Tasarım: Claude Design ile hazırlanan `.dc.html` prototipi birebir uygulandı
- Çalışma zamanı: `support.js` (dc-runtime, React'i CDN'den yükler) + `<x-dc>` şablonu
- Veriler yalnızca tarayıcıda (localStorage) saklanır — hiçbir sunucuya gitmez
- Canlı altın/döviz fiyatları: truncgil (yedek: genelpara)
- PWA: `manifest.json` + `service-worker.js` ile kurulabilir ve büyük ölçüde çevrimdışı

## Yayın
`main` dalına her push, Cloudflare Pages tarafından otomatik yayınlanır.

## Gizlilik
Tüm bütçe verileri cihazın tarayıcısında kalır. Repo özeldir.
