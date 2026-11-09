import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { EvervaultProvider, Card } from '@evervault/react'
import './MercadoPagoInscription.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ANON_KEY

/**
 * Inscripción Network Token: Evervault Card (PCI iframe) → finish-inscription-network-token.
 */
function NetworkTokenInscription() {
  const { customer_token: paramToken } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state || {}

  const customerToken = state.customer_token || paramToken
  const appId = state.evervault_app_id || ''
  const teamId = state.evervault_team_id || undefined

  const [cardPayload, setCardPayload] = useState(null)
  const [name, setName] = useState('')
  const [rut, setRut] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const canSubmit = useMemo(() => {
    const card = cardPayload?.card
    return Boolean(
      customerToken &&
        appId &&
        card?.number &&
        card?.expiry?.month != null &&
        card?.expiry?.year != null &&
        name.trim() &&
        rut.trim() &&
        !submitting,
    )
  }, [cardPayload, customerToken, appId, name, rut, submitting])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const card = cardPayload.card
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/finish-inscription-network-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ANON_KEY
              ? { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
              : {}),
          },
          body: JSON.stringify({
            customer_token: customerToken,
            card: {
              number: card.number,
              expiry: {
                month: card.expiry.month,
                year: card.expiry.year,
              },
              cvc: card.cvc,
            },
            cardholder: {
              name: name.trim(),
              identification: { type: 'RUT', number: rut.trim() },
            },
          }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'No se pudo inscribir el medio de pago')
      }
      setDone(data.object)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!customerToken || !appId) {
    return (
      <div className="mp-inscription">
        <p>Sesión de inscripción inválida. Volvé al dashboard.</p>
        <button type="button" onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mp-inscription">
        <h1>Medio de pago inscrito</h1>
        <p>
          {done.brand || 'Tarjeta'} terminada en {done.last_four || '****'}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/dashboard/${customerToken}`)}
        >
          Ir al dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="mp-inscription">
      <h1>Inscribir medio de pago</h1>
      <p className="mp-inscription-note">
        Los datos de la tarjeta se cargan de forma segura (Evervault). No
        almacenamos el número en claro.
      </p>

      <EvervaultProvider appId={appId} {...(teamId ? { teamId } : {})}>
        <form onSubmit={onSubmit} className="mp-inscription-form">
          <label>
            Nombre del titular
            <input
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              autoComplete="cc-name"
              required
            />
          </label>
          <label>
            RUT
            <input
              value={rut}
              onChange={(ev) => setRut(ev.target.value)}
              required
            />
          </label>

          <div className="nt-evervault-card">
            <Card onChange={setCardPayload}>
              <Card.Number label="Número de tarjeta" />
              <Card.Row>
                <Card.ExpiryMonth label="Mes" />
                <Card.ExpiryYear label="Año" />
                <Card.Cvc label="CVC" />
              </Card.Row>
            </Card>
          </div>

          {error && <p className="mp-inscription-error">{error}</p>}

          <button type="submit" disabled={!canSubmit}>
            {submitting ? 'Inscribiendo…' : 'Inscribir'}
          </button>
        </form>
      </EvervaultProvider>
    </div>
  )
}

export default NetworkTokenInscription
