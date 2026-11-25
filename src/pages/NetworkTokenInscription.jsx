import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { EvervaultProvider, Card } from '@evervault/react'
import { useCompany } from '../CompanyContext'
import './NetworkTokenInscription.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ANON_KEY
const CLUB_LOGO =
  'https://ovukfntlauhftpwymvdr.supabase.co/storage/v1/object/public/assets/logo-cds.jpeg'

const FAILURE_REASONS = [
  'Sin cupo disponible',
  'Bloqueo del banco',
  'Tarjeta perdida o robada',
  'Tarjeta reemplazada',
]

/* ---------- Iconos (trazo, heredan color) ---------- */

function IconLock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function IconCheck({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function IconAlert({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function IconShield({ size = 22, plus = false, check = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
      {plus ? <path d="M12 9v6M9 12h6" /> : null}
      {check ? <path d="M8.5 12l2.5 2.5 4.5-5" /> : null}
    </svg>
  )
}

function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconBack({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function IconBulb({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
    </svg>
  )
}

/* ---------- Piezas ---------- */

function brandLabel(brand) {
  const value = String(brand || '').toLowerCase()
  if (value.includes('visa')) return 'VISA'
  if (value.includes('master')) return 'MC'
  if (value.includes('amex') || value.includes('american')) return 'AMEX'
  return value ? value.toUpperCase().slice(0, 6) : 'TARJETA'
}

function BrandBadge({ brand }) {
  return <span className="nt-badge">{brandLabel(brand)}</span>
}

function CardSummary({ card, role }) {
  return (
    <div className="nt-card-row">
      <BrandBadge brand={card?.brand} />
      <div className="nt-card-row-text">
        <span className="nt-mono">•••• {card?.last_four || '••••'}</span>
        {role === 'primary' ? <span className="nt-muted-sm">Se cobra primero</span> : null}
        {role === 'backup' ? <span className="nt-muted-sm">Solo si falla la principal</span> : null}
      </div>
      {role === 'primary' ? <span className="nt-pill nt-pill-ok">Principal</span> : null}
      {role === 'backup' ? <span className="nt-pill nt-pill-accent">Respaldo</span> : null}
    </div>
  )
}

function CardPreview({ payload, holder }) {
  const card = payload?.card || {}
  const lastFour = card.lastFour || card.last_four
  const brand = card.brand
  return (
    <div className="nt-preview" aria-hidden="true">
      <div className="nt-preview-ring" />
      <div className="nt-preview-top">
        <div className="nt-preview-chip" />
        <span className="nt-preview-brand">{brand ? brandLabel(brand) : 'CRÉDITO O DÉBITO'}</span>
      </div>
      <div className="nt-preview-number nt-mono">
        •••• •••• •••• {lastFour || '••••'}
      </div>
      <div className="nt-preview-bottom">
        <div className="nt-preview-field">
          <span>TITULAR</span>
          <strong>{holder?.trim() ? holder.trim().toUpperCase() : 'NOMBRE APELLIDO'}</strong>
        </div>
      </div>
    </div>
  )
}

function Shell({ company, children, onBack }) {
  const name = company?.branding?.display_name || 'Club del Seguro'
  const logo = company?.branding?.logo_url || (company?.mode === 'current' ? CLUB_LOGO : '')
  return (
    <div className="nt-inscription">
      <div className="nt-wrap">
        <div className="nt-topbar">
          {onBack ? (
            <button type="button" className="nt-icon-btn" onClick={onBack} aria-label="Volver">
              <IconBack />
            </button>
          ) : (
            <div className="nt-merchant">
              {logo ? (
                <img src={logo} alt="" className="nt-merchant-logo" />
              ) : (
                <span className="nt-merchant-initials">{name.slice(0, 2).toUpperCase()}</span>
              )}
              <div className="nt-merchant-text">
                <strong>{name}</strong>
                <span>Pago automático de tu póliza</span>
              </div>
            </div>
          )}
          <span className="nt-secure">
            <IconLock size={14} />
            Conexión segura
          </span>
        </div>
        {children}
        <p className="nt-footnote">
          Procesado por <strong>PAID</strong>
        </p>
      </div>
    </div>
  )
}

/* ---------- Pantalla principal ---------- */

/**
 * Inscripción Network Token: Evervault Card (PCI iframe) → finish-inscription-network-token.
 *
 * Flujo: formulario → éxito (con invitación a tarjeta de respaldo) | error.
 * Respaldo: formulario corto → cobertura protegida | error.
 * La tarjeta de respaldo se envía con card_role: 'backup' y solo se ofrece
 * cuando portal-payment-options devuelve backup_card_enabled: true.
 */
function NetworkTokenInscription() {
  const { customer_token: paramToken } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const company = useCompany()
  const state = location.state || {}

  const customerToken = state.customer_token || paramToken
  const appId = state.evervault_app_id || ''
  const teamId = state.evervault_team_id || undefined
  const backupEnabled = state.backup_card_enabled === true
  const merchantName = company?.branding?.display_name || 'Club del Seguro'

  // step: 'form' | 'success' | 'error' | 'backup-form' | 'backup-success' | 'backup-error'
  const [step, setStep] = useState('form')
  const [cardPayload, setCardPayload] = useState(null)
  const [cardKey, setCardKey] = useState(0)
  const [name, setName] = useState('')
  const [rut, setRut] = useState('')
  const [consent, setConsent] = useState(false)
  const [sameHolder, setSameHolder] = useState(true)
  const [backupName, setBackupName] = useState('')
  const [backupRut, setBackupRut] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorDetail, setErrorDetail] = useState(null)
  const [primaryCard, setPrimaryCard] = useState(null)
  const [backupCard, setBackupCard] = useState(null)

  const isBackup = step.startsWith('backup')
  const holderName = isBackup && !sameHolder ? backupName : name
  const holderRut = isBackup && !sameHolder ? backupRut : rut

  const dashboardPath =
    company?.mode === 'path' && company?.slug
      ? `/${company.slug}/dashboard/${customerToken}`
      : `/dashboard/${customerToken}`

  const canSubmit = useMemo(() => {
    const card = cardPayload?.card
    return Boolean(
      customerToken &&
        appId &&
        card?.number &&
        card?.expiry?.month != null &&
        card?.expiry?.year != null &&
        holderName.trim() &&
        holderRut.trim() &&
        consent &&
        !submitting,
    )
  }, [cardPayload, customerToken, appId, holderName, holderRut, consent, submitting])

  const resetCard = () => {
    setCardPayload(null)
    setCardKey((k) => k + 1)
  }

  const goTo = (next, { keepConsent = false } = {}) => {
    resetCard()
    if (!keepConsent) setConsent(false)
    setErrorDetail(null)
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setErrorDetail(null)
    const role = isBackup ? 'backup' : 'primary'
    try {
      const card = cardPayload.card
      const response = await fetch(
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
            ...(role === 'backup' ? { card_role: 'backup' } : {}),
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
              identification: { type: 'RUT', number: holderRut.trim() },
            },
          }),
        },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.status !== 'success') {
        const detail =
          data?.validation?.status_detail ||
          data?.validation?.status ||
          null
        const base = data.message || 'No se pudo inscribir el medio de pago'
        throw new Error(detail ? `${base} (${detail})` : base)
      }
      const result = data.object || {}
      if (role === 'backup') {
        setBackupCard(result)
        setStep('backup-success')
      } else {
        setPrimaryCard(result)
        setStep('success')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : String(err))
      setStep(role === 'backup' ? 'backup-error' : 'error')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!customerToken || !appId) {
    return (
      <Shell company={company}>
        <section className="nt-panel nt-center">
          <h1 className="nt-title">Sesión de inscripción inválida</h1>
          <p className="nt-lead">Vuelve a tu cuenta e intenta inscribir tu tarjeta nuevamente.</p>
          <button type="button" className="nt-btn-primary" onClick={() => navigate(-1)}>
            Volver
          </button>
        </section>
      </Shell>
    )
  }

  /* ----- Éxito tarjeta principal (+ invitación a respaldo) ----- */
  if (step === 'success') {
    return (
      <Shell company={company}>
        <section className="nt-panel">
          <div className="nt-success-head">
            <div className="nt-status-icon nt-status-ok nt-status-sm">
              <IconCheck size={28} />
            </div>
            <div>
              <h1 className="nt-title nt-title-sm">¡Tu tarjeta quedó inscrita!</h1>
              <p className="nt-lead nt-lead-sm">Tu prima se cobrará automáticamente cada mes.</p>
            </div>
          </div>

          <dl className="nt-summary">
            <div>
              <dt>Tarjeta principal</dt>
              <dd>
                <BrandBadge brand={primaryCard?.brand} />
                <span className="nt-mono">•••• {primaryCard?.last_four || '••••'}</span>
              </dd>
            </div>
            <div>
              <dt>Titular</dt>
              <dd>{name.trim()}</dd>
            </div>
          </dl>

          {backupEnabled ? (
            <>
              <div className="nt-invite">
                <div className="nt-invite-head">
                  <div className="nt-invite-icon">
                    <IconShield plus />
                  </div>
                  <div>
                    <span className="nt-eyebrow">Recomendado</span>
                    <h2 className="nt-invite-title">No te quedes sin cobertura por un cobro fallido</h2>
                  </div>
                </div>
                <p className="nt-body">
                  Cualquier tarjeta puede fallar en algún momento. Si el cobro no resulta, tu
                  póliza podría quedar impaga y perder su cobertura. Con una tarjeta de respaldo,
                  intentamos con ella antes de que eso pase.
                </p>
                <ul className="nt-chips" aria-label="Motivos comunes de rechazo">
                  {FAILURE_REASONS.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <p className="nt-check-line">
                  <span className="nt-ok-text"><IconCheck size={18} /></span>
                  <span>
                    Solo la usamos si falla tu tarjeta principal.{' '}
                    <strong>Nunca cobramos dos veces la misma prima.</strong>
                  </span>
                </p>
                <button type="button" className="nt-btn-primary" onClick={() => goTo('backup-form')}>
                  <IconPlus />
                  Agregar tarjeta de respaldo
                </button>
                <span className="nt-hint">Toma menos de un minuto</span>
              </div>
              <button type="button" className="nt-btn-link" onClick={() => navigate(dashboardPath)}>
                Ahora no, volver a mi cuenta
              </button>
            </>
          ) : (
            <button type="button" className="nt-btn-primary" onClick={() => navigate(dashboardPath)}>
              Volver a mi cuenta
            </button>
          )}
        </section>
      </Shell>
    )
  }

  /* ----- Cobertura protegida (principal + respaldo) ----- */
  if (step === 'backup-success') {
    return (
      <Shell company={company}>
        <section className="nt-panel">
          <div className="nt-center">
            <div className="nt-status-icon nt-status-ok">
              <IconShield size={36} check />
            </div>
            <h1 className="nt-title">Tu cobertura quedó protegida</h1>
            <p className="nt-lead">Ahora tienes dos tarjetas inscritas. Si una falla, tu seguro sigue vigente.</p>
          </div>

          <div className="nt-card-list">
            <CardSummary card={primaryCard} role="primary" />
            <CardSummary card={backupCard} role="backup" />
          </div>

          <div className="nt-steps">
            <span className="nt-eyebrow nt-eyebrow-muted">Cómo funciona cada mes</span>
            <ol>
              <li>Cobramos la prima en tu tarjeta principal.</li>
              <li>Si no resulta, la cobramos en tu tarjeta de respaldo.</li>
              <li>Te avisamos qué tarjeta usamos. Nunca cobramos dos veces la misma prima.</li>
            </ol>
          </div>

          <button type="button" className="nt-btn-primary" onClick={() => navigate(dashboardPath)}>
            Volver a mi cuenta
          </button>
        </section>
      </Shell>
    )
  }

  /* ----- Error (principal o respaldo) ----- */
  if (step === 'error' || step === 'backup-error') {
    const retryStep = step === 'backup-error' ? 'backup-form' : 'form'
    return (
      <Shell company={company}>
        <section className="nt-panel">
          <div className="nt-center">
            <div className="nt-status-icon nt-status-error">
              <IconAlert />
            </div>
            <h1 className="nt-title">
              {step === 'backup-error'
                ? 'No pudimos inscribir tu tarjeta de respaldo'
                : 'No pudimos inscribir tu tarjeta'}
            </h1>
            <p className="nt-lead">
              {step === 'backup-error'
                ? 'Tu tarjeta principal sigue inscrita. Puedes intentar con otra tarjeta de respaldo.'
                : 'El banco o el procesador no aprobó la inscripción de esta tarjeta.'}
            </p>
          </div>

          {errorDetail ? (
            <p className="nt-error-detail">
              <span>Detalle:</span> {errorDetail}
            </p>
          ) : null}

          <div className="nt-steps">
            <span className="nt-eyebrow nt-eyebrow-muted">Qué puedes hacer</span>
            <ol>
              <li>Revisa que el número, el vencimiento y el código de seguridad estén bien escritos.</li>
              <li>Prueba con otra tarjeta de crédito o débito, Visa o Mastercard.</li>
              <li>Si el problema sigue, consulta con tu banco: puede tener bloqueadas las compras por internet o los pagos automáticos.</li>
            </ol>
          </div>

          <div className="nt-actions">
            <button type="button" className="nt-btn-primary" onClick={() => goTo(retryStep, { keepConsent: true })}>
              Probar con otra tarjeta
            </button>
            {step === 'backup-error' ? (
              <button type="button" className="nt-btn-secondary" onClick={() => navigate(dashboardPath)}>
                Omitir por ahora
              </button>
            ) : (
              <button type="button" className="nt-btn-secondary" onClick={() => goTo('form', { keepConsent: true })}>
                Revisar mis datos
              </button>
            )}
          </div>
        </section>
      </Shell>
    )
  }

  /* ----- Formulario (principal o respaldo) ----- */
  return (
    <Shell company={company} onBack={isBackup ? () => goTo('success', { keepConsent: true }) : undefined}>
      <section className="nt-panel">
        <div className="nt-heading">
          <h1 className="nt-title">
            {isBackup ? 'Agrega tu tarjeta de respaldo' : 'Inscribe tu tarjeta'}
          </h1>
          <p className="nt-lead">
            {isBackup
              ? 'Si un mes no podemos cobrar en tu tarjeta principal, usamos esta para que tu póliza siga vigente.'
              : 'Tu prima se cobrará automáticamente cada mes. Puedes cambiar la tarjeta cuando quieras.'}
          </p>
        </div>

        {isBackup ? (
          <>
            <div className="nt-card-list">
              <CardSummary card={primaryCard} role="primary" />
              <div className="nt-card-row nt-card-row-new">
                <span className="nt-accent-text"><IconPlus size={20} /></span>
                <span className="nt-card-row-new-label">Tarjeta de respaldo</span>
                <span className="nt-pill nt-pill-accent">Respaldo</span>
              </div>
            </div>
            <p className="nt-tip">
              <IconBulb />
              <span>
                <strong>Consejo:</strong> usa una tarjeta de otro banco. Si un banco tiene problemas, el otro te respalda.
              </span>
            </p>
          </>
        ) : (
          <CardPreview payload={cardPayload} holder={name} />
        )}

        <EvervaultProvider appId={appId} {...(teamId ? { teamId } : {})}>
          <form onSubmit={onSubmit} className="nt-inscription-form">
            {!isBackup ? (
              <>
                <label className="nt-field">
                  Nombre del titular
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="cc-name"
                    placeholder="Como aparece en la tarjeta"
                    required
                  />
                </label>
                <label className="nt-field">
                  RUT del titular
                  <input
                    value={rut}
                    onChange={(event) => setRut(event.target.value)}
                    inputMode="text"
                    autoComplete="off"
                    placeholder="12.345.678-9"
                    required
                  />
                </label>
              </>
            ) : null}

            <div className="nt-evervault-card">
              <Card key={cardKey} theme="clean" onChange={setCardPayload}>
                <Card.Number label="Número de tarjeta" />
                <Card.Row>
                  <Card.ExpiryMonth label="Mes" />
                  <Card.ExpiryYear label="Año" />
                  <Card.Cvc label="CVC" />
                </Card.Row>
              </Card>
            </div>

            {isBackup ? (
              <>
                <label className="nt-check">
                  <input
                    type="checkbox"
                    checked={sameHolder}
                    onChange={(event) => setSameHolder(event.target.checked)}
                  />
                  <span>
                    El titular es el mismo: <strong>{name.trim()}</strong>
                  </span>
                </label>
                {!sameHolder ? (
                  <>
                    <label className="nt-field">
                      Nombre del titular
                      <input
                        value={backupName}
                        onChange={(event) => setBackupName(event.target.value)}
                        autoComplete="cc-name"
                        placeholder="Como aparece en la tarjeta"
                        required
                      />
                    </label>
                    <label className="nt-field">
                      RUT del titular
                      <input
                        value={backupRut}
                        onChange={(event) => setBackupRut(event.target.value)}
                        autoComplete="off"
                        placeholder="12.345.678-9"
                        required
                      />
                    </label>
                  </>
                ) : null}
              </>
            ) : null}

            <label className="nt-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>
                {isBackup
                  ? `Autorizo a ${merchantName} a cobrar la prima en esta tarjeta solo cuando no se pueda cobrar en mi tarjeta principal.`
                  : `Autorizo a ${merchantName} a cobrar automáticamente la prima de mi póliza en esta tarjeta cada mes.`}
              </span>
            </label>

            <button type="submit" className="nt-btn-primary" disabled={!canSubmit}>
              {isBackup ? <IconShield size={18} /> : <IconLock size={18} />}
              {submitting
                ? 'Inscribiendo…'
                : isBackup
                  ? 'Guardar tarjeta de respaldo'
                  : 'Inscribir tarjeta'}
            </button>
          </form>
        </EvervaultProvider>

        <p className="nt-security-note">
          Para validar tu tarjeta haremos una reserva de $100 que no se cobra. Algunos bancos
          pueden mostrar esa retención unas horas o días.
        </p>
        <p className="nt-security-note">
          El número de tu tarjeta viaja cifrado directo a una bóveda certificada PCI DSS. No lo
          guardamos en nuestros sistemas.
        </p>
      </section>
    </Shell>
  )
}

export default NetworkTokenInscription
