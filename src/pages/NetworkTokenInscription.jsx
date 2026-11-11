import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Card, EvervaultProvider } from '@evervault/react'
import './NetworkTokenInscription.css'

const SUPABASE_URL = 'https://ovukfntlauhftpwymvdr.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ANON_KEY

function NetworkTokenInscription() {
  const { customer_token: tokenParam } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state || {}
  const customerToken = routeState.customer_token || tokenParam
  const evervaultAppId = routeState.evervault_app_id || ''
  const evervaultTeamId = routeState.evervault_team_id || undefined

  const [cardPayload, setCardPayload] = useState(null)
  const [holderName, setHolderName] = useState('')
  const [rut, setRut] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [enrolled, setEnrolled] = useState(null)

  const canSubmit = useMemo(() => {
    const card = cardPayload?.card
    return Boolean(
      customerToken &&
        evervaultAppId &&
        card?.number &&
        card?.expiry?.month != null &&
        card?.expiry?.year != null &&
        holderName.trim() &&
        rut.trim() &&
        !submitting
    )
  }, [cardPayload, customerToken, evervaultAppId, holderName, rut, submitting])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const card = cardPayload.card
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/finish-inscription-network-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(SUPABASE_ANON_KEY
              ? {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                }
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
              name: holderName.trim(),
              identification: { type: 'RUT', number: rut.trim() },
            },
          }),
        }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.status !== 'success') {
        throw new Error(payload.message || 'No se pudo inscribir el medio de pago')
      }
      setEnrolled(payload.object)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!customerToken || !evervaultAppId) {
    return (
      <div className="mp-inscription">
        <p>Sesión de inscripción inválida. Volvé al dashboard.</p>
        <button type="button" onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>
    )
  }

  if (enrolled) {
    return (
      <div className="mp-inscription">
        <h1>Medio de pago inscrito</h1>
        <p>
          {enrolled.brand || 'Tarjeta'} terminada en {enrolled.last_four || '****'}
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
      <EvervaultProvider
        appId={evervaultAppId}
        {...(evervaultTeamId ? { teamId: evervaultTeamId } : {})}
      >
        <form onSubmit={handleSubmit} className="mp-inscription-form">
          <label>
            Nombre del titular
            <input
              value={holderName}
              onChange={(event) => setHolderName(event.target.value)}
              autoComplete="cc-name"
              placeholder="Como figura en la tarjeta"
              required
            />
          </label>
          <label>
            RUT
            <input
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              inputMode="text"
              autoComplete="off"
              placeholder="12.345.678-9"
              required
            />
          </label>
          <div className="nt-evervault-card">
            <Card theme="clean" onChange={setCardPayload}>
              <Card.Number label="Número de tarjeta" />
              <Card.Row>
                <Card.ExpiryMonth label="Mes" />
                <Card.ExpiryYear label="Año" />
                <Card.Cvc label="CVC" />
              </Card.Row>
            </Card>
          </div>
          {error ? <p className="mp-inscription-error">{error}</p> : null}
          <button type="submit" disabled={!canSubmit}>
            {submitting ? 'Inscribiendo…' : 'Inscribir'}
          </button>
        </form>
      </EvervaultProvider>
    </div>
  )
}

export default NetworkTokenInscription
