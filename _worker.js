/* Aile Bütçesi — Cloudflare Worker.
   /api/ping  : kurulum kontrolü (worker çalışıyor mu, KV bağlı mı)
   /api/data  : cihazlar arası eşitleme (GET oku, PUT yaz — rev korumalı)
   Diğer her şey: statik dosyalar (ASSETS). */

const KEY = "butce:data";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
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
    const next = { rev: curRev + 1, updatedAt: new Date().toISOString(), data: body.data };
    await kv.put(KEY, JSON.stringify(next));
    return json({ rev: next.rev, updatedAt: next.updatedAt });
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

    if (env.ASSETS && env.ASSETS.fetch) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  }
};
