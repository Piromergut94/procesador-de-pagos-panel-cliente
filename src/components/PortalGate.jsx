import React from "react";

export function PortalLoading() {
  return (
    <main style={{ padding: 48, textAlign: "center" }}>
      <p>Cargando portal…</p>
    </main>
  );
}

export function NeutralPortal() {
  return (
    <main style={{ padding: 48, textAlign: "center" }}>
      <h1>PAID</h1>
      <p>Entra por el portal de tu empresa.</p>
    </main>
  );
}

export function UnknownPortal() {
  return (
    <main style={{ padding: 48, textAlign: "center" }}>
      <h1>Portal no disponible</h1>
      <p>Este dominio no está asociado a una empresa.</p>
    </main>
  );
}
