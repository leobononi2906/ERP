import { useState, useEffect, useCallback, useRef } from "react";
import { PackageCheck, RefreshCw, Search, X, Ban, Check, Undo2 } from "lucide-react";
import { C, mono, num, rpc } from "../config";
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
  const permsOs = (usuario && usuario.permissoes && usuario.permissoes.os) || {};
  const permsEstoque = (usuario && usuario.permissoes && usuario.permissoes.estoque) || {};
  const podeAtender = permsOs.aprovar || permsOs.editar || permsEstoque.aprovar || permsEstoque.editar || usuario?.admin;

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
  const [devolOpen, setDevolOpen] = useState(false);

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
    if (cancelar || devolOpen) return; // modal aberto: não capturar
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const digitando = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      if (e.key.toLowerCase() === "d" && !digitando) { e.preventDefault(); setDevolOpen(true); return; }
      if (!filtrada.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setLinha((s) => Math.min(filtrada.length - 1, s + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setLinha((s) => Math.max(0, s - 1)); }
      else if (e.key === "Enter" && !digitando) { const s = filtrada[linha]; if (s && (s.status === "PENDENTE" || s.status === "PARCIAL")) atender(s); }
      else if (e.key.toLowerCase() === "c" && !digitando) { const s = filtrada[linha]; if (s && (s.status === "PENDENTE" || s.status === "PARCIAL")) setCancelar({ id: s.id, motivo: "" }); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtrada, linha, atender, cancelar, devolOpen]);

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
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDevolOpen(true)} style={{ ...btnGhost(), borderColor: C.primary, color: C.primary }} title="Devolver peça de OS/Venda aberta (atalho: D)"><Undo2 size={14} /> Devolver peça <kbd style={{ marginLeft: 4, fontSize: 10, background: C.surface2, borderRadius: 4, padding: "1px 5px", fontFamily: mono }}>D</kbd></button>
          <button onClick={() => { setLoading(true); carregar(); }} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
        </div>
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
                        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: mono, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {s.referencia && <span>{s.referencia}</span>}
                          {s.localizacao && <span style={{ color: C.blueMid, fontWeight: 700 }}>📍 {s.localizacao}</span>}
                        </div>
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

      {devolOpen && <DevolucaoAberta idCentro={idCentro} centros={centros} usuario={usuario} notificar={notificar} onClose={() => setDevolOpen(false)} onDone={carregar} />}
    </div>
  );
}

