import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import NavigationTabs from '../components/NavigationTabs'
import PaymentCard from '../components/PaymentCard'
import ProductCard from '../components/ProductCard'
import {
  saveCustomerInfoToStorage,
  getCustomerInfoFromStorage,
} from '../utils/storage'
import { useCompany } from '../CompanyContext'
import './Dashboard.css'

const API_URL =
  'https://ovukfntlauhftpwymvdr.supabase.co/functions/v1/get-customer-info'

const filterActiveCustomerProducts = (products) => {
  if (!Array.isArray(products)) return []

  return products.filter((product) => {
    if (!product || typeof product !== 'object') return false
    return product.deleted_at == null && product.deletedAt == null
  })
}

function Dashboard() {
  const { customer_token } = useParams()
  const navigate = useNavigate()
  const company = useCompany()
  const [activeTab, setActiveTab] = useState('cuotas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customerProducts, setCustomerProducts] = useState([])
  const [userData, setUserData] = useState({
    name: '',
    number: '',
  })
  const [apiResponse, setApiResponse] = useState(null)
  const [registeringPayment, setRegisteringPayment] = useState(false)

  useEffect(() => {
    const fetchCustomerInfo = async () => {
      if (!customer_token) {
        setError('Token de cliente no proporcionado')
        setLoading(false)
        return
      }

      // Intentar cargar desde localStorage primero
      const storedData = getCustomerInfoFromStorage(customer_token)
      if (storedData && storedData.data) {
        console.log('Datos cargados desde localStorage')
        const data = storedData.data

        // Si hay un error en la respuesta almacenada, intentar hacer la llamada a la API
        if (data.error) {
          console.log('Error encontrado en datos almacenados, intentando actualizar desde API')
        } else {
          // Usar datos almacenados
          setCustomerProducts(filterActiveCustomerProducts(data.customer_products))
          setApiResponse(data)
          // Buscar RUT en múltiples ubicaciones posibles
          const customerRut =
            data.customer?.national_id ||
            data.customer?.rut ||
            data.customer?.RUT ||
            data.customer?.document ||
            data.customer?.document_id ||
            data.customer?.tax_id ||
            data.customer?.dni ||
            data.customer?.rfc ||
            data.national_id ||
            data.rut ||
            data.RUT ||
            data.document ||
            data.document_id ||
            null

          setUserData((prev) => ({
            ...prev,
            name: data.customer?.name || prev.name,
            number: customerRut || prev.number,
          }))
          setLoading(false)

          // Hacer la llamada a la API en segundo plano para actualizar los datos
          fetchFromAPI()
          return
        }
      }

      // Si no hay datos en localStorage o hay error, hacer la llamada a la API
      await fetchFromAPI()
    }

    const fetchFromAPI = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            company.sendSlug && company.slug
              ? { customer_token, slug: company.slug }
              : { customer_token }
          ),
        })

        const data = await response.json()

        // Guardar la respuesta completa en localStorage (incluso si hay error)
        saveCustomerInfoToStorage(customer_token, data)
        setApiResponse(data)

        // Verificar si hay error en la respuesta
        if (data.error) {
          // Si hay error pero tenemos datos almacenados, usar esos
          const storedData = getCustomerInfoFromStorage(customer_token)
          if (storedData && storedData.data && !storedData.data.error) {
            console.log('Usando datos almacenados debido a error en API')
            const stored = storedData.data
            setCustomerProducts(filterActiveCustomerProducts(stored.customer_products))
            // Actualizar userData con RUT si está disponible
            const storedRut =
              stored.customer?.national_id ||
              stored.customer?.rut ||
              stored.customer?.RUT ||
              stored.customer?.document ||
              stored.customer?.document_id ||
              stored.customer?.tax_id ||
              stored.customer?.dni ||
              stored.customer?.rfc ||
              stored.national_id ||
              stored.rut ||
              stored.RUT ||
              stored.document ||
              stored.document_id ||
              null

            setUserData((prev) => ({
              ...prev,
              name: stored.customer?.name || prev.name,
              number: storedRut || prev.number,
            }))
          } else {
            setError(data.error || 'Error al obtener información del cliente')
            setCustomerProducts([])
          }
        } else if (data.customer_products && Array.isArray(data.customer_products)) {
          setCustomerProducts(filterActiveCustomerProducts(data.customer_products))
        } else {
          setCustomerProducts([])
        }

        // Actualizar userData con datos del cliente (si existen) y el RUT
        // Buscar RUT en múltiples ubicaciones posibles
        const customerRut =
          data.customer?.national_id ||
          data.customer?.rut ||
          data.customer?.RUT ||
          data.customer?.document ||
          data.customer?.document_id ||
          data.customer?.tax_id ||
          data.customer?.dni ||
          data.customer?.rfc ||
          data.national_id ||
          data.rut ||
          data.RUT ||
          data.document ||
          data.document_id ||
          null

        setUserData((prev) => ({
          ...prev,
          name: data.customer?.name || prev.name,
          number: customerRut || prev.number,
        }))
      } catch (err) {
        console.error('Error fetching customer info:', err)

        // Intentar usar datos almacenados si hay error de red
        const storedData = getCustomerInfoFromStorage(customer_token)
        if (storedData && storedData.data && !storedData.data.error) {
          console.log('Usando datos almacenados debido a error de red')
          const stored = storedData.data
          if (stored.customer_products && Array.isArray(stored.customer_products)) {
            setCustomerProducts(filterActiveCustomerProducts(stored.customer_products))
            setApiResponse(stored)
          }
          // Actualizar userData con RUT si está disponible
          const storedRut =
            stored.customer?.national_id ||
            stored.customer?.rut ||
            stored.customer?.RUT ||
            stored.customer?.document ||
            stored.customer?.document_id ||
            stored.customer?.tax_id ||
            stored.customer?.dni ||
            stored.customer?.rfc ||
            stored.national_id ||
            stored.rut ||
            stored.RUT ||
            stored.document ||
            stored.document_id ||
            null

          setUserData((prev) => ({
            ...prev,
            name: stored.customer?.name || prev.name,
            number: storedRut || prev.number,
          }))
        } else {
          setError(err.message || 'Error al cargar la información del cliente')
          setCustomerProducts([])
        }
      } finally {
        setLoading(false)
      }
    }

    if (company.loading) return
    fetchCustomerInfo()
  }, [customer_token, company.loading, company.sendSlug, company.slug])

  const handleRegisterPayment = async () => {
    if (!customer_token) {
      console.error('Customer token no disponible')
      return
    }

    setRegisteringPayment(true)

    try {
      // Obtener datos del cliente desde localStorag

      // Llamar a la API de clubdelseguro
      const response = await fetch('https://ovukfntlauhftpwymvdr.supabase.co/functions/v1/start-inscription-oneclick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_token: customer_token,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error al iniciar inscripción: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 'success' && data.object) {
        const { token, url_webpay } = data.object

        // Redirigir a la página intermedia de Transbank
        navigate('/transbank-redirect', {
          state: {
            webpayUrl: url_webpay,
            token: token,
            customer_token: customer_token,
          },
        })
      } else {
        throw new Error('Respuesta inesperada de la API')
      }
    } catch (error) {
      console.error('Error al inscribir medio de pago:', error)
      alert('Error al iniciar el proceso de inscripción. Por favor, intenta nuevamente.')
    } finally {
      setRegisteringPayment(false)
    }
  }

  const renderProducts = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <p>Cargando productos...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="error-container">
          <p>Error: {error}</p>
        </div>
      )
    }

    if (customerProducts.length === 0) {
      return (
        <div className="no-products-container">
          <p>No hay productos disponibles</p>
        </div>
      )
    }

    return (
      <div className="products-grid">
        {customerProducts.map((product) => (
          <ProductCard
            key={product.id}
            productCode={product.product_code}
            paymentMethod={product.payment_method}
            hasWarning={!product.payment_method}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="dashboard">
      <Header userName={userData.name} userNumber={userData.number} />
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="dashboard-main">
        <div className="dashboard-content">
          {activeTab === 'cuotas' && (
            <>
              <PaymentCard
                customerToken={customer_token}
                onRegisterPayment={handleRegisterPayment}
                isLoading={registeringPayment}
                isCustomerInfoLoading={loading}
              />


              <div className="info-alert">
                Para modificar tu medio de pago, simplemente inscribe uno nuevo. Será reemplazado por el actual automáticamente.
              </div>
              <section className="products-section">
                <h2 className="products-section-title">Mis Productos</h2>
                {renderProducts()}
              </section>
            </>
          )}
          {activeTab === 'productos' && (
            <section className="products-section">
              <h2 className="products-section-title">Mis Productos</h2>
              {renderProducts()}
            </section>
          )}
          {activeTab === 'historial' && (
            <section className="historial-section">
              <h2 className="products-section-title">Historial de Pagos</h2>
              <div className="historial-placeholder">
                <p>No hay historial de pagos disponible</p>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Dashboard


