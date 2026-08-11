import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, X, ShieldCheck } from "lucide-react";
import { C, rpc } from "./config";

const haQuanto = (d) => {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

// Sino de autorizações: mostra a quem PODE aprovar as solicitações pendentes,
// com o que está sendo feito, e permite liberar/rejeitar remotamente.
export default function SinoAutorizacoes({ usuario }) {
  const [lista, setLista] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [busy, setBusy] = useState(null); // id em processamento
  const ref = useRef(null);

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;
    try { const r = await rpc("erp_autorizacoes_pendentes", { p_id_usuario: usuario.id }); setLista(Array.isArray(r) ? r : []); }
    catch { /* silencioso */ }
  }, [usuario?.id]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 25000);
    return () => clearInterval(t);
  }, [carregar]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  async function decidir(a, aprovar) {
    let motivo = null;
    if (!aprovar) { motivo = window.prompt("Motivo da rejeição (opcional):", "") ?? ""; }
    setBusy(a.id);
    try {
      const r = await rpc("erp_autorizacao_decidir", { p_id: a.id, p_id_aprovador: usuario.id, p_aprovar: aprovar, p_motivo: motivo });
      if (r && r.ok === false) { window.alert(r.msg || "Não foi possível decidir."); }
      await carregar();
    } catch (e) { window.alert("Erro: " + (e.message || e)); }
    finally { setBusy(null); }
  }

  const n = lista.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setAberto((v) => !v)} title="Autorizações pendentes" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: n > 0 ? C.warningBg : C.surface2, cursor: "pointer" }}>
        <Bell size={17} style={{ color: n > 0 ? C.warning : C.textMuted }} />
        {n > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: C.destructive, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>}
      </button>

      {aberto && (
        <div style={{ position: "absolute", top: 46, right: 0, width: 380, maxWidth: "90vw", maxHeight: 460, overflowY: "auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 9998 }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={15} style={{ color: C.primary }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Autorizações pendentes</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted }}>{n}</span>
          </div>
          {n === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Nada aguardando sua liberação.</div>
          ) : lista.map((a) => (
            <div key={a.id} style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.primary, background: C.bluePale, padding: "1px 6px", borderRadius: 4 }}>{a.tipo}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.foreground }}>{a.titulo}</span>
              </div>
              {a.descricao && <div style={{ fontSize: 12.5, color: C.foreground, marginBottom: 6, lineHeight: 1.4 }}>{a.descricao}</div>}
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
                {a.solicitante ? `${a.solicitante}` : "—"}{a.empresa ? ` · ${a.empresa}` : ""}{a.numero_origem ? ` · ${a.numero_origem}` : ""} · {haQuanto(a.criado_em)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => decidir(a, true)} disabled={busy === a.id} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, border: "none", background: C.success, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: busy === a.id ? 0.6 : 1 }}><Check size={14} /> Liberar</button>
                <button onClick={() => decidir(a, false)} disabled={busy === a.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, color: C.destructive, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: busy === a.id ? 0.6 : 1 }}><X size={14} /> Rejeitar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
