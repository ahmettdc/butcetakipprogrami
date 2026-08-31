/* Aile Bütçesi — Cloudflare Worker.
   /api/ping       : kurulum kontrolü (worker çalışıyor mu, KV bağlı mı)
   /api/data       : cihazlar arası eşitleme (GET oku, PUT yaz — rev korumalı)
   /api/snapshots  : otomatik günlük yedekler (liste ve tek yedek okuma)
   Diğer her şey   : statik dosyalar (ASSETS). */

const KEY = "butce:data";
const SNAP = "butce:snap:";
const SNAP_KEEP = 30;          // son kaç günün yedeği saklansın

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function today() { return new Date().toISOString().slice(0, 10); }
function ayCount(rec) {
  try { return Object.keys(rec.data.months).length; } catch (e) { return 0; }
}

/* Günün ilk yazımında, YAZMADAN ÖNCEKİ hâli ayrı bir anahtara kopyalar.
   Böylece bugün bir şey bozulursa dünün sonundaki hâle dönülebilir. */
async function snapshot(kv, cur) {
  const gun = today();
  const key = SNAP + gun;
  try {
    await kv.put(key, JSON.stringify({ rev: cur.rev, updatedAt: cur.updatedAt, data: cur.data }), {
      metadata: {
        updatedAt: cur.updatedAt || null,
        rev: +cur.rev || 0,
        months: ayCount(cur),
        snappedAt: new Date().toISOString()
      }
    });
    // Eskileri temizle (isimler tarih olduğu için sıralama kronolojik)
    const list = await kv.list({ prefix: SNAP });
    const fazla = list.keys.length - SNAP_KEEP;
    for (let i = 0; i < fazla; i++) await kv.delete(list.keys[i].name);
  } catch (e) { /* yedek alınamazsa asıl kayıt yine de yazılsın */ }
}

async function handleSnapshots(request, env) {
  const kv = env.BUTCE_KV;
  if (!kv) return json({ error: "KV bagli degil (BUTCE_KV)" }, 503);
  if (request.method !== "GET") return json({ error: "yontem desteklenmiyor" }, 405);

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) return json({ error: "gecersiz id" }, 400);
    const raw = await kv.get(SNAP + id);
    if (!raw) return json({ error: "yedek bulunamadi" }, 404);
    let rec;
    try { rec = JSON.parse(raw); } catch (e) { return json({ error: "yedek okunamadi" }, 500); }
    return json({ id: id, rev: +rec.rev || 0, updatedAt: rec.updatedAt || null, data: rec.data || null });
  }

  const list = await kv.list({ prefix: SNAP });
  const snaps = list.keys.map(function (k) {
    const m = k.metadata || {};
    return {
      id: k.name.slice(SNAP.length),
      updatedAt: m.updatedAt || null,
      rev: +m.rev || 0,
      months: +m.months || 0,
      snappedAt: m.snappedAt || null
    };
  }).sort(function (a, b) { return a.id < b.id ? 1 : -1; });   // yeniden eskiye
  return json({ snapshots: snaps, keep: SNAP_KEEP });
}

async function handleData(request, env) {
  const kv = env.BUTCE_KV;
  if (!kv) return json({ error: "KV bagli degil (BUTCE_KV)" }, 503);

  if (request.method === "GET") {
    const raw = await kv.get(KEY);
    if (!raw) return json({ rev: 0, updatedAt: null, data: null });
    let cur;
    try { cur = JSON.parse(raw); } catch (e) { return json({ rev: 0, updatedAt: null, data: null }); }
    return json({ rev: +cur.rev || 0, updatedAt: cur.updatedAt || null, data: cur.data || null });
  }

  if (request.method === "PUT" || request.method === "POST") {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "gecersiz govde" }, 400); }
    if (!body || typeof body !== "object" || !body.data || typeof body.data !== "object") {
      return json({ error: "data alani gerekli" }, 400);
    }
    const raw = await kv.get(KEY);
    let cur = null;
    if (raw) { try { cur = JSON.parse(raw); } catch (e) { cur = null; } }
    const curRev = cur && +cur.rev ? +cur.rev : 0;
    const sentRev = +body.rev || 0;
    if (sentRev < curRev) {
      // Baska bir cihaz once yazmis: mevcut kopyayi geri gonder, istemci birlestirsin.
      return json({ conflict: true, rev: curRev, updatedAt: cur.updatedAt || null, data: cur.data || null }, 409);
    }

    const gun = today();
    const ilkYazim = !!cur && cur.snapDay !== gun;
    if (ilkYazim) await snapshot(kv, cur);

    const next = {
      rev: curRev + 1,
      updatedAt: new Date().toISOString(),
      snapDay: gun,
      data: body.data
    };
    await kv.put(KEY, JSON.stringify(next));
    return json({ rev: next.rev, updatedAt: next.updatedAt, snapshot: ilkYazim ? gun : null });
  }

  return json({ error: "yontem desteklenmiyor" }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ping") {
      return json({ ok: true, worker: true, kv: !!env.BUTCE_KV, time: new Date().toISOString() });
    }
    if (url.pathname === "/api/data") return handleData(request, env);
    if (url.pathname === "/api/snapshots") return handleSnapshots(request, env);

    if (env.ASSETS && env.ASSETS.fetch) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  }
};
