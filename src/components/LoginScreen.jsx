import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import LoginForm from './LoginForm'
import Footer from './Footer'
import './LoginScreen.css'

const FIND_CUSTOMER_URL =
  'https://ovukfntlauhftpwymvdr.supabase.co/functions/v1/find-customer'

function LoginScreen() {
  const [rut, setRut] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const textTofind = rut.trim()
    if (!textTofind) {
      return
    }

    try {
      setLoading(true)

      const response = await fetch(FIND_CUSTOMER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textTofind }),
      })

      if (!response.ok) {
        throw new Error(`Error en la búsqueda de cliente: ${response.status}`)
      }

      const data = await response.json()

      if (data.error === 'no existe registro') {
        alert('No se encuentra cliente')
        return
      }

      if (data.customer_token) {
        navigate(`/dashboard/${data.customer_token}`)
        return
      }

      // Respuesta inesperada
      console.error('Respuesta inesperada de find-customer:', data)
      alert('No se encuentra cliente')
    } catch (error) {
      console.error('Error al buscar cliente:', error)
      alert('No se encuentra cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <Header />
      <main className="login-main">
        <LoginForm
          rut={rut}
          setRut={setRut}
          onSubmit={handleSubmit}
          isLoading={loading}
        />
      </main>
      <Footer />
    </div>
  )
}

export default LoginScreen


