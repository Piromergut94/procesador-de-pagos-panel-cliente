// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
console.log("Function started");
function normalizeName(name) {
  return name.normalize("NFD") // separa acentos
  .replace(/[\u0300-\u036f]/g, "") // elimina acentos
  .replace(/ñ/gi, "n") // reemplaza ñ por n
  .replace(/[^a-zA-Z0-9 ]/g, "") // elimina caracteres raros
  .trim().slice(0, 40); // limita a 40 caracteres
}
const encoder = new TextEncoder();
const keyBase64 = Deno.env.get("ENCRYPTION_KEY");
if (!keyBase64) {
  throw new Error("ENCRYPTION_KEY no está configurada");
}
const keyBytes = Uint8Array.from(atob(keyBase64), (c)=>c.charCodeAt(0));
Deno.serve(async (req)=>{
  // --- CORS ---
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const { tbk_token, customer_token } = body;
    if (!tbk_token) {
      return new Response(JSON.stringify({
        error: "tbk_token es obligatorio"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!customer_token) {
      return new Response(JSON.stringify({
        error: "customer_token es obligatorio"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // --- Crear cliente ---
    const supabaseClient = createClient(// URL y KEY provistas por Supabase Runtime
    Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: customer, error } = await supabaseClient
      .from("customers")
      .select("id, name, email, company_id")
      .eq("portal_token", customer_token)
      .single();
    if (error || !customer) {
      return new Response(JSON.stringify({
        error: "Customer not found"
      }), {
        status: 404
      });
    }
    const company_id = customer.company_id;
    // --- API TRANSBANK ---
    const url = `https://webpay3g.transbank.cl/rswebpaytransaction/api/oneclick/v1.2/inscriptions/${tbk_token}`;
    const tbkResponse = await fetch(url, {
      method: "PUT",
      headers: {
        "Tbk-Api-Key-Id": Deno.env.get("TBK_API_KEY_ID"),
        "Tbk-Api-Key-Secret": Deno.env.get("TBK_API_KEY_SECRET"),
        "Content-Type": "application/json"
      }
    });
    const obj = await tbkResponse.json();
    if (obj.response_code != 0) {
      return new Response(JSON.stringify({
        error: "Transbank error"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const encrypted = await encrypt(obj.tbk_user);
    const enrollmentName = normalizeName(customer.name || "");
    const enrollmentEmail = customer.email ?? null;
    // === UPSERT PAYMENT METHOD ===
    const { error: upsertErr } = await supabaseClient.from("payment_methods").upsert({
      company_id,
      customer_id: customer.id,
      tbk_user: encrypted.data,
      tbk_user_iv: encrypted.iv,
      method_type: "oneclick",
      card_brand: obj.card_type ?? null,
      card_number: obj.card_number,
      expiration_date: null,
      enrollment_name: enrollmentName,
      enrollment_email: enrollmentEmail,
      active: true,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "company_id,customer_id,tbk_user"
    });
    if (upsertErr) {
      console.error(upsertErr);
      return new Response(JSON.stringify({
        error: "Error saving payment method"
      }), {
        status: 500
      });
    }
    const payload = {
      customer: customer.id,
      card_type: obj.card_type,
      card_number: obj.card_number,
      gateway: "transbank_oneclick" // ej: "transbank"
    };
    const response = await fetch("https://api.clubdelseguro.cl/api/payment-methods/newPagosAttached", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    await response.json().catch(() => ({}));
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.log(err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
async function encrypt(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // recomendado para GCM
  const key = await getKey();
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv
  }, key, encoder.encode(text));
  return {
    iv: base64Encode(iv),
    data: base64Encode(encrypted)
  };
}
async function getKey() {
  return await crypto.subtle.importKey("raw", keyBytes, {
    name: "AES-GCM"
  }, false, [
    "encrypt",
    "decrypt"
  ]);
}
function base64Encode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
