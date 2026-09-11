import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './TransbankRedirect.css'

function TransbankRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(3)
  const { webpayUrl, token, customer_token } = location.state || {}

  useEffect(() => {
    if (!webpayUrl || !token) {
      // Si no hay datos, redirigir al dashboard
      if (customer_token) {
        navigate(`/dashboard/${customer_token}`)
      } else {
        navigate('/')
      }
      return
    }

    // Contador regresivo antes de redirigir
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Redirigir a Transbank
          const transbankUrl = `${webpayUrl}?TBK_TOKEN=${token}`
          window.location.href = transbankUrl
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [webpayUrl, token, customer_token, navigate])

  return (
    <div className="transbank-redirect">
      <Header />
      <main className="transbank-redirect-main">
        <div className="redirect-container">
          <div className="redirect-card">
            <div className="redirect-icon-container">
              <svg
                className="redirect-icon"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="50" cy="50" r="45" stroke="#ff6b35" strokeWidth="4" />
                <path
                  d="M30 50L45 65L70 35"
                  stroke="#ff6b35"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="redirect-title">Redirigiendo a Transbank</h1>
            <p className="redirect-message">
              Serás redirigido a Transbank para inscribir tu medio de pago de forma segura.
            </p>
            <div className="redirect-countdown">
              <p className="countdown-text">
                Redirigiendo en <span className="countdown-number">{countdown}</span> segundos...
              </p>
            </div>
            <div className="redirect-loader">
              <div className="loader-spinner"></div>
            </div>
            <button
              className="redirect-button"
              onClick={() => {
                if (webpayUrl && token) {
                  const transbankUrl = `${webpayUrl}?TBK_TOKEN=${token}`
                  window.location.href = transbankUrl
                }
              }}
            >
              Continuar ahora
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default TransbankRedirect












