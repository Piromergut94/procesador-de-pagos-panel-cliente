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
    const body = await req.json();
    const textTofind = body?.textTofind;
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

    if (!textTofind) {
      return response({ error: "Debe enviar national_id o product_code" });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? "")!
    );

    let companyId = null;
    if (slug) {
      const { data: resolved, error: resolveErr } = await supabaseClient.rpc(
        "resolve_portal_company",
        { p_hostname: null, p_slug: slug },
      );
      const row = Array.isArray(resolved) ? resolved[0] : resolved;
      if (resolveErr || !row?.company_id) {
        return response({ error: "Empresa no encontrada" });
      }
      companyId = row.company_id;
    }

    let customerQuery = supabaseClient
      .from("customers")
      .select("portal_token")
      .eq("national_id", removeDashAndDot(textTofind));
    if (companyId != null) customerQuery = customerQuery.eq("company_id", companyId);
    const { data: customer, error } = await customerQuery.maybeSingle();

      if (error) console.error("Error customers:", error);

      if (customer?.portal_token) {
        return response({ customer_token: customer.portal_token });
      }
    

    // 2️⃣ Buscar por product_code en customer_products
    if (textTofind) {
      let productQuery = supabaseClient
        .from("customer_products")
        .select("customer_id")
        .eq("product_code", textTofind);
      if (companyId != null) productQuery = productQuery.eq("company_id", companyId);
      const { data: cp, error } = await productQuery.maybeSingle();

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
