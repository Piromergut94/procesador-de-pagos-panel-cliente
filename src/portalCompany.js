export const CLUB_HOST = "portal-pagos.clubdelseguro.cl";
export const RESOLVE_URL =
  "https://ovukfntlauhftpwymvdr.supabase.co/functions/v1/resolve-portal-company";

const RESERVED = new Set([
  "dashboard",
  "payment-success",
  "transbank-redirect",
  "webpay",
  "politica-privacidad",
  "www",
  "app",
  "admin",
  "api",
  "panel",
]);

export function portalLocation(hostname, pathname) {
  const host = String(hostname || "").toLowerCase().split(":")[0];
  if (host === "localhost" || host === "127.0.0.1" || host === CLUB_HOST) {
    return { mode: "current", sendSlug: false, slug: null };
  }
  if (host.endsWith(".paid.cl") && host !== "www.paid.cl") {
    const slug = host.slice(0, -".paid.cl".length);
    if (!slug || slug.includes(".") || RESERVED.has(slug)) return { mode: "unknown" };
    return { mode: "subdomain", slug, sendSlug: true };
  }
  if (host === "paid.cl" || host === "www.paid.cl") {
    const slug = String(pathname || "").split("/").filter(Boolean)[0] || "";
    if (!slug || RESERVED.has(slug)) return { mode: "neutral" };
    return { mode: "path", slug, sendSlug: true };
  }
  return { mode: "custom", sendSlug: true, hostname: host };
}

export async function resolvePortalCompany({ hostname, slug }) {
  const response = await fetch(RESOLVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hostname: hostname || null,
      slug: slug || null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.slug) return null;
  return data;
}
