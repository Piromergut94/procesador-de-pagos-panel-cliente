// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
console.info('server started');
function normalizeName(name) {
  return name.normalize("NFD") // separa acentos
  .replace(/[\u0300-\u036f]/g, "") // elimina acentos
  .replace(/ñ/gi, "n") // reemplaza ñ por n
  .replace(/[^a-zA-Z0-9 ]/g, "") // elimina caracteres raros
  .trim().slice(0, 40); // limita a 40 caracteres
}
Deno.serve(async (req)=>{
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true"
  };
  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const supabaseClient = createClient(// URL y KEY provistas por Supabase Runtime
  Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization")
      }
    }
  });
  const { customer_token } = await req.json();
  if (!customer_token) {
    return new Response(JSON.stringify({
      status: "error",
      message: "Debe enviar customer_token"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const { data: customer, errorCustomer } = await supabaseClient
    .from("customers")
    .select("id, name, email, portal_token")
    .eq("portal_token", customer_token)
    .single();
  if (errorCustomer || !customer) {
    return new Response(JSON.stringify({
      status: "error",
      message: "No se pudo obtener customer"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const url = "https://webpay3g.transbank.cl/rswebpaytransaction/api/oneclick/v1.2/inscriptions";
  const payload = {
    username: normalizeName(customer.name || ""),
    email: customer.email ?? null,
    response_url: "https://portal-pagos.clubdelseguro.cl/payment-success/" + customer.portal_token
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Tbk-Api-Key-Id": Deno.env.get("TBK_API_KEY_ID"),
      "Tbk-Api-Key-Secret": Deno.env.get("TBK_API_KEY_SECRET"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  const res = {
    status: 'success',
    object: data
  };
  return new Response(JSON.stringify(res), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
});
