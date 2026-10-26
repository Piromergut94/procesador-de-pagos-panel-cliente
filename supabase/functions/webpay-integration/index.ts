// supabase/functions/webpay-integration/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2"
import { getTransbankConfig, returnUrlAllowed } from "../_shared/transbankConfig.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const {
      buy_order,
      session_id,
      return_url,
      debt_ids,
      customer_token,
      payment_method_id = null,
    } = body

    if (!buy_order || typeof buy_order !== "string") {
      return jsonResponse({ error: "Required: buy_order (string)" }, 400)
    }
    if (!session_id || typeof session_id !== "string") {
      return jsonResponse({ error: "Required: session_id (string)" }, 400)
    }
    if (!return_url || typeof return_url !== "string") {
      return jsonResponse({ error: "Required: return_url (string)" }, 400)
    }
    if (!Array.isArray(debt_ids) || debt_ids.length === 0) {
      return jsonResponse({ error: "Required: debt_ids (non-empty array)" }, 400)
    }
    if (!customer_token || typeof customer_token !== "string") {
      return jsonResponse({ error: "Required: customer_token (string)" }, 400)
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

    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select("id")
      .eq("portal_token", customer_token)
      .maybeSingle()

    if (customerErr || !customer) {
      return jsonResponse({ error: "Invalid customer" }, 404)
    }

    // 1) Leer deudas desde BD (monto real)
    const { data: debts, error: debtsErr } = await supabase
      .from("debts")
      .select("id, amount, status, customer_id, company_id")
      .in("id", debt_ids)
      .eq("customer_id", customer.id)

    if (debtsErr) return jsonResponse({ error: "Failed loading debts", details: debtsErr.message }, 500)
    if (!debts || debts.length !== debt_ids.length) {
      return jsonResponse({ error: "Invalid debt selection" }, 400)
    }

    // opcional: bloquear si alguna ya está paid
    const alreadyPaid = debts.find((d) => String(d.status || "").toLowerCase() === "paid")
    if (alreadyPaid) return jsonResponse({ error: "One or more debts are already paid" }, 400)

    const totalAmount = debts.reduce((acc, d) => acc + Number(d.amount || 0), 0)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return jsonResponse({ error: "Invalid total amount" }, 400)
    }

    const companyIds = [...new Set(debts.map((d) => d.company_id).filter((id) => id != null))]
    if (companyIds.length > 1) {
      return jsonResponse({ error: "Las deudas no son de la misma empresa" }, 400)
    }
    const companyId = Number(companyIds[0] ?? 1)
    if (!(await returnUrlAllowed(companyId, return_url))) {
      return jsonResponse({ error: "return_url no pertenece a la empresa" }, 400)
    }
    const tbkConfig = await getTransbankConfig(companyId, "webpay_plus")
    if (!tbkConfig) {
      return jsonResponse({ error: "missing_payment_credentials" }, 409)
    }

    // 2) Crear en Transbank por el total
    const endpoint = `${TBK_HOST}/rswebpaytransaction/api/webpay/v1.2/transactions`

    const tbkRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Tbk-Api-Key-Id": tbkConfig.apiKeyId,
        "Tbk-Api-Key-Secret": tbkConfig.apiKeySecret,
      },
      body: JSON.stringify({
        buy_order,
        session_id,
        amount: totalAmount,
        return_url,
      }),
    })

    const tbkData = await tbkRes.json().catch(() => ({}))
    if (!tbkRes.ok) {
      return jsonResponse({ error: "TBK create failed", status: tbkRes.status, data: tbkData }, 502)
    }

    const token_ws = tbkData?.token
    const url = tbkData?.url
    if (!token_ws || !url) {
      return jsonResponse({ error: "TBK returned invalid response", data: tbkData }, 502)
    }

    // 3) Guardar payment_transactions (1 fila por deuda)
    const nowIso = new Date().toISOString()
    const company_id = debts.find((d) => d.company_id)?.company_id ?? null

    // recovery_source=payment_link desde el alta; notified_before se completa en webpay-commit si autoriza.
    const rows = debts.map((d) => ({
      ...(d.company_id != null ? { company_id: d.company_id } : {}),
      channel: "webpay",
      currency: "CLP",
      amount: Number(d.amount || 0),
      buy_order,
      commerce_buy_order: buy_order,
      status: "initiated",
      debt_id: d.id,
      payment_method_id,
      token_ws,
      ...(tbkConfig.credentialId ? { payment_credential_id: tbkConfig.credentialId } : {}),
      attempt_source: "unknown",
      recovery_source: "payment_link",
      notified_before: false,
      raw_payload: {
        customer_id: customer.id,
        company_id,
        debt_ids,
        session_id,
        return_url,
        amount_total: totalAmount,
      },
      raw_response: tbkData,
      updated_at: nowIso,
    }))

    const { error: insErr } = await supabase.from("payment_transactions").insert(rows)
    if (insErr) {
      // no rompemos el pago, pero registramos el error
      console.error("❌ insert payment_transactions failed:", insErr.message)
    }

    return jsonResponse({ token: token_ws, url, amount: totalAmount }, 200)
  } catch (e) {
    return jsonResponse({ error: "Unhandled error", message: String(e) }, 500)
  }
})
