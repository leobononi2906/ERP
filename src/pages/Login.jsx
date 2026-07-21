import { useState } from "react";
import { User, Lock, Eye, EyeOff, LoaderCircle, AlertCircle, Building2 } from "lucide-react";
import { C, mono, rpc } from "../config";

export default function Login({ onLogin }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function autenticar() {
    setError("");
    if (!login.trim() || !senha) { setError("Preencha usuário e senha."); return; }
    setLoading(true);
    try {
      const result = await rpc("login_erp", { p_login: login.trim(), p_senha: senha });
      if (result && result.id) onLogin(result);
      else setError("Usuário ou senha incorretos.");
    } catch (e) {
      setError("Não foi possível conectar ao servidor.");
    } finally { setLoading(false); }
  }
  const onKey = (e) => { if (e.key === "Enter" && !loading) autenticar(); };

  const wrap = { gap: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" };
  const input = { flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: C.foreground, fontSize: 14, fontFamily: "inherit" };
  const lbl = { display: "block", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.background, padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Building2 size={26} color="#fff" /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.foreground, fontWeight: 700, fontSize: 20 }}>Grupo Bononi</span>
            <span style={{ background: C.bluePale, color: C.blueMid, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 4 }}>ERP</span>
          </div>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 6 }}>Acesse com seu usuário</p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(15,29,53,0.04)" }}>
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.destructiveBg, border: `1px solid ${C.destructive}33`, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
              <AlertCircle size={17} style={{ color: C.destructive, flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: C.destructive, fontSize: 13, fontWeight: 500 }}>{error}</span>
            </div>
          )}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={lbl}>Usuário</span>
            <div style={{ display: "flex", alignItems: "center", ...wrap }}>
              <User size={17} style={{ color: C.textMuted }} />
              <input value={login} onChange={(e) => setLogin(e.target.value)} onKeyDown={onKey} placeholder="seu.usuario" autoFocus style={input} />
            </div>
          </label>
          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={lbl}>Senha</span>
            <div style={{ display: "flex", alignItems: "center", ...wrap }}>
              <Lock size={17} style={{ color: C.textMuted }} />
              <input value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={onKey} type={showPass ? "text" : "password"} placeholder="••••••••" style={input} />
              <button onClick={() => setShowPass((v) => !v)} aria-label="ver senha" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                {showPass ? <EyeOff size={17} style={{ color: C.textMuted }} /> : <Eye size={17} style={{ color: C.textMuted }} />}
              </button>
            </div>
          </label>
          <button onClick={autenticar} disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 8, border: "none", background: loading ? C.blueMid : C.primary, color: "#fff", fontWeight: 600, fontSize: 14, cursor: loading ? "default" : "pointer" }}>
            {loading ? (<><LoaderCircle size={17} className="spin" /> Entrando…</>) : "Entrar"}
          </button>
        </div>
        <p style={{ textAlign: "center", color: C.textMuted, fontSize: 11, marginTop: 16 }}>
          Grupo Bononi &copy; {new Date().getFullYear()}
        </p>
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
