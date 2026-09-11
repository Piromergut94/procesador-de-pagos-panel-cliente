import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './PaymentSuccess.css'

const API_URL = 'https://ovukfntlauhftpwymvdr.supabase.co/functions/v1/finish-inscription-webpay'

function PaymentSuccess() {
  const { customer_token } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(false)

  // Extraer TBK_TOKEN de los query parameters
  const tbk_token = searchParams.get('TBK_TOKEN')

  useEffect(() => {
    const finishInscription = async () => {
      if (!customer_token || !tbk_token) {
        setError(true)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(false)

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tbk_token: tbk_token,
            customer_token: customer_token,
          }),
        })

        if (!response.ok) {
          throw new Error(`Error al finalizar inscripción: ${response.status}`)
        }

        const data = await response.json()

        if (data.success === true) {
          setSuccess(true)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Error al finalizar inscripción:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    finishInscription()
  }, [customer_token, tbk_token])

  const handleBackToDashboard = () => {
    if (customer_token) {
      navigate(`/dashboard/${customer_token}`)
    } else {
      navigate('/')
    }
  }

  // Pantalla de carga
  if (loading) {
    return (
      <div className="payment-success">
        <Header />
        <main className="payment-success-main">
          <div className="payment-success-container">
            <div className="success-card">
              <div className="loader-container">
                <div className="loader-spinner"></div>
                <p className="loader-text">Procesando inscripción de medio de pago...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Pantalla de error
  if (error) {
    return (
      <div className="payment-success">
        <Header />
        <main className="payment-success-main">
          <div className="payment-success-container">
            <div className="success-card error-card">
              <div className="success-icon-container">
                <svg
                  className="success-icon error-icon"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="50" cy="50" r="50" fill="#d32f2f" />
                  <path
                    d="M35 35L65 65M65 35L35 65"
                    stroke="white"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1 className="success-title error-title">
                Hubo un problema al inscribir tu medio de pago
              </h1>
              <p className="success-message">
                No pudimos completar la inscripción de tu medio de pago. Por favor,
                intenta nuevamente o contacta a soporte si el problema persiste.
              </p>
              <button
                className="success-button"
                onClick={handleBackToDashboard}
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Pantalla de éxito
  return (
    <div className="payment-success">
      <Header />
      <main className="payment-success-main">
        <div className="payment-success-container">
          <div className="success-card">
            <div className="success-icon-container">
              <svg
                className="success-icon"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="50" cy="50" r="50" fill="#4CAF50" />
                <path
                  d="M30 50L45 65L70 35"
                  stroke="white"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="success-title">¡Medio de pago inscrito exitosamente!</h1>
            <p className="success-message">
              Tu medio de pago ha sido registrado correctamente. Ahora puedes
              despreocuparte, tus cuotas se pagarán automáticamente.
            </p>
            <div className="success-details">
              <div className="success-detail-item">
                <span className="detail-label">Estado:</span>
                <span className="detail-value success">Activo</span>
              </div>
              <div className="success-detail-item">
                <span className="detail-label">Próximo pago:</span>
                <span className="detail-value">Se procesará automáticamente</span>
              </div>
            </div>
            <button
              className="success-button"
              onClick={handleBackToDashboard}
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default PaymentSuccess

