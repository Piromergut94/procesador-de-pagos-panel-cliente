import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const customerToken = body?.customer_token;

    if (!customerToken || typeof customerToken !== "string") {
      return new Response(JSON.stringify({ error: "customer_token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? "")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("portal_token", customerToken)
      .maybeSingle();

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: "No se pudo obtener información" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("debts")
      .select(`
        id,
        amount,
        due_date,
        status,
        external_id,
        companies!debts_company_id_fkey(business_name),
        customer_products!debts_customer_product_id_fkey(patent)
      `)
      .eq("customer_id", customer.id)
      .is("deleted_at", null)
      .order("due_date", { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = (data ?? []).map((d: any) => ({
      id: d.id,
      amount: d.amount,
      due_date: d.due_date,
      status: d.status,
      external_id: d.external_id,

      company_name: d.companies?.business_name ?? null,

      patent: d.customer_products?.patent ?? null,
    }));

    return new Response(JSON.stringify({ total: items.length, items }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
