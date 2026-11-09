import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./pages/Dashboard";
import NetworkTokenInscription from "./pages/NetworkTokenInscription";
import PaymentSuccess from "./pages/PaymentSuccess";
import TransbankRedirect from "./pages/TransbankRedirect";
import MercadoPagoInscription from "./pages/MercadoPagoInscription";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import WebpayReturn from "./components/WebpayReturn";
import { CompanyProvider, useCompany } from "./CompanyContext";
import { NeutralPortal, PortalLoading, UnknownPortal } from "./components/PortalGate";
import "./App.css";

function CurrentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/dashboard/:customer_token" element={<Dashboard />} />
      <Route path="/payment-success/:customer_token" element={<PaymentSuccess />} />
      <Route path="/transbank-redirect" element={<TransbankRedirect />} />
      <Route path="/mp-inscription/:customer_token" element={<MercadoPagoInscription />} />
      <Route path="/nt-inscription/:customer_token" element={<NetworkTokenInscription />} />
      <Route path="/webpay/return" element={<WebpayReturn />} />
      <Route path="/politica-privacidad" element={<PrivacyPolicy />} />
    </Routes>
  );
}

function PathRoutes() {
  return (
    <Routes>
      <Route path="/:companySlug" element={<LoginScreen />} />
      <Route path="/:companySlug/dashboard/:customer_token" element={<Dashboard />} />
      <Route path="/:companySlug/payment-success/:customer_token" element={<PaymentSuccess />} />
      <Route path="/:companySlug/mp-inscription/:customer_token" element={<MercadoPagoInscription />} />
      <Route path="/:companySlug/nt-inscription/:customer_token" element={<NetworkTokenInscription />} />
      <Route path="/:companySlug/politica-privacidad" element={<PrivacyPolicy />} />
      <Route path="/transbank-redirect" element={<TransbankRedirect />} />
      <Route path="/mp-inscription/:customer_token" element={<MercadoPagoInscription />} />
      <Route path="/nt-inscription/:customer_token" element={<NetworkTokenInscription />} />
      <Route path="/webpay/return" element={<WebpayReturn />} />
    </Routes>
  );
}

function PortalRoutes() {
  const company = useCompany();
  if (company.loading) return <PortalLoading />;
  if (company.mode === "neutral") return <NeutralPortal />;
  if (company.mode === "unknown") return <UnknownPortal />;
  if (company.mode === "path") return <PathRoutes />;
  return <CurrentRoutes />;
}

function App() {
  return (
    <Router>
      <CompanyProvider>
        <PortalRoutes />
      </CompanyProvider>
    </Router>
  );
}

export default App;
