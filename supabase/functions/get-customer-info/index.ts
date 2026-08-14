// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
console.info("get-customer-products function initialized");

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(),
    });
  }

  try {
    const { customer_id } = await req.json();

    if (!customer_id) {
      return jsonResponse({ error: "Debe enviar customer_id" });
    }

    const supabaseClient = createClient(
      // URL y KEY provistas por Supabase Runtime
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: customer, errorCustomer } = await supabaseClient
      .from("customers")
      .select("id, name, national_id")
      .eq("id", customer_id)
      .single();

    if (errorCustomer) {
      console.error("Supabase customer error:", errorCustomer);
      return jsonResponse({ error: "Error al obtener cliente" });
    }

    // Buscar solo los productos activos y los campos usados por el frontend.
    const { data: customerProducts, error } = await supabaseClient
      .from("customer_products")
      .select("id, product_code")
      .eq("customer_id", customer_id)
      .is("deleted_at", null);


    if (error) {
      console.error("Supabase error:", error);
      return jsonResponse({ error: "Error al obtener productos" });
    }

    const { data: paymentMethod, error: paymentError } = await supabaseClient
      .from("payment_methods")
      .select("card_number, card_brand")
      .eq("customer_id", customer_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error("Supabase payment method error:", paymentError);
      return jsonResponse({ error: "Error al obtener medio de pago" });
    }

    const result = (customerProducts ?? []).map((product) => ({
      id: product.id,
      product_code: product.product_code,
      payment_method: paymentMethod ?? null,
    }));

    return jsonResponse({ customer: customer, customer_products: result });
  } catch (e) {
    console.error("Server error:", e);
    return jsonResponse({ error: "Error interno" });
  }
});

/* ---------------------- Helpers -------------------------- */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data: object) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
