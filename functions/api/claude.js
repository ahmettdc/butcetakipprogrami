/* Cloudflare Pages Function — /api/claude
   Tarayıcıdan gelen isteği, gizli ANTHROPIC_API_KEY ile Anthropic Messages API'sine iletir.
   Anahtar yalnızca sunucuda (Cloudflare secret) tutulur; tarayıcıya gitmez. */

const ALLOWED_MODELS = {
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001"
};
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export async function onRequestGet({ env }) {
  // basit durum kontrolü (anahtar ayarlı mı)
  return json({ configured: !!env.ANTHROPIC_API_KEY });
}

export async function onRequestPost({ request, env }) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "AI bağlı değil: ANTHROPIC_API_KEY ayarlı değil." }, 503);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "Geçersiz istek." }, 400); }

  const model = ALLOWED_MODELS[body && body.model] || DEFAULT_MODEL;
  const maxTokens = Math.max(256, Math.min(+(body && body.max_tokens) || 4000, 8000));
  const payload = {
    model: model,
    max_tokens: maxTokens,
    system: typeof (body && body.system) === "string" ? body.system : "",
    messages: Array.isArray(body && body.messages) ? body.messages : []
  };
  if (!payload.messages.length) return json({ error: "Mesaj yok." }, 400);

  let r, data;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });
    data = await r.json();
  } catch (e) {
    return json({ error: "Anthropic'e ulaşılamadı." }, 502);
  }

  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || ("Anthropic hatası (" + r.status + ")");
    return json({ error: msg }, r.status);
  }

  const text = (data.content || [])
    .filter(function (c) { return c && c.type === "text"; })
    .map(function (c) { return c.text; })
    .join("");
  return json({ text: text });
}
