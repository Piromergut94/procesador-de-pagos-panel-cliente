import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './MercadoPagoInscription.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ANON_KEY

function loadMercadoPagoSdk() {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) {
      resolve(window.MercadoPago)
      return
    }
    const existing = document.querySelector('script[data-mp-sdk="v2"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.MercadoPago))
      existing.addEventListener('error', () => reject(new Error('MP SDK load failed')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.dataset.mpSdk = 'v2'
    script.onload = () => resolve(window.MercadoPago)
    script.onerror = () => reject(new Error('MP SDK load failed'))
    document.body.appendChild(script)
  })
}

/**
 * CardForm (MercadoPago.js) → card token → finish-inscription-mp.
 * Docs: https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/cardtoken
 */
function MercadoPagoInscription() {
  const { customer_token: paramToken } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const formReady = useRef(false)
  const cardFormRef = useRef(null)

  const [customerToken] = useState(
    () => paramToken || location.state?.customer_token || '',
  )
  const [session, setSession] = useState(location.state?.mpSession || null)
  const [loading, setLoading] = useState(!location.state?.mpSession)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!customerToken) {
      setError('Token de cliente no disponible')
      setLoading(false)
      return
    }
    if (session?.public_key) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/start-inscription-mp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ANON_KEY
              ? { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
              : {}),
          },
          body: JSON.stringify({ customer_token: customerToken }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.status !== 'success' || !data.object?.public_key) {
          throw new Error(data.message || 'No se pudo iniciar inscripción Mercado Pago')
        }
        if (!cancelled) setSession(data.object)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al iniciar inscripción')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [customerToken, session])

  useEffect(() => {
    if (!session?.public_key || formReady.current) return
    let destroyed = false

    ;(async () => {
      try {
        const MercadoPago = await loadMercadoPagoSdk()
        if (destroyed || !MercadoPago) return

        const mp = new MercadoPago(session.public_key, { locale: 'es-CL' })
        const cardForm = mp.cardForm({
          amount: String(session.amount || '1000'),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: {
              id: 'form-checkout__cardNumber',
              placeholder: 'Número de tarjeta',
            },
            expirationDate: {
              id: 'form-checkout__expirationDate',
              placeholder: 'MM/YY',
            },
            securityCode: {
              id: 'form-checkout__securityCode',
              placeholder: 'Código de seguridad',
            },
            cardholderName: {
              id: 'form-checkout__cardholderName',
              placeholder: 'Titular de la tarjeta',
            },
            issuer: {
              id: 'form-checkout__issuer',
              placeholder: 'Banco emisor',
            },
            installments: {
              id: 'form-checkout__installments',
              placeholder: 'Cuotas',
            },
            identificationType: {
              id: 'form-checkout__identificationType',
              placeholder: 'Tipo de documento',
            },
            identificationNumber: {
              id: 'form-checkout__identificationNumber',
              placeholder: 'Número de documento',
            },
            cardholderEmail: {
              id: 'form-checkout__cardholderEmail',
              placeholder: 'E-mail',
            },
          },
          callbacks: {
            onFormMounted: (mountError) => {
              if (mountError) {
                console.warn('MP CardForm mount error', mountError)
                setError('No se pudo cargar el formulario de tarjeta')
              }
            },
            onSubmit: async (event) => {
              event.preventDefault()
              if (submitting) return
              setSubmitting(true)
              setError(null)
              try {
                const formData = cardForm.getCardFormData()
                const token = formData?.token
                if (!token) {
                  throw new Error('No se generó el card token. Revisá los datos de la tarjeta.')
                }

                const res = await fetch(
                  `${SUPABASE_URL}/functions/v1/finish-inscription-mp`,
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
                      token,
                      payment_method_id: formData.paymentMethodId,
                      issuer_id: formData.issuerId,
                      email: formData.cardholderEmail || session.email,
                      identification_type: formData.identificationType,
                      identification_number: formData.identificationNumber,
                    }),
                  },
                )
                const data = await res.json().catch(() => ({}))
                if (!res.ok || data.status !== 'success') {
                  throw new Error(
                    data.message ||
                      data.detail?.message ||
                      'No se pudo guardar la tarjeta en Mercado Pago',
                  )
                }
                setSuccess(true)
                setTimeout(() => {
                  navigate(`/dashboard/${customerToken}`, { replace: true })
                }, 1500)
              } catch (err) {
                console.error('finish-inscription-mp', err)
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Error al inscribir medio de pago',
                )
              } finally {
                setSubmitting(false)
              }
            },
            onFetching: () => {
              const progressBar = document.querySelector('.mp-progress-bar')
              if (progressBar) progressBar.removeAttribute('value')
              return () => {
                if (progressBar) progressBar.setAttribute('value', '0')
              }
            },
          },
        })

        cardFormRef.current = cardForm
        formReady.current = true

        // Prefill email / RUT si vienen del start
        const emailInput = document.getElementById('form-checkout__cardholderEmail')
        if (emailInput && session.email && !emailInput.value) {
          emailInput.value = session.email
        }
        const idInput = document.getElementById('form-checkout__identificationNumber')
        if (idInput && session.national_id && !idInput.value) {
          idInput.value = String(session.national_id).replace(/\./g, '')
        }
        const nameInput = document.getElementById('form-checkout__cardholderName')
        if (nameInput && session.name && !nameInput.value) {
          nameInput.value = session.name
        }
      } catch (err) {
        console.error(err)
        if (!destroyed) {
          setError(err instanceof Error ? err.message : 'Error cargando Mercado Pago')
        }
      }
    })()

    return () => {
      destroyed = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montar CardForm una vez por session
  }, [session?.public_key])

  const goBack = () => {
    if (customerToken) navigate(`/dashboard/${customerToken}`)
    else navigate('/')
  }

  return (
    <div className="mp-inscription">
      <Header userName="" userNumber="" />
      <main className="mp-inscription-main">
        <div className="mp-inscription-card">
          <h1 className="mp-inscription-title">Inscribir medio de pago</h1>
          <p className="mp-inscription-subtitle">
            Ingresá los datos de tu tarjeta. Mercado Pago genera un card token seguro; no
            almacenamos el número completo.
          </p>

          {loading && <p className="mp-inscription-note">Cargando formulario…</p>}
          {error && <div className="mp-inscription-error">{error}</div>}
          {success && (
            <div className="mp-inscription-success">
              Tarjeta inscrita correctamente. Volviendo al portal…
            </div>
          )}

          {!loading && !success && session?.public_key && (
            <form id="form-checkout" className="mp-form-checkout">
              <label className="mp-label">Número de tarjeta</label>
              <div id="form-checkout__cardNumber" className="mp-field-container" />

              <div className="mp-row">
                <div className="mp-col">
                  <label className="mp-label">Vencimiento</label>
                  <div id="form-checkout__expirationDate" className="mp-field-container" />
                </div>
                <div className="mp-col">
                  <label className="mp-label">CVV</label>
                  <div id="form-checkout__securityCode" className="mp-field-container" />
                </div>
              </div>

              <label className="mp-label">Titular</label>
              <input
                type="text"
                id="form-checkout__cardholderName"
                className="mp-input"
                autoComplete="cc-name"
              />

              <label className="mp-label">Banco emisor</label>
              <select id="form-checkout__issuer" className="mp-input" />

              <label className="mp-label">Cuotas</label>
              <select id="form-checkout__installments" className="mp-input" />

              <div className="mp-row">
                <div className="mp-col">
                  <label className="mp-label">Tipo documento</label>
                  <select id="form-checkout__identificationType" className="mp-input" />
                </div>
                <div className="mp-col">
                  <label className="mp-label">Nº documento</label>
                  <input
                    type="text"
                    id="form-checkout__identificationNumber"
                    className="mp-input"
                  />
                </div>
              </div>

              <label className="mp-label">E-mail</label>
              <input
                type="email"
                id="form-checkout__cardholderEmail"
                className="mp-input"
                autoComplete="email"
              />

              <progress value="0" className="mp-progress-bar">
                Cargando…
              </progress>

              <button
                type="submit"
                id="form-checkout__submit"
                className="mp-submit"
                disabled={submitting}
              >
                {submitting ? 'Inscribiendo…' : 'Inscribir tarjeta'}
              </button>
            </form>
          )}

          <button type="button" className="mp-back" onClick={goBack}>
            Volver al portal
          </button>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default MercadoPagoInscription
