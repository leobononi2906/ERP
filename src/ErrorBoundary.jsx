import React from "react";
import { logFrontend } from "./config";

/**
 * Captura crashes de render (React) que antes derrubavam o app inteiro
 * numa tela branca ("sumiu tudo"). Em vez disso mostra uma mensagem
 * amigável com botão de recarregar e GRAVA o erro (com componentStack)
 * em erp_logs_frontend via logFrontend — ver via RPC erp_logs_erros.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    try {
      logFrontend(
        "FATAL",
        String(erro?.message || erro),
        "GLOBAL",
        "ErrorBoundary",
        (erro?.stack || "") + "\n--- componentStack ---" + (info?.componentStack || ""),
        { name: erro?.name || null }
      );
    } catch { /* nunca deixar o log derrubar o boundary */ }
  }

  render() {
    if (!this.state.erro) return this.props.children;
    const msg = String(this.state.erro?.message || this.state.erro || "Erro desconhecido");
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F3F8", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0F1D35", marginBottom: 8 }}>Algo travou nesta tela</h1>
          <p style={{ fontSize: 13.5, color: "#5A6A85", lineHeight: 1.5, marginBottom: 6 }}>
            Não se preocupe — nenhum dado foi perdido. O erro foi registrado automaticamente. Recarregue para continuar.
          </p>
          <p style={{ fontSize: 11.5, color: "#9AA5B8", fontFamily: "'DM Mono', ui-monospace, monospace", background: "#F7F9FC", border: "1px solid #E2E8F2", borderRadius: 8, padding: "8px 10px", margin: "12px 0 18px", wordBreak: "break-word", textAlign: "left" }}>
            {msg}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => window.location.reload()} style={{ background: "#1A3A8F", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Recarregar
            </button>
            <button onClick={() => this.setState({ erro: null })} style={{ background: "#fff", color: "#1A3A8F", border: "1px solid #E2E8F2", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Tentar de novo
            </button>
          </div>
        </div>
      </div>
    );
  }
}
