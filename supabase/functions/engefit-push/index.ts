// ENGEFIT · Edge Function "engefit-push": envia os lembretes (Web Push).
// Publicar no Supabase: Edge Functions › Deploy a new function › Via Editor › nome "engefit-push",
// colar este arquivo e DESLIGAR "Verify JWT" (a proteção é a senha x-engefit-cron, gerada no banco).
//
// - Na primeira execução gera as chaves VAPID e guarda em public.push_cfg (só o servidor lê).
// - ?setup=1 apenas garante que as chaves existem (não envia nada).
// - Sem ?setup: exige o cabeçalho x-engefit-cron igual a push_cfg.cron_secret; pede ao banco quem deve
//   receber lembrete agora (public.engefit_lembretes) e envia. Inscrições canceladas (404/410) são apagadas.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

type Cfg = { vapid_pub: string | null; vapid_priv: string | null; cron_secret: string };
const COLS = "vapid_pub,vapid_priv,cron_secret";

async function cfg(): Promise<Cfg> {
  const { data, error } = await sb.from("push_cfg").select(COLS).eq("id", 1).single();
  if (error) throw error;
  if (data.vapid_pub && data.vapid_priv) return data as Cfg;
  const k = webpush.generateVAPIDKeys();
  // só grava se ainda estiver vazio (evita duas chamadas simultâneas gerarem chaves diferentes)
  const { data: d2, error: e2 } = await sb.from("push_cfg")
    .update({ vapid_pub: k.publicKey, vapid_priv: k.privateKey })
    .eq("id", 1).is("vapid_pub", null).select(COLS).maybeSingle();
  if (e2) throw e2;
  if (d2) return d2 as Cfg;
  const { data: d3, error: e3 } = await sb.from("push_cfg").select(COLS).eq("id", 1).single();
  if (e3) throw e3;
  return d3 as Cfg;
}

type Msg = { endpoint: string; p256dh: string; auth: string; title: string; body: string; tag: string; url: string };

Deno.serve(async (req) => {
  try {
    const c = await cfg();
    if (new URL(req.url).searchParams.get("setup") === "1") return json({ ok: true, chave: c.vapid_pub });
    if (req.headers.get("x-engefit-cron") !== c.cron_secret) return json({ erro: "não autorizado" }, 401);

    webpush.setVapidDetails("https://engefit.vercel.app", c.vapid_pub!, c.vapid_priv!);
    const { data, error } = await sb.rpc("engefit_lembretes");
    if (error) throw error;
    const due = (data ?? []) as Msg[];
    let enviados = 0, descartados = 0;
    await Promise.all(due.map(async (m) => {
      try {
        await webpush.sendNotification(
          { endpoint: m.endpoint, keys: { p256dh: m.p256dh, auth: m.auth } },
          JSON.stringify({ title: m.title, body: m.body, tag: m.tag, url: m.url }),
          { TTL: 3 * 3600, urgency: "normal" },
        );
        enviados++;
      } catch (e) {
        const sc = (e as { statusCode?: number }).statusCode;
        if (sc === 404 || sc === 410) {
          descartados++;
          await sb.rpc("engefit_push_descartar", { p_endpoint: m.endpoint });
        } else console.error("push falhou", sc, (e as Error).message);
      }
    }));
    return json({ total: due.length, enviados, descartados });
  } catch (e) {
    console.error(e);
    return json({ erro: String((e as Error)?.message ?? e) }, 500);
  }
});
