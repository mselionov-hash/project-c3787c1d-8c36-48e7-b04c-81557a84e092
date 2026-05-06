// GigaChat connection test (Phase 1)
// - Validates user JWT
// - Fetches OAuth access token from GigaChat
// - Calls /chat/completions with a tiny ping prompt
// - Returns connection status (no secrets exposed)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Auth: require a logged-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, stage: "auth", error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      token,
    );
    if (claimsErr || !claims?.claims) {
      return json({ ok: false, stage: "auth", error: "Unauthorized" }, 401);
    }

    // 2) Read & validate secrets
    const AUTH_KEY = Deno.env.get("GIGACHAT_AUTH_KEY");
    const SCOPE = Deno.env.get("GIGACHAT_SCOPE");
    const OAUTH_URL = Deno.env.get("GIGACHAT_OAUTH_URL");
    const API_BASE_URL = Deno.env.get("GIGACHAT_API_BASE_URL");
    const MODEL = Deno.env.get("GIGACHAT_MODEL");

    const missing = Object.entries({
      GIGACHAT_AUTH_KEY: AUTH_KEY,
      GIGACHAT_SCOPE: SCOPE,
      GIGACHAT_OAUTH_URL: OAUTH_URL,
      GIGACHAT_API_BASE_URL: API_BASE_URL,
      GIGACHAT_MODEL: MODEL,
    })
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missing.length) {
      return json(
        { ok: false, stage: "config", error: "Missing secrets", missing },
        500,
      );
    }

    // 3) OAuth: получаем access_token
    const rqUid = crypto.randomUUID();
    console.log("OAuth request to:", OAUTH_URL, "scope:", SCOPE);
    let oauthRes: Response;
    try {
      oauthRes = await fetch(OAUTH_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          RqUID: rqUid,
          Authorization: `Basic ${AUTH_KEY}`,
        },
        body: new URLSearchParams({ scope: SCOPE! }).toString(),
      });
    } catch (e) {
      console.error("OAuth fetch failed:", e);
      return json(
        {
          ok: false,
          stage: "oauth_network",
          error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
          hint:
            "Если ошибка про сертификат/TLS — это сертификат Минцифры. GigaChat OAuth недоступен из Edge Runtime без отключения проверки TLS.",
        },
        502,
      );
    }

    const oauthText = await oauthRes.text();
    if (!oauthRes.ok) {
      return json(
        {
          ok: false,
          stage: "oauth",
          status: oauthRes.status,
          error: oauthText.slice(0, 500),
        },
        502,
      );
    }
    let accessToken: string | undefined;
    try {
      accessToken = JSON.parse(oauthText)?.access_token;
    } catch {
      return json(
        { ok: false, stage: "oauth", error: "Invalid OAuth JSON" },
        502,
      );
    }
    if (!accessToken) {
      return json(
        { ok: false, stage: "oauth", error: "No access_token in response" },
        502,
      );
    }

    // 4) Ping the chat completions endpoint
    const chatUrl = `${API_BASE_URL!.replace(/\/$/, "")}/chat/completions`;
    const chatRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: "Ответь одним словом: Привет",
          },
        ],
        temperature: 0,
        max_tokens: 16,
      }),
    });

    const chatText = await chatRes.text();
    if (!chatRes.ok) {
      return json(
        {
          ok: false,
          stage: "chat",
          status: chatRes.status,
          error: chatText.slice(0, 500),
        },
        502,
      );
    }

    let reply = "";
    let usage: unknown = null;
    try {
      const parsed = JSON.parse(chatText);
      reply = parsed?.choices?.[0]?.message?.content ?? "";
      usage = parsed?.usage ?? null;
    } catch {
      /* ignore parse errors, return raw */
    }

    return json({
      ok: true,
      model: MODEL,
      reply,
      usage,
      message: "GigaChat connection OK",
    });
  } catch (e) {
    console.error("gigachat-test exception:", e);
    return json(
      {
        ok: false,
        stage: "exception",
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      },
      500,
    );
  }
});
