import React from 'react'
import './ProductCard.css'

function getBrandLabel(brand) {
  if (!brand) return ''
  const normalized = brand.toLowerCase()
  if (normalized.includes('master')) return 'MasterCard'
  if (normalized.includes('visa')) return 'Visa'
  return brand
}

function BrandIcon({ brand }) {
  if (!brand) {
    return (
      <svg
        width="32"
        height="20"
        viewBox="0 0 32 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="18"
          rx="4"
          stroke="#CCCCCC"
          strokeWidth="2"
          fill="#F9F9F9"
        />
        <path
          d="M7 7L13 13M13 7L7 13"
          stroke="#CCCCCC"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  const normalized = brand.toLowerCase()

  if (normalized.includes('master')) {
    // MasterCard estilo simple de dos círculos
    return (
      <svg
        width="32"
        height="20"
        viewBox="0 0 32 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="20" rx="4" fill="#FFFFFF" />
        <circle cx="14" cy="10" r="6" fill="#EB001B" />
        <circle cx="18" cy="10" r="6" fill="#F79E1B" />
      </svg>
    )
  }

  if (normalized.includes('visa')) {
    // Visa estilo simple
    return (
      <svg
        width="32"
        height="20"
        viewBox="0 0 32 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="20" rx="4" fill="#1A1F71" />
        <text
          x="6"
          y="13"
          fill="white"
          fontSize="8"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'"
        >
          VISA
        </text>
      </svg>
    )
  }

  // Icono genérico de tarjeta
  return (
    <svg
      width="32"
      height="20"
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="20" rx="4" fill="#4A4A4A" />
      <rect x="4" y="6" width="24" height="3" fill="#FFFFFF" opacity="0.7" />
      <rect x="4" y="12" width="10" height="2" fill="#FFFFFF" opacity="0.7" />
    </svg>
  )
}

function ProductCard({ productCode, productNumber, paymentMethod, hasWarning }) {
  // Usar productCode si está disponible, sino productNumber (para compatibilidad)
  const displayCode = productCode || productNumber

  const hasPaymentMethod = !!paymentMethod
  const brand = hasPaymentMethod ? getBrandLabel(paymentMethod.card_brand) : null
  const cardNumber = hasPaymentMethod ? paymentMethod.card_number : null

  const paymentText = hasPaymentMethod
    ? `${brand ? `${brand} ` : ''}${cardNumber || ''}`.trim()
    : 'Sin medio de pago inscrito'

  return (
    <div className="product-card">
      <div className="product-card-header">
        <span className="product-card-number">{displayCode}</span>
        {/* <button className="product-card-menu">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="10" cy="5" r="1.5" fill="#666666" />
            <circle cx="10" cy="10" r="1.5" fill="#666666" />
            <circle cx="10" cy="15" r="1.5" fill="#666666" />
          </svg>
        </button> */}
      </div>
      <div className="product-card-payment">
        <div
          className={`payment-method-icon ${
            hasPaymentMethod ? '' : 'payment-method-icon-empty'
          }`}
        >
          <BrandIcon brand={brand} />
        </div>
        <span
          className={`payment-method-text ${
            hasPaymentMethod ? '' : 'payment-method-text-empty'
          }`}
        >
          {paymentText}
        </span>
        {hasWarning && (
          <svg
            className="payment-warning-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 2L2 18H18L10 2Z"
              fill="#ff6b35"
              stroke="#ff6b35"
              strokeWidth="1"
            />
            <path
              d="M10 8V12M10 14H10.01"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}

export default ProductCard


