"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
          color: "#0f172a",
          fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
          padding: "24px"
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "440px",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            background: "#ffffff",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 10px 30px -18px rgba(15, 23, 42, 0.25)"
          }}
        >
          <div
            style={{
              margin: "0 auto 14px",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#fef3c7",
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 700
            }}
          >
            !
          </div>
          <h1 style={{ margin: 0, fontSize: "18px" }}>No se pudo iniciar EnerClass</h1>
          <p style={{ margin: "10px 0 0", fontSize: "13px", lineHeight: 1.6, color: "#64748b" }}>
            Ocurrió un problema inesperado. Vuelva a intentarlo; si el aviso continúa, cierre esta pestaña y abra el sistema nuevamente.
          </p>
          {error.digest ? (
            <p style={{ margin: "12px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "Consolas, monospace" }}>
              Referencia: {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: "24px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: "10px",
                background: "#059669",
                color: "#ffffff",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Volver a intentar
            </button>
            <button
              onClick={() => window.location.assign("/login")}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                background: "#ffffff",
                color: "#334155",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Ir al acceso
            </button>
          </div>
          <p style={{ margin: "20px 0 0", fontSize: "10px", color: "#94a3b8" }}>
            I.E. N° 2001 «Leoncio Prado» · EnerClass
          </p>
        </main>
      </body>
    </html>
  );
}