// ============================================================================
// DEVOLUÇÃO DE PEÇA — OS/Venda ABERTA (fluxo boqueta, teclado-first)
// número → Enter · código/bipe → Enter · quantidade → Enter
// ============================================================================
function DevolucaoAberta({ idCentro, centros, usuario, notificar, onClose, onDone }) {
  const [tipo, setTipo] = useState("VENDA");
  const [numero, setNumero] = useState("");
  const [doc, setDoc] = useState(null);
  const [erroDoc, setErroDoc] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [sel, setSel] = useState(null);
  const [qtd, setQtd] = useState("1");
  const [salvando, setSalvando] = useState(false);
  const [centro, setCentro] = useState(idCentro || "");
  const numRef = useRef(null), codRef = useRef(null), qtdRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => numRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  useEffect(() => { setCentro(idCentro || ""); }, [idCentro]);
  useEffect(() => { function onKey(e) { if (e.key === "Escape") onClose(); } window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);

  async function buscar() {
    if (!numero.trim()) return;
    setBuscando(true); setErroDoc(""); setDoc(null); setSel(null); setCodigo("");
    try {
      const r = await rpc("erp_devolucao_aberta_buscar", { p_origem: tipo, p_numero: numero.trim() });
      if (!r || r.ok === false) { setErroDoc(r?.erro || "Documento não encontrado."); return; }
      if (!r.aberta) { setErroDoc(`${tipo === "OS" ? "OS" : "Venda"} ${r.numero} está ${r.status} — devolução só em documento aberto.`); return; }
      setDoc(r);
      setTimeout(() => codRef.current?.focus(), 50);
    } catch (e) { setErroDoc(e.message); }
    finally { setBuscando(false); }
  }

  function resolverCodigo() {
    const q = codigo.trim().toLowerCase();
    if (!q || !doc) return;
    const its = doc.itens || [];
    const it = its.find((i) => String(i.codigo) === q || (i.codigo_barras || "").toLowerCase() === q || (i.referencia || "").toLowerCase() === q)
      || its.find((i) => (i.descricao || "").toLowerCase().includes(q));
    if (!it) { notificar(`"${codigo}" não está em aberto neste documento.`, "erro"); return; }
    selecionar(it);
  }
  function selecionar(it) { setSel(it); setQtd(String(num(it.quantidade))); setTimeout(() => { qtdRef.current?.focus(); qtdRef.current?.select(); }, 30); }

  async function confirmar() {
    if (!doc || !sel) { notificar("Escolha o produto (código/bipe).", "erro"); return; }
    if (!centro) { notificar("Selecione o centro de estoque para o retorno.", "erro"); return; }
    const q = num(qtd);
    if (q <= 0) { notificar("Quantidade inválida.", "erro"); return; }
    if (q > num(sel.quantidade)) { notificar(`Só há ${num(sel.quantidade)} em aberto.`, "erro"); return; }
    setSalvando(true);
    try {
      const r = await rpc("erp_devolver_peca_aberta", { p_origem: tipo, p_id_origem: doc.id, p_id_produto: sel.id_produto, p_qtd: q, p_id_centro: Number(centro), p_id_usuario: usuario.id });
      if (!r || r.ok === false) { notificar(r?.erro || "Falha ao devolver.", "erro"); return; }
      notificar(`Devolvido: ${r.produto} ×${num(r.qtd_devolvida)}${num(r.estoque_retornado) > 0 ? " · voltou ao estoque" : ""}`);
      const rr = await rpc("erp_devolucao_aberta_buscar", { p_origem: tipo, p_numero: doc.numero });
      setDoc(rr && rr.ok !== false ? rr : doc);
      setSel(null); setCodigo(""); setQtd("1");
      setTimeout(() => codRef.current?.focus(), 30);
      onDone && onDone();
    } catch (e) { notificar(e.message, "erro"); }
    finally { setSalvando(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,29,53,0.45)", zIndex: 600, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...cardStyle(), width: 660, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <b style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Undo2 size={18} color={C.primary} /> Devolução de peça — OS/Venda aberta</b>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>Peça devolvida em documento <b>ainda não faturado</b>: sai da OS/venda e volta ao estoque. Teclado: número → <b>Enter</b>, código/bipe → <b>Enter</b>, quantidade → <b>Enter</b>. <b>Esc</b> fecha.</p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <div>
            <label style={miniLbl}>Tipo</label>
            <div style={{ display: "flex", gap: 4 }}>
              {["VENDA", "OS"].map((t) => (
                <button key={t} onClick={() => { setTipo(t); setDoc(null); setErroDoc(""); setSel(null); setTimeout(() => numRef.current?.focus(), 30); }}
                  style={{ ...btnGhost(), padding: "8px 14px", fontWeight: 700, ...(tipo === t ? { background: C.primary, color: "#fff", borderColor: C.primary } : {}) }}>{t === "VENDA" ? "Venda" : "OS"}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={miniLbl}>Número da {tipo === "OS" ? "OS" : "venda"}</label>
            <input ref={numRef} value={numero} onChange={(e) => setNumero(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscar(); } }} placeholder="Digite/bipe o número e Enter" style={{ ...inp(), width: "100%", fontFamily: mono }} />
          </div>
          <div style={{ minWidth: 180 }}>
            <label style={miniLbl}>Centro (retorno)</label>
            <select value={centro} onChange={(e) => setCentro(e.target.value)} style={{ ...sel(), width: "100%", borderColor: !centro ? C.warning : C.border }}>
              <option value="">Selecione...</option>
              {(centros || []).map((c) => <option key={c.id} value={c.id}>{c.descricao || c.nome}</option>)}
            </select>
          </div>
          <button onClick={buscar} disabled={buscando} style={btnPrimary()}><Search size={15} /> {buscando ? "..." : "Buscar"}</button>
        </div>

        {erroDoc && <div style={{ background: C.destructiveBg, color: C.destructive, padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{erroDoc}</div>}

        {doc && (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "10px 12px", background: C.surface2, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              <span><b style={{ fontFamily: mono }}>{doc.numero}</b></span>
              <span style={{ color: C.muted }}>Cliente: <b style={{ color: C.foreground }}>{doc.cliente}</b></span>
              <span style={{ color: C.muted }}>Status: {doc.status}</span>
            </div>

            <div style={{ ...cardStyle(), padding: 0, overflow: "hidden", marginBottom: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Cód.", "Produto", "Ref.", "Em aberto", ""].map((h, i) => <th key={i} style={th(i === 3)}>{h}</th>)}</tr></thead>
                <tbody>{(doc.itens || []).length === 0
                  ? <tr><td colSpan={5} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: "16px 0" }}>Sem produtos em aberto neste documento.</td></tr>
                  : doc.itens.map((it) => (
                    <tr key={it.id_produto} onClick={() => selecionar(it)} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: sel && sel.id_produto === it.id_produto ? "rgba(0,170,238,0.10)" : "transparent" }}>
                      <td style={{ ...td(), fontFamily: mono, fontWeight: 700, color: C.primary }}>{it.codigo ?? "—"}</td>
                      <td style={td()}>{it.descricao}{!it.movimentou_estoque && <span style={{ marginLeft: 6, fontSize: 10, color: C.textMuted }}>(não baixou estoque)</span>}</td>
                      <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{it.referencia || "—"}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(it.quantidade)}</td>
                      <td style={{ ...td(), textAlign: "right", color: C.muted, fontSize: 12 }}>selecionar</td>
                    </tr>
                  ))}</tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={miniLbl}>Código / cód. barras / ref.</label>
                <input ref={codRef} value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resolverCodigo(); } }} placeholder="Bipe/digite o produto e Enter" style={{ ...inp(), width: "100%", fontFamily: mono }} />
              </div>
              <div style={{ width: 110 }}>
                <label style={miniLbl}>Quantidade</label>
                <input ref={qtdRef} value={qtd} onChange={(e) => setQtd(e.target.value.replace(/[^\d.,]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } }} inputMode="decimal" style={{ ...inp(), width: "100%", fontFamily: mono, textAlign: "right" }} />
              </div>
              <button onClick={confirmar} disabled={salvando || !sel} style={{ ...btnPrimary(), background: C.success, opacity: salvando || !sel ? 0.6 : 1 }}><Check size={15} /> {salvando ? "..." : "Devolver"}</button>
            </div>
            {sel && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Selecionado: <b style={{ color: C.foreground }}>{sel.descricao}</b> — {num(sel.quantidade)} em aberto.</div>}
          </>
        )}
      </div>
    </div>
  );
}

const miniLbl = { display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 4 };
