import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, X, ShieldCheck, CheckCheck } from "lucide-react";
import { C, rpc } from "./config";
import { irPara } from "./nav";

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

// Sino UNIFICADO: 2 fluxos numa caixa só.
//  • Pendências = autorizacoes (EXIGEM decisão: liberar/rejeitar)
//  • Avisos     = notificacoes (informativos: clicar abre a origem, marca lido)
export default function SinoAutorizacoes({ usuario }) {
  const [pend, setPend] = useState([]);       // autorizações pendentes
  const [avisos, setAvisos] = useState([]);   // notificações não-lidas
  const [aba, setAba] = useState("pend");
  const [aberto, setAberto] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      const [p, a] = await Promise.all([
        rpc("erp_autorizacoes_pendentes", { p_id_usuario: usuario.id }).catch(() => []),
        rpc("erp_notificacoes_listar", { p_id_usuario: usuario.id }).catch(() => []),
      ]);
      setPend(Array.isArray(p) ? p : []);
      setAvisos(Array.isArray(a) ? a : []);
    } catch { /* silencioso */ }
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

  // abre já na aba que tem conteúdo
  useEffect(() => {
    if (aberto) setAba(pend.length > 0 ? "pend" : avisos.length > 0 ? "avisos" : "pend");
  }, [aberto]); // eslint-disable-line

  async function decidir(a, aprovar) {
    let motivo = null;
    if (!aprovar) { motivo = window.prompt("Motivo da rejeição (opcional):", "") ?? ""; }
    setBusy("a" + a.id);
    try {
      const r = await rpc("erp_autorizacao_decidir", { p_id: a.id, p_id_aprovador: usuario.id, p_aprovar: aprovar, p_motivo: motivo });
      if (r && r.ok === false) { window.alert(r.msg || "Não foi possível decidir."); }
      await carregar();
    } catch (e) { window.alert("Erro: " + (e.message || e)); }
    finally { setBusy(null); }
  }

  async function abrirAviso(nt) {
    try { await rpc("erp_notificacao_marcar_lida", { p_id: nt.id, p_id_usuario: usuario.id }); } catch { /* ignora */ }
    setAvisos((prev) => prev.filter((x) => x.id !== nt.id));
    if (nt.link_pagina) { irPara(nt.link_pagina, nt.link_ctx || {}); setAberto(false); }
  }

  async function marcarTodasLidas() {
    setBusy("all");
    try { await rpc("erp_notificacao_marcar_lida", { p_id: null, p_id_usuario: usuario.id }); setAvisos([]); }
    catch (e) { window.alert("Erro: " + (e.message || e)); }
    finally { setBusy(null); }
  }

  const nPend = pend.length;
  const nAvisos = avisos.length;
  const total = nPend + nAvisos;

  const corBadge = nPend > 0 ? C.destructive : C.primary;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setAberto((v) => !v)} title="Notificações"
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: total > 0 ? (nPend > 0 ? C.warningBg : C.bluePale) : C.surface2, cursor: "pointer" }}>
        <Bell size={17} style={{ color: total > 0 ? (nPend > 0 ? C.warning : C.primary) : C.textMuted }} />
        {total > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: corBadge, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{total}</span>}
      </button>

      {aberto && (
        <div style={{ position: "absolute", top: 46, right: 0, width: 390, maxWidth: "92vw", maxHeight: 480, display: "flex", flexDirection: "column", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 9998 }}>
          {/* abas */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            <button onClick={() => setAba("pend")} style={abaStyle(aba === "pend")}>
              <ShieldCheck size={14} /> Pendências {nPend > 0 && <b style={badgeMini(C.destructive)}>{nPend}</b>}
            </button>
            <button onClick={() => setAba("avisos")} style={abaStyle(aba === "avisos")}>
              <Bell size={14} /> Avisos {nAvisos > 0 && <b style={badgeMini(C.primary)}>{nAvisos}</b>}
            </button>
          </div>

          <div style={{ overflowY: "auto", maxHeight: 430 }}>
            {aba === "pend" ? (
              nPend === 0 ? (
                <div style={vazio}>Nada aguardando sua liberação.</div>
              ) : pend.map((a) => (
                <div key={a.id} style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={tag(C.primary, C.bluePale)}>{a.tipo}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.foreground }}>{a.titulo}</span>
                  </div>
                  {a.descricao && <div style={{ fontSize: 12.5, color: C.foreground, marginBottom: 6, lineHeight: 1.4 }}>{a.descricao}</div>}
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
                    {a.solicitante || "—"}{a.empresa ? ` · ${a.empresa}` : ""}{a.numero_origem ? ` · ${a.numero_origem}` : ""} · {haQuanto(a.criado_em)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => decidir(a, true)} disabled={busy === "a" + a.id} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, border: "none", background: C.success, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: busy === "a" + a.id ? 0.6 : 1 }}><Check size={14} /> Liberar</button>
                    <button onClick={() => decidir(a, false)} disabled={busy === "a" + a.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, color: C.destructive, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: busy === "a" + a.id ? 0.6 : 1 }}><X size={14} /> Rejeitar</button>
                  </div>
                </div>
              ))
            ) : (
              nAvisos === 0 ? (
                <div style={vazio}>Sem avisos novos.</div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 10px", borderBottom: `1px solid ${C.border}` }}>
                    <button onClick={marcarTodasLidas} disabled={busy === "all"} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                      <CheckCheck size={13} /> Marcar todas lidas
                    </button>
                  </div>
                  {avisos.map((nt) => (
                    <div key={nt.id} onClick={() => abrirAviso(nt)} style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, cursor: nt.link_pagina ? "pointer" : "default", display: "flex", gap: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 4, background: nt.prioridade > 0 ? C.warning : C.primary, marginTop: 5, flex: "0 0 auto" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          {nt.tipo && <span style={tag(C.muted, C.surface2)}>{nt.tipo}</span>}
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.foreground, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nt.titulo}</span>
                        </div>
                        {nt.corpo && <div style={{ fontSize: 12.5, color: C.foreground, lineHeight: 1.4 }}>{nt.corpo}</div>}
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                          {nt.numero_origem ? nt.numero_origem + " · " : ""}{haQuanto(nt.criado_em)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const abaStyle = (ativo) => ({
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "10px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "none",
  background: ativo ? C.card : C.surface2, color: ativo ? C.foreground : C.textMuted,
  borderBottom: ativo ? `2px solid ${C.primary}` : "2px solid transparent",
});
const badgeMini = (cor) => ({ background: cor, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "0 5px", minWidth: 16, textAlign: "center" });
const tag = (cor, bg) => ({ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: cor, background: bg, padding: "1px 6px", borderRadius: 4 });
const vazio = { padding: "28px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 };
