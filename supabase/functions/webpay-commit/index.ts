// supabase/functions/webpay-commit/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const TBK_HOST = "https://webpay3g.transbank.cl"
const TBK_API_KEY_ID = Deno.env.get("WEBPAY_TBK_API_KEY_ID")
const TBK_API_KEY_SECRET =
  Deno.env.get("WEBPAY_TBK_API_KEY_SECRET")

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    const token_ws = body.token_ws

    if (!token_ws || typeof token_ws !== "string") {
      return jsonResponse({ error: "Required: token_ws (string)" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" },
        500,
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1) Commit TBK (PUT)
    const endpoint =
      `${TBK_HOST}/rswebpaytransaction/api/webpay/v1.2/transactions/${encodeURIComponent(token_ws)}`

    const tbkRes = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Tbk-Api-Key-Id": TBK_API_KEY_ID,
        "Tbk-Api-Key-Secret": TBK_API_KEY_SECRET,
      },
    })

    const tbk = await tbkRes.json().catch(() => ({}))

    if (!tbkRes.ok) {
      return jsonResponse(
        { error: "TBK commit failed", status: tbkRes.status, data: tbk },
        502,
      )
    }

    const isAuthorized =
      String(tbk?.status || "").toUpperCase() === "AUTHORIZED" &&
      Number(tbk?.response_code) === 0

    const internalStatus = isAuthorized ? "authorized" : "failed"
    const nowIso = new Date().toISOString()

    // 2) Traer transacciones asociadas a este token (para debt_ids y raw_payload)
    const { data: txs, error: txErr } = await supabase
      .from("payment_transactions")
      .select("id, debt_id, raw_payload")
      .eq("token_ws", token_ws)

    if (txErr) {
      return jsonResponse(
        { error: "Failed loading payment_transactions", details: txErr.message },
        500,
      )
    }

    const txIds = (txs ?? []).map((t) => t.id)
    const debtIds = (txs ?? [])
      .map((t) => t.debt_id)
      .filter((x) => typeof x === "number") as number[]

    // 3) Actualizar payment_transactions con resultado TBK
    await supabase
      .from("payment_transactions")
      .update({
        status: internalStatus,
        authorization_code: tbk.authorization_code ?? null,
        response_code: tbk.response_code ?? null,
        installments: tbk.installments_number ?? null,
        payment_type_code: tbk.payment_type_code ?? null,
        raw_response: tbk,
        updated_at: nowIso,
      })
      .eq("token_ws", token_ws)

    // 4) Si autorizado: crear/actualizar payment_methods (solo lo que se puede)
    let payment_method_id: number | null = null

    if (isAuthorized) {
      const firstPayload = txs?.[0]?.raw_payload ?? null
      const customer_id = firstPayload?.customer_id ?? null
      const company_id = firstPayload?.company_id ?? null

      // last4 (si viene)
      const last4 = tbk?.card_detail?.card_number
        ? String(tbk.card_detail.card_number).trim()
        : ""

      // 12 X + últimos 4
      const maskedCard = last4 ? `${"X".repeat(12)}${last4}` : null

      if (customer_id && company_id) {
        // Busca método existente (por cliente/empresa/webpay_plus)
        const { data: existing, error: existErr } = await supabase
          .from("payment_methods")
          .select("id")
          .eq("customer_id", customer_id)
          .eq("company_id", company_id)
          .eq("method_type", "webpay_plus")
          .maybeSingle()

        if (existErr) {
          console.warn("⚠️ payment_methods lookup error:", existErr.message)
        }

        if (existing?.id) {
          const { data: updPm, error: updErr } = await supabase
            .from("payment_methods")
            .update({
              active: true,
              card_number: maskedCard,
              updated_at: nowIso,
            })
            .eq("id", existing.id)
            .select("id")
            .maybeSingle()

          if (updErr) {
            console.warn("⚠️ payment_methods update error:", updErr.message)
          } else {
            payment_method_id = updPm?.id ?? existing.id
          }
        } else {
          const { data: insPm, error: insErr } = await supabase
            .from("payment_methods")
            .insert({
              company_id,
              customer_id,
              method_type: "webpay_plus",
              active: true,
              card_number: maskedCard,
              // lo demás NULL
            })
            .select("id")
            .maybeSingle()

          if (insErr) {
            console.warn("⚠️ payment_methods insert error:", insErr.message)
          } else {
            payment_method_id = insPm?.id ?? null
          }
        }

        // Linkear payment_transactions -> payment_method_id
        if (payment_method_id && txIds.length > 0) {
          await supabase
            .from("payment_transactions")
            .update({ payment_method_id, updated_at: nowIso })
            .in("id", txIds)
        }
      }
    }

    // ✅ 5) SI AUTORIZA: cambiar debts pending -> paid (SIEMPRE)
    let debtsUpdated = false

    if (isAuthorized && debtIds.length > 0) {
      const { error: updDebtsErr } = await supabase
        .from("debts")
        .update({ status: "paid", updated_at: nowIso })
        .in("id", debtIds)
        .eq("status", "pending") // evita tocar cosas raras

      if (updDebtsErr) {
        console.error("❌ updating debts to paid failed:", updDebtsErr.message)
      } else {
        debtsUpdated = true
      }
    }

    return jsonResponse(
      {
        status: tbk?.status ?? null,
        response_code: tbk?.response_code ?? null,
        internal_transaction_status: internalStatus,
        payment_method_id,
        debts_updated: debtsUpdated,
      },
      200,
    )
  } catch (e) {
    return jsonResponse({ error: "Unhandled error", message: String(e) }, 500)
  }
})
