import { useState, useEffect, useCallback, useRef } from "react";
import { PackageCheck, RefreshCw, Search, X, Ban, Check } from "lucide-react";
import { C, mono, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Skeleton } from "../ui";

const PRIOR = { 1: { t: "Alta", c: C.destructive }, 2: { t: "Média", c: C.warning }, 3: { t: "Normal", c: C.muted } };
const STATUS_COR = {
  PENDENTE: { bg: C.bluePale, fg: C.blueMid, label: "Pendente" },
  PARCIAL:  { bg: "#FFF3E0", fg: C.warning, label: "Parcial" },
  ATENDIDA: { bg: C.successBg, fg: C.success, label: "Atendida" },
  CANCELADA:{ bg: "#F1F5F9", fg: "#64748B", label: "Cancelada" },
};
const pend = (s) => (Number(s.qtd_solicitada) || 0) - (Number(s.qtd_atendida) || 0);

// Fila de solicitações de produto (peças pedidas pelo pátio na OS).
// Espelha a Separação: escolhe o centro de estoque uma vez e atende a fila no teclado.
export default function Solicitacoes({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.os) || {};
  const podeAtender = perms.aprovar || perms.editar || usuario?.admin;

  const [lista, setLista] = useState([]);
  const [centros, setCentros] = useState([]);
  const [idCentro, setIdCentro] = useState("");
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState("ABERTAS"); // ABERTAS | TODAS | ATENDIDA | CANCELADA
  const [busca, setBusca] = useState("");
  const [linha, setLinha] = useState(0);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [cancelar, setCancelar] = useState(null); // { id, motivo }

  const notificar = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); };

  const carregar = useCallback(async () => {
    try {
      const r = await rpc("os_solicitacoes_listar", { p_id_empresa: null, p_status: null });
      const arr = Array.isArray(r) ? r : (r?.os_solicitacoes_listar ?? []);
      setLista(arr);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    rpc("erp_entrada_dados", { p_id_empresa: null })
      .then((d) => { const cs = d?.centros_estoque || []; setCentros(cs); if (cs.length === 1) setIdCentro(String(cs[0].id)); })
      .catch(() => {});
  }, []);

  const filtrada = lista.filter((s) => {
    const okStatus = fStatus === "TODAS" ? true
      : fStatus === "ABERTAS" ? (s.status === "PENDENTE" || s.status === "PARCIAL")
      : s.status === fStatus;
    const q = busca.trim().toLowerCase();
    const okBusca = !q || [s.numero_os, s.cliente, s.produto, s.referencia, s.solicitante].some((v) => (v || "").toLowerCase().includes(q));
    return okStatus && okBusca;
  });
  useEffect(() => { setLinha((s) => Math.min(s, Math.max(0, filtrada.length - 1))); }, [filtrada.length]);

  const atender = useCallback(async (s) => {
    if (!podeAtender) { notificar("Sem permissão para atender.", "erro"); return; }
    if (!idCentro) { notificar("Selecione o centro de estoque (topo).", "erro"); return; }
    if (pend(s) <= 0) { notificar("Nada a atender nesta solicitação.", "erro"); return; }
    setSaving(s.id);
    try {
      const r = await rpc("erp_atender_solicitacao", { p_id_solicitacao: s.id, p_qtd_atendida: pend(s), p_id_centro: parseInt(idCentro), p_id_usuario: usuario.id });
      if (r && r.ok === false) { notificar(r.erro || "Não foi possível atender.", "erro"); return; }
      notificar(`Atendido: ${s.produto}`);
      await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(null); }
  }, [idCentro, podeAtender, usuario, carregar]);

  async function confirmarCancelar() {
    const c = cancelar; if (!c) return;
    try {
      const r = await rpc("erp_cancelar_solicitacao", { p_id: c.id, p_id_usuario: usuario.id, p_motivo: c.motivo || null });
      if (r && r.ok === false) { notificar(r.erro || "Não foi possível cancelar.", "erro"); return; }
      notificar("Solicitação cancelada.");
      setCancelar(null); await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  // teclado: ↑↓ navega, Enter atende, C cancela
  useEffect(() => {
    if (cancelar) return; // modal aberto: não capturar
    function onKey(e) {
      if (!filtrada.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setLinha((s) => Math.min(filtrada.length - 1, s + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setLinha((s) => Math.max(0, s - 1)); }
      else if (e.key === "Enter") { const s = filtrada[linha]; if (s && (s.status === "PENDENTE" || s.status === "PARCIAL")) atender(s); }
      else if (e.key.toLowerCase() === "c") { const s = filtrada[linha]; if (s && (s.status === "PENDENTE" || s.status === "PARCIAL")) setCancelar({ id: s.id, motivo: "" }); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtrada, linha, atender, cancelar]);

  const pendentes = lista.filter((s) => s.status === "PENDENTE" || s.status === "PARCIAL").length;

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.t === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>{toast.m}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Solicitações de Produto</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{pendentes} em aberto · peças pedidas pelo pátio</p>
        </div>
        <button onClick={() => { setLoading(true); carregar(); }} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {/* controles */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "flex-end" }}>
        <div>
          <label style={miniLbl}>Centro de estoque (p/ atender)</label>
          <select value={idCentro} onChange={(e) => setIdCentro(e.target.value)} style={{ ...sel(), minWidth: 200 }}>
            <option value="">Selecione...</option>
            {centros.map((c) => <option key={c.id} value={c.id}>{c.descricao || c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={miniLbl}>Status</label>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}>
            <option value="ABERTAS">Em aberto</option>
            <option value="TODAS">Todas</option>
            <option value="ATENDIDA">Atendidas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <label style={miniLbl}>Busca</label>
          <Search size={15} style={{ position: "absolute", left: 10, top: 32, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="OS, cliente, produto, solicitante..." style={{ ...inp(), paddingLeft: 32, width: "100%" }} />
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>↑↓ seleciona · <b>Enter</b> atende (baixa do centro escolhido) · <b>C</b> cancela</div>

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={34} />)}</div>
        ) : filtrada.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}>
            <PackageCheck size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma solicitação {fStatus === "ABERTAS" ? "em aberto" : "encontrada"}.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }}>
              <thead><tr>{["OS", "Cliente", "Produto", "Solicitante", "Prior.", "Qtd", "Status", "Ações"].map((h, i) => <th key={i} style={th(i === 5)}>{h}</th>)}</tr></thead>
              <tbody>
                {filtrada.map((s, i) => {
                  const st = STATUS_COR[s.status] || STATUS_COR.PENDENTE;
                  const pr = PRIOR[s.prioridade] || PRIOR[3];
                  const aberta = s.status === "PENDENTE" || s.status === "PARCIAL";
                  return (
                    <tr key={s.id} onClick={() => setLinha(i)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: i === linha? "rgba(0,170,238,0.08)" : "transparent", boxShadow: i === linha? `inset 3px 0 0 ${C.blueLight}` : "none" }}>
                      <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{s.numero_os}</span></td>
                      <td style={{ ...td(), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cliente}</td>
                      <td style={{ ...td(), maxWidth: 220 }}>
                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.produto}</div>
                        {s.referencia && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: mono }}>{s.referencia}</div>}
                      </td>
                      <td style={{ ...td(), whiteSpace: "nowrap" }}>{s.solicitante || "—"}</td>
                      <td style={td()}><span style={{ fontSize: 11, fontWeight: 700, color: pr.c }}>{pr.t}</span></td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{Number(s.qtd_atendida) || 0}/{Number(s.qtd_solicitada) || 0}</td>
                      <td style={td()}><span style={{ background: st.bg, color: st.fg, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{st.label}</span></td>
                      <td style={td()}>
                        {aberta && podeAtender && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={(e) => { e.stopPropagation(); atender(s); }} disabled={saving === s.id} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12, background: C.success, opacity: saving === s.id ? 0.6 : 1 }}><Check size={14} /> Atender</button>
                            <button onClick={(e) => { e.stopPropagation(); setCancelar({ id: s.id, motivo: "" }); }} title="Cancelar" style={{ ...btnGhost(), padding: "6px 10px", fontSize: 12, color: C.destructive }}><Ban size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* modal cancelar */}
      {cancelar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,29,53,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...cardStyle(), width: 420, maxWidth: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <b style={{ fontSize: 15 }}>Cancelar solicitação</b>
              <button onClick={() => setCancelar(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <label style={miniLbl}>Motivo (opcional)</label>
            <input value={cancelar.motivo} autoFocus onChange={(e) => setCancelar((c) => ({ ...c, motivo: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") confirmarCancelar(); if (e.key === "Escape") setCancelar(null); }} style={{ ...inp(), width: "100%", marginBottom: 14 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setCancelar(null)} style={btnGhost()}>Voltar</button>
              <button onClick={confirmarCancelar} style={{ ...btnPrimary(), background: C.destructive }}>Cancelar solicitação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const miniLbl = { display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 4 };
