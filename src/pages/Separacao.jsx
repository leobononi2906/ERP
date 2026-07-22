import { useState, useEffect, useCallback, useRef } from "react";
import { Package, RefreshCw, Printer, Hand, CheckCircle2, XCircle, AlertCircle, PackageOpen, Truck, Store, ArrowLeft, Search, X } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Badge, Aviso } from "../ui";
const STATUS_COR = { SOLICITADA: "ABERTA", EM_SEPARACAO: "BLOQUEADO", SEPARADA: "ATIVO", ENTREGUE: "INATIVO", CANCELADA: "CANCELADA" };
const STATUS_LABEL = { SOLICITADA: "Solicitada", EM_SEPARACAO: "Em separação", SEPARADA: "Separada", ENTREGUE: "Entregue", CANCELADA: "Cancelada" };
const fmtDH = (iso) => { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); };

function Toast({ toast }) {
  if (!toast) return null;
  return <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.tipo === "ok" ? C.success : toast.tipo === "warn" ? C.warning : C.destructive, color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>{toast.msg}</div>;
}

function Info({ label, valor }) {
  return <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted }}>{label}</div><div style={{ fontSize: 13, fontWeight: 500 }}>{valor || "—"}</div></div>;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function Separacao({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.separacao) || {};
  const [fila, setFila] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [fStatus, setFStatus] = useState(["SOLICITADA", "EM_SEPARACAO"]);
  const [fEmpresa, setFEmpresa] = useState("");
  const [fBusca, setFBusca] = useState("");
  const [detalheId, setDetalheId] = useState(null);
  const pollingRef = useRef(null);
  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };

  const carregar = useCallback(async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true);
      const data = await rpc("erp_separacao_dados", { p_status: fStatus.length ? fStatus : null, p_id_empresa: fEmpresa ? Number(fEmpresa) : null, p_busca: fBusca || null });
      setFila(Array.isArray(data?.fila) ? data.fila : []);
      setEmpresas(Array.isArray(data?.empresas) ? data.empresas : []);
    } catch (e) { notificar(e.message || "Erro ao carregar fila.", "destructive"); }
    finally { setLoading(false); }
  }, [fStatus, fEmpresa, fBusca]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    pollingRef.current = setInterval(() => { if (!detalheId) carregar(true); }, 30000);
    return () => clearInterval(pollingRef.current);
  }, [carregar, detalheId]);

  const toggleStatus = (s) => setFStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const assumir = async (id) => {
    try {
      await rpc("erp_separacao_assumir", { p_id: id, p_id_usuario: usuario.id });
      notificar("Separação assumida!");
      carregar(true);
    } catch (e) { notificar(e.message, "destructive"); }
  };

  // === DETALHE ===
  if (detalheId) return <SeparacaoDetalhe id={detalheId} perms={perms} onVoltar={() => { setDetalheId(null); carregar(true); }} />;

  // === FILA ===
  return (
    <>
      <Toast toast={toast} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Separação — Fila</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{fila.length} solicitações · {usuario.nome}</p></div>
        <button onClick={() => carregar()} style={btnGhost()}><RefreshCw size={16} style={loading ? { animation: "spin 1s linear infinite" } : {}} /> Atualizar</button>
      </div>

      {/* Filtros */}
      <div style={{ ...cardStyle(), display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.keys(STATUS_LABEL).map(s => (
            <button key={s} onClick={() => toggleStatus(s)} style={{ ...btnGhost(), opacity: fStatus.includes(s) ? 1 : 0.35, padding: "5px 10px", fontSize: 11 }}>
              <Badge texto={STATUS_LABEL[s]} cor={STATUS_COR[s]} />
            </button>
          ))}
        </div>
        <select value={fEmpresa} onChange={e => setFEmpresa(e.target.value)} style={sel()}><option value="">Todas empresas</option>{empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={fBusca} onChange={e => setFBusca(e.target.value)} placeholder="Buscar nº, venda, OS ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
      </div>

      {/* Tabela */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16 }}>{[0,1,2,3,4].map(i => <div key={i} style={{ height: 36, background: C.surface2, borderRadius: 6, marginBottom: 8, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
          : fila.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><PackageOpen size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma solicitação nos filtros escolhidos.</div></div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }}>
              <thead><tr>{["Nº", "Empresa", "Origem", "Cliente", "Solicitante", "Data/hora", "Itens", "Status", ""].map((h, i) => <th key={i} style={th(i === 6)}>{h}</th>)}</tr></thead>
              <tbody>{fila.map((r, i) => (
                <tr key={r.id} onClick={() => setDetalheId(r.id)} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 ? C.surface2 : "transparent", cursor: "pointer" }}>
                  <td style={{ ...td(), fontWeight: 700 }}>{r.numero}</td>
                  <td style={td()}><Badge texto={r.empresa || "—"} cor="INATIVO" /></td>
                  <td style={td()}>{r.numero_venda ? `Venda ${r.numero_venda}` : r.numero_os ? `OS ${r.numero_os}` : "—"}</td>
                  <td style={{ ...td(), maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.cliente || "—"}</td>
                  <td style={td()}>{r.solicitante || "—"}</td>
                  <td style={{ ...td(), whiteSpace: "nowrap", fontFamily: mono, fontSize: 12 }}>{fmtDH(r.data_solicitacao)}</td>
                  <td style={{ ...td(), textAlign: "center", fontFamily: mono, fontWeight: 600 }}>{r.qtd_itens}</td>
                  <td style={td()}><Badge texto={STATUS_LABEL[r.status] || r.status} cor={STATUS_COR[r.status]} /></td>
                  <td style={{ ...td(), textAlign: "right", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                    {r.status === "SOLICITADA" && perms.aprovar && <button onClick={() => assumir(r.id)} style={btnIcon()} title="Assumir separação"><Hand size={16} /></button>}
                    <button onClick={() => imprimirPicking(r.id)} style={{ ...btnIcon(), marginLeft: 4 }} title="Imprimir picking"><Printer size={16} /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
        }
      </div>
    </>
  );
}

// ============================================================================
// DETALHE / VALIDACAO
// ============================================================================
function SeparacaoDetalhe({ id, perms, onVoltar }) {
  const [cab, setCab] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [modal, setModal] = useState(null);
  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rpc("erp_separacao_detalhe", { p_id: id });
      setCab(data?.cabecalho || null);
      const its = Array.isArray(data?.itens) ? data.itens : [];
      setItens(its.map(i => ({ ...i, qtd_input: i.quantidade_separada > 0 ? Number(i.quantidade_separada) : Number(i.quantidade_pedida), motivo_input: i.motivo_falta || "", obs_input: i.observacao_falta || "" })));
    } catch (e) { notificar(e.message, "destructive"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const editavel = perms.aprovar && ["SOLICITADA", "EM_SEPARACAO"].includes(cab?.status);
  const setItem = (idx, patch) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const confirmar = async () => {
    for (const it of itens) {
      const q = Number(it.qtd_input);
      if (isNaN(q) || q < 0 || q > Number(it.quantidade_pedida)) return notificar(`Quantidade inválida em "${it.produto}".`, "warn");
      if (q < Number(it.quantidade_pedida) && !it.motivo_input) return notificar(`"${it.produto}" — selecione o motivo da falta.`, "warn");
    }
    try {
      setSalvando(true);
      const payload = itens.map(it => ({ id_item: it.id, qtd_separada: Number(it.qtd_input), motivo_falta: Number(it.qtd_input) < Number(it.quantidade_pedida) ? it.motivo_input : null, observacao_falta: it.obs_input || null }));
      const data = await rpc("erp_separacao_confirmar", { p_id_expedicao: id, p_id_usuario: usuario.id, p_itens: payload });
      setResumo(data || {});
      notificar("Separação confirmada!");
      carregar();
    } catch (e) { notificar(e.message, "destructive"); }
    finally { setSalvando(false); }
  };

  const cancelar = async () => {
    try { setSalvando(true); await rpc("erp_separacao_cancelar", { p_id: id, p_id_usuario: usuario.id }); setModal(null); onVoltar(); }
    catch (e) { notificar(e.message, "destructive"); setModal(null); } finally { setSalvando(false); }
  };

  const entregar = async (destino) => {
    try { setSalvando(true); await rpc("erp_separacao_entregar", { p_id: id, p_entregue_para: destino, p_id_usuario: usuario.id }); setModal(null); notificar("Entrega registrada!"); carregar(); }
    catch (e) { notificar(e.message, "destructive"); setModal(null); } finally { setSalvando(false); }
  };

  if (loading) return <div style={{ padding: 20 }}>{[0,1,2,3].map(i => <div key={i} style={{ height: 40, background: C.surface2, borderRadius: 6, marginBottom: 10, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>;
  if (!cab) return <div style={{ padding: 20 }}><button onClick={onVoltar} style={btnGhost()}><ArrowLeft size={16} /> Voltar</button><Aviso cor="destructive"><AlertCircle size={16} /> Solicitação não encontrada.</Aviso></div>;

  return (
    <>
      <Toast toast={toast} />
      {/* Topo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onVoltar} style={btnGhost()}><ArrowLeft size={16} /> Fila</button>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{cab.numero}</h1>
          <Badge texto={STATUS_LABEL[cab.status] || cab.status} cor={STATUS_COR[cab.status]} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => imprimirPicking(id)} style={btnGhost()}><Printer size={16} /> Picking</button>
          {perms.excluir && ["SOLICITADA", "EM_SEPARACAO"].includes(cab.status) && <button onClick={() => setModal("cancelar")} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><XCircle size={16} /> Cancelar</button>}
        </div>
      </div>

      {/* Info cabeçalho */}
      <div style={{ ...cardStyle(), display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <Info label="Empresa" valor={cab.empresa} />
        <Info label="Origem" valor={cab.numero_venda ? `Venda ${cab.numero_venda}` : cab.numero_os ? `OS ${cab.numero_os}` : "—"} />
        <Info label="Cliente" valor={cab.cliente} />
        <Info label="Centro" valor={cab.centro_estoque} />
        <Info label="Solicitante" valor={cab.solicitante} />
        <Info label="Solicitada em" valor={fmtDH(cab.data_solicitacao)} />
        <Info label="Separador" valor={cab.separador} />
        <Info label="Separada em" valor={fmtDH(cab.data_separacao)} />
      </div>

      {/* Resumo pos-confirmacao */}
      {resumo && <Aviso cor="success"><CheckCircle2 size={16} /> Separação confirmada — {num(resumo.qtd_separada)} separado(s), {num(resumo.qtd_falta)} em falta, {num(resumo.vendas_perdidas_geradas)} venda(s) perdida(s).</Aviso>}

      {/* Itens */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
          <thead><tr>{["Produto", "Ref.", "Disponível", "Pedida", "Separada", "Motivo da falta", "Observação"].map((h, i) => <th key={i} style={th([2,3,4].includes(i))}>{h}</th>)}</tr></thead>
          <tbody>{itens.map((it, idx) => {
            const falta = Number(it.qtd_input) < Number(it.quantidade_pedida);
            return (
              <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...td(), fontWeight: 600, maxWidth: 240 }}>{it.produto}{it.consumo && <span style={{ marginLeft: 8, background: C.warningBg, color: C.warning, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>CONSUMO</span>}</td>
                <td style={{ ...td(), fontFamily: mono, fontSize: 12 }}>{it.referencia || "—"}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(it.estoque_disponivel)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(it.quantidade_pedida)}</td>
                <td style={{ ...td(), textAlign: "right" }}>
                  {editavel ? <input type="number" min="0" max={it.quantidade_pedida} value={it.qtd_input} onChange={e => setItem(idx, { qtd_input: e.target.value })} style={{ ...inp(), width: 80, textAlign: "right" }} />
                    : <span style={{ fontFamily: mono }}>{num(it.quantidade_separada)}</span>}
                </td>
                <td style={td()}>
                  {editavel && falta ? <select value={it.motivo_input} onChange={e => setItem(idx, { motivo_input: e.target.value })} style={{ ...sel(), borderColor: !it.motivo_input ? C.destructive : C.border, minWidth: 160 }}>
                    <option value="">Selecione...</option><option value="ERRO_LANCAMENTO">Erro de lançamento</option><option value="VENDA_PERDIDA">Venda perdida</option>
                  </select> : it.motivo_falta ? <Badge texto={it.motivo_falta === "ERRO_LANCAMENTO" ? "Erro lanç." : "Venda perdida"} cor="CANCELADA" /> : "—"}
                </td>
                <td style={td()}>
                  {editavel && falta ? <input value={it.obs_input} onChange={e => setItem(idx, { obs_input: e.target.value })} placeholder="Opcional" style={{ ...inp(), width: "100%" }} /> : (it.observacao_falta || "—")}
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </div>

      {/* Acoes */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {editavel && <button onClick={confirmar} disabled={salvando} style={btnPrimary()}><CheckCircle2 size={16} /> {salvando ? "Confirmando..." : "Confirmar separação"}</button>}
        {perms.aprovar && cab.status === "SEPARADA" && <button onClick={() => setModal("entregar")} style={btnPrimary()}><Truck size={16} /> Registrar entrega</button>}
      </div>

      {/* Modal cancelar */}
      {modal === "cancelar" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...cardStyle(), width: 400 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Cancelar solicitação</h3>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Cancelar a solicitação {cab.numero}? Os itens NÃO serão separados.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModal(null)} style={btnGhost()}>Voltar</button>
              <button onClick={cancelar} disabled={salvando} style={{ ...btnPrimary(), background: C.destructive }}>{salvando ? "Aguarde..." : "Confirmar cancelamento"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal entrega */}
      {modal === "entregar" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...cardStyle(), width: 360 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Entregar para...</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => entregar("VENDAS")} disabled={salvando} style={{ ...btnGhost(), flexDirection: "column", padding: "20px 12px", gap: 8 }}><Store size={24} color={C.primary} /><span style={{ fontSize: 13, fontWeight: 600 }}>Vendas</span></button>
              <button onClick={() => entregar("PATIO")} disabled={salvando} style={{ ...btnGhost(), flexDirection: "column", padding: "20px 12px", gap: 8 }}><Truck size={24} color={C.primary} /><span style={{ fontSize: 13, fontWeight: 600 }}>Pátio</span></button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><button onClick={() => setModal(null)} style={btnGhost()}>Voltar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// PICKING — bobina 78mm
// ============================================================================
async function imprimirPicking(idExpedicao) {
  try {
    const data = await rpc("erp_separacao_detalhe", { p_id: idExpedicao });
    if (!data?.cabecalho) return;
    const c = data.cabecalho;
    const itens = Array.isArray(data.itens) ? data.itens : [];
    const linhas = itens.map(i => `<tr><td style="padding:3px 0;border-bottom:1px dashed #999;font-size:11px;">${i.produto || ""}<br><span style="font-size:10px;color:#555;">Ref: ${i.referencia || "—"}</span></td><td style="padding:3px 0;border-bottom:1px dashed #999;text-align:right;font-size:14px;font-weight:bold;vertical-align:middle;">${Number(i.quantidade_pedida || 0).toLocaleString("pt-BR")}</td><td style="padding:3px 0 3px 6px;border-bottom:1px dashed #999;text-align:right;font-size:12px;vertical-align:middle;">[&nbsp;&nbsp;&nbsp;]</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:78mm auto;margin:2mm;}body{margin:0;font-family:Arial,sans-serif;}</style></head><body><div style="width:74mm;"><div style="text-align:center;border-bottom:2px solid #000;padding-bottom:4px;"><div style="font-size:15px;font-weight:bold;">SEPARAÇÃO ${c.numero || ""}</div><div style="font-size:11px;">${c.empresa || ""}</div></div><div style="font-size:11px;padding:4px 0;"><b>Origem:</b> ${c.numero_venda ? "Venda " + c.numero_venda : c.numero_os ? "OS " + c.numero_os : "—"}<br><b>Cliente:</b> ${c.cliente || "—"}<br><b>Solicitante:</b> ${c.solicitante || "—"}<br><b>Data:</b> ${c.data_solicitacao ? new Date(c.data_solicitacao).toLocaleString("pt-BR") : "—"}</div><table style="width:100%;border-collapse:collapse;border-top:1px solid #000;"><tr><th style="text-align:left;font-size:10px;padding:3px 0;">PRODUTO</th><th style="text-align:right;font-size:10px;padding:3px 0;">QTD</th><th style="text-align:right;font-size:10px;padding:3px 0;">OK</th></tr>${linhas}</table><div style="margin-top:14px;font-size:11px;">Separador: ______________________<br><br>Conferido: ______________________</div></div></body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 2000); }, 100);
  } catch (e) { console.error("Erro ao imprimir picking:", e); }
}
