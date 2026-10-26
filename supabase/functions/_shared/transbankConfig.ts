import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type TransbankConfig = {
  credentialId: number | null;
  apiKeyId: string;
  apiKeySecret: string;
  childCommerceCode: string | null;
  source: "table" | "env";
};

const CLUB_PORTAL = "portal-pagos.clubdelseguro.cl";
const CHILD_COMMERCE_FALLBACK = "597052844543";

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!key) {
    try {
      key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? "";
    } catch {
      key = "";
    }
  }
  return createClient(url, key);
}

function envConfig(product: "oneclick_mall" | "webpay_plus"): TransbankConfig | null {
  if (product === "webpay_plus") {
    const apiKeyId = Deno.env.get("WEBPAY_TBK_API_KEY_ID") ?? "";
    const apiKeySecret = Deno.env.get("WEBPAY_TBK_API_KEY_SECRET") ?? "";
    if (!apiKeyId || !apiKeySecret) return null;
    return { credentialId: null, apiKeyId, apiKeySecret, childCommerceCode: null, source: "env" };
  }
  const apiKeyId = Deno.env.get("TBK_API_KEY_ID") ?? "";
  const apiKeySecret = Deno.env.get("TBK_API_KEY_SECRET") ?? "";
  const child = Deno.env.get("ONECLICK_CHILD_COMMERCE_CODE") || CHILD_COMMERCE_FALLBACK;
  if (!apiKeyId || !apiKeySecret) return null;
  return { credentialId: null, apiKeyId, apiKeySecret, childCommerceCode: child, source: "env" };
}

async function decryptSecret(valueBase64: string, ivBase64: string): Promise<string | null> {
  const keyBase64 = Deno.env.get("ENCRYPTION_KEY") ?? "";
  if (!keyBase64) return null;
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  if (keyBytes.length !== 32) return null;
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0)) },
    key,
    Uint8Array.from(atob(valueBase64), (c) => c.charCodeAt(0)),
  );
  return new TextDecoder().decode(plain);
}

export async function encryptSecret(plain: string): Promise<{ iv: string; data: string }> {
  const keyBase64 = Deno.env.get("ENCRYPTION_KEY") ?? "";
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  return { iv: toB64(iv), data: toB64(new Uint8Array(encrypted)) };
}

export async function getTransbankConfig(
  companyId: number | null,
  product: "oneclick_mall" | "webpay_plus",
): Promise<TransbankConfig | null> {
  try {
    if (companyId != null) {
      const supabase = serviceClient();
      const { data } = await supabase
        .from("company_payment_credentials")
        .select("id, api_key_id, api_key_secret_encrypted, api_key_secret_iv, child_commerce_code")
        .eq("company_id", companyId)
        .eq("product", product)
        .eq("environment", "production")
        .eq("active", true)
        .maybeSingle();
      if (data?.api_key_id && data.api_key_secret_encrypted && data.api_key_secret_iv) {
        if (product === "webpay_plus" || data.child_commerce_code) {
          const apiKeySecret = await decryptSecret(data.api_key_secret_encrypted, data.api_key_secret_iv);
          if (apiKeySecret) {
            return {
              credentialId: data.id,
              apiKeyId: data.api_key_id,
              apiKeySecret,
              childCommerceCode: data.child_commerce_code,
              source: "table",
            };
          }
        }
      }
    }
  } catch (err) {
    console.error("getTransbankConfig:", err instanceof Error ? err.message : "error");
  }
  if (companyId == null || Number(companyId) === 1) return envConfig(product);
  return null;
}

export async function getCredentialById(credentialId: number): Promise<TransbankConfig | null> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("company_payment_credentials")
    .select("id, api_key_id, api_key_secret_encrypted, api_key_secret_iv, child_commerce_code, product")
    .eq("id", credentialId)
    .maybeSingle();
  if (!data?.api_key_id || !data.api_key_secret_encrypted || !data.api_key_secret_iv) return null;
  const apiKeySecret = await decryptSecret(data.api_key_secret_encrypted, data.api_key_secret_iv);
  if (!apiKeySecret) return null;
  return {
    credentialId: data.id,
    apiKeyId: data.api_key_id,
    apiKeySecret,
    childCommerceCode: data.child_commerce_code,
    source: "table",
  };
}

export async function returnUrlAllowed(companyId: number, returnUrl: string): Promise<boolean> {
  const supabase = serviceClient();
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  const { data: company } = await supabase.from("companies").select("slug").eq("id", companyId).maybeSingle();
  const slug = typeof company?.slug === "string" ? company.slug : "";
  const { data: domains } = await supabase
    .from("company_domains")
    .select("hostname")
    .eq("company_id", companyId)
    .not("verified_at", "is", null);
  if ((domains ?? []).some((row) => row.hostname === host)) return true;
  if (slug && host === `${slug}.paid.cl`) return true;
  if (host === "paid.cl" && slug && (url.pathname === `/${slug}` || url.pathname.startsWith(`/${slug}/`))) {
    return true;
  }
  return companyId === 1 && host === CLUB_PORTAL;
}

export async function primaryPortalHost(companyId: number | null): Promise<string> {
  if (companyId == null) return CLUB_PORTAL;
  const supabase = serviceClient();
  const { data } = await supabase
    .from("company_domains")
    .select("hostname")
    .eq("company_id", companyId)
    .eq("is_primary", true)
    .not("verified_at", "is", null)
    .maybeSingle();
  if (data?.hostname) return data.hostname;
  if (companyId === 1) return CLUB_PORTAL;
  const { data: company } = await supabase.from("companies").select("slug").eq("id", companyId).maybeSingle();
  return company?.slug ? `${company.slug}.paid.cl` : "";
}
