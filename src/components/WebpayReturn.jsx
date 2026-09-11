import React, { useEffect, useMemo, useState } from "react"

export default function WebpayReturn() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const token = params.get("token_ws")

  const customerToken =
    params.get("customer_token") ||
    sessionStorage.getItem("last_customer_token") ||
    localStorage.getItem("last_customer_token")

  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState("info") // success | warn | error | info
  const [title, setTitle] = useState("Confirmando pago...")
  const [message, setMessage] = useState("Validando la transacción.")

  const goBack = () => {
    if (customerToken) {
      window.location.href = `/dashboard/${encodeURIComponent(customerToken)}`
      return
    }
    window.location.href = "/"
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setKind("warn")
      setTitle("Pago cancelado")
      setMessage("El pago no se completó.")
      return
    }

    const commit = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webpay-commit`

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_SERVICE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ANON_KEY}`,
          },
          body: JSON.stringify({ token_ws: token }),
        })

        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          const msg =
            json?.data?.error_message ||
            json?.error ||
            "No se pudo confirmar el pago."

          setLoading(false)
          setKind("error")
          setTitle("No pudimos confirmar el pago")
          setMessage(msg)
          return
        }

        const ok =
          (json.status || "").toUpperCase() === "AUTHORIZED" &&
          Number(json.response_code) === 0

        setLoading(false)

        if (ok) {
          setKind("success")
          setTitle("Pago aprobado ✅")
          setMessage("Confirmado exitosamente.")
        } else {
          setKind("warn")
          setTitle("Pago no aprobado")
          setMessage("El pago no fue aprobado.")
        }
      } catch (e) {
        console.error("WEBPAY COMMIT ERROR:", e)
        setLoading(false)
        setKind("error")
        setTitle("Error inesperado")
        setMessage("Falló la confirmación del pago.")
      }
    }

    commit()
  }, [token])

  const ui = useMemo(() => {
    const badge = {
      info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
      success: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
      warn: { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
      error: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
    }[kind] || { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" }

    return {
      page: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#ffffff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        color: "#111827",
      },
      card: {
        width: "min(560px, 100%)",
        borderRadius: 18,
        padding: 26,
        background: "#fff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 34px rgba(0,0,0,0.10)",
      },
      top: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
      },
      badge: {
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: badge.bg,
        border: `1px solid ${badge.border}`,
        color: badge.text,
        fontSize: 12,
        fontWeight: 800,
      },
      button: {
        border: "1px solid #e5e7eb",
        background: "#fff",
        padding: "10px 14px",
        borderRadius: 12,
        cursor: "pointer",
        fontWeight: 700,
        color: "#111827",
      },
      primary: {
        border: "1px solid #f97316",
        background: "#f97316",
        padding: "10px 14px",
        borderRadius: 12,
        cursor: "pointer",
        fontWeight: 800,
        color: "#111827",
      },
      title: {
        margin: 0,
        fontSize: 30,
        lineHeight: 1.15,
        letterSpacing: -0.2,
      },
      message: {
        marginTop: 10,
        marginBottom: 0,
        fontSize: 15,
        color: "#374151",
        whiteSpace: "pre-line",
      },
      actions: {
        marginTop: 16,
        display: "flex",
        gap: 10,
      },
    }
  }, [kind])

  const showRetry = !loading && kind !== "success"

  return (
    <div style={ui.page}>
      <div style={ui.card}>
        <div style={ui.top}>
          <span style={ui.badge}>{loading ? "Procesando" : "Resultado"}</span>
          <button style={ui.button} onClick={goBack}>
            Volver
          </button>
        </div>

        <h2 style={ui.title}>{title}</h2>
        <p style={ui.message}>{message}</p>

        {showRetry && (
          <div style={ui.actions}>
            <button style={ui.primary} onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
