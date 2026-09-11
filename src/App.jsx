import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LoginScreen from './components/LoginScreen'
import Dashboard from './pages/Dashboard'
import PaymentSuccess from './pages/PaymentSuccess'
import TransbankRedirect from './pages/TransbankRedirect'
import PrivacyPolicy from './pages/PrivacyPolicy'
import WebpayReturn from './components/WebpayReturn'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/dashboard/:customer_token" element={<Dashboard />} />
        <Route
          path="/payment-success/:customer_token"
          element={<PaymentSuccess />}
        />
        <Route
          path="/transbank-redirect"
          element={<TransbankRedirect />}
        />
        <Route
          path="/webpay/return"
          element={<WebpayReturn />}
        />
        <Route path="/politica-privacidad" element={<PrivacyPolicy />} />
      </Routes>
    </Router>
  )
}

export default App


