// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.info("find-customer function started");

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { textTofind } = await req.json();

    if (!textTofind) {
      return response({ error: "Debe enviar national_id o product_code" });
    }

    const supabaseClient = createClient(
      // URL y KEY provistas por Supabase Runtime
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ Buscar por national_id en customers

      const { data: customer, error } = await supabaseClient
        .from("customers")
        .select("portal_token")
        .eq("national_id", removeDashAndDot(textTofind))
        .maybeSingle();

      if (error) console.error("Error customers:", error);

      if (customer?.portal_token) {
        return response({ customer_token: customer.portal_token });
      }
    

    // 2️⃣ Buscar por product_code en customer_products
    if (textTofind) {
      const { data: cp, error } = await supabaseClient
        .from("customer_products")
        .select("customer_id")
        .eq("product_code", textTofind)
        .maybeSingle();

      if (error) console.error("Error customer_products:", error);

      if (cp?.customer_id) {
        const { data: productCustomer, error: customerError } = await supabaseClient
          .from("customers")
          .select("portal_token")
          .eq("id", cp.customer_id)
          .maybeSingle();

        if (customerError) console.error("Error product customer:", customerError);

        if (productCustomer?.portal_token) {
          return response({ customer_token: productCustomer.portal_token });
        }
      }
    }

    // 3️⃣ Si no encuentra nada
    return response({ error: "no existe registro" });
  } catch (e) {
    console.error("Server error:", e);
    return response({ error: "Error interno" });
  }
});

/* ---------------------- Helpers -------------------------- */

function response(data: object) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}


function removeDashAndDot(str) {
  return str.replace(/[-.]/g, "");
}
