// Edge Function: gigachat-test
// Architecture: Frontend → this Edge Function → GdeDengi AI Proxy (RU) → GigaChat
// GigaChat credentials NEVER leave the proxy. This function only knows the proxy URL + shared secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const PROXY_URL = Deno.env.get("GDEDENGI_AI_PROXY_URL");
  const PROXY_SECRET = Deno.env.get("GDEDENGI_AI_PROXY_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!PROXY_URL || !PROXY_SECRET) {
    return json(500, {
      ok: false,
      stage: "config",
      error: "Не настроены секреты GDEDENGI_AI_PROXY_URL / GDEDENGI_AI_PROXY_SECRET",
    });
  }

  // Authenticate caller
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { ok: false, error: "Требуется авторизация" });
  }
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { ok: false, error: "Невалидный токен" });
  }
  const userId = userData.user.id;

  // Parse body
  let message = "Привет, проверь подключение";
  try {
    const body = await req.json();
    if (typeof body?.message === "string" && body.message.trim().length > 0) {
      message = body.message.trim().slice(0, 4000);
    }
  } catch {
    // keep default
  }

  const endpoint = `${PROXY_URL.replace(/\/$/, "")}/gigachat/test`;
  const startedAt = Date.now();
  let httpStatus = 0;
  let responseText: string | null = null;
  let errorText: string | null = null;
  let answer: string | null = null;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let totalTokens: number | null = null;

  try {
    const proxyRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": PROXY_SECRET,
      },
      body: JSON.stringify({ message }),
    });
    httpStatus = proxyRes.status;
    const raw = await proxyRes.text();
    responseText = raw;
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // leave as raw
    }
    if (!proxyRes.ok) {
      errorText = parsed?.error ?? `Прокси вернул статус ${proxyRes.status}`;
    } else {
      answer =
        parsed?.answer ??
        parsed?.message ??
        parsed?.choices?.[0]?.message?.content ??
        (typeof parsed === "string" ? parsed : raw);
      promptTokens = parsed?.usage?.prompt_tokens ?? null;
      completionTokens = parsed?.usage?.completion_tokens ?? null;
      totalTokens = parsed?.usage?.total_tokens ?? null;
    }
  } catch (e) {
    errorText = `Сетевая ошибка при обращении к прокси: ${e instanceof Error ? e.message : String(e)}`;
  }

  const duration = Date.now() - startedAt;

  // Log via service role (bypass RLS)
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabaseAdmin.from("ai_interactions").insert({
      user_id: userId,
      endpoint: "/gigachat/test",
      request_message: message,
      response_text: answer ?? responseText,
      http_status: httpStatus || null,
      error: errorText,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      duration_ms: duration,
    });
  } catch (logErr) {
    console.error("ai_interactions log failed", logErr);
  }

  if (errorText) {
    return json(502, {
      ok: false,
      httpStatus,
      stage: "proxy",
      error: errorText,
      raw: responseText,
    });
  }

  return json(200, {
    ok: true,
    httpStatus,
    answer,
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    },
    duration_ms: duration,
  });
});
