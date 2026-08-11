import { useState, useEffect, useCallback } from "react";
import { FileText, RefreshCw, Plus, Trash2, ArrowLeft, Send, ShoppingCart, Award, Save } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Campo, Skeleton, BuscaServidor, SelectBusca } from "../ui";
import { irPara, consumirCtx } from "../nav";
import { useEmpresaAtiva } from "../empresa";

const fmtData = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");

const ST = {
  ABERTA: ["Aberta", C.bluePale, C.primary],
  ENVIADA: ["Enviada", C.warningBg, C.warning],
  RESPONDIDA: ["Respondida", C.warningBg, C.warning],
  FINALIZADA: ["Finalizada", C.successBg, C.success],
  CANCELADA: ["Cancelada", C.destructiveBg, C.destructive],
};
function StatusBadge({ s }) {
  const [txt, bg, fg] = ST[s] || [s || "—", C.surface2, C.muted];
  return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{txt}</span>;
}

// Cotação de compra: Sugestão (sem fornecedor) → COTAR → lançar respostas por fornecedor →
// mapa comparativo (vencedor por item) → gerar 1 pedido por fornecedor.
export default function Cotacoes({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.compras) || {};
  const podeIncluir = perms.incluir || usuario?.admin;
  const empresaGlobal = useEmpresaAtiva();

  const [dados, setDados] = useState({ empresas: [], fornecedores: [] });
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("lista"); // lista | edicao | detalhe
  const [fStatus, setFStatus] = useState("");

  // edição (cabeçalho + itens)
  const [form, setForm] = useState({ id: null, id_empresa: "", data_validade: "", observacao: "" });
  const [itens, setItens] = useState([]); // {id_produto, nome, referencia, quantidade}

  // detalhe (respostas + mapa)
  const [det, setDet] = useState(null);
  const [respForn, setRespForn] = useState("");
  const [resp, setResp] = useState({}); // id_produto -> {preco, prazo, cond}

  const notificar = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };

  const carregarLista = useCallback(async () => {
    setLoading(true);
    try {
      const [d, l] = await Promise.all([
        rpc("erp_pedido_compra_dados", { p_id_empresa: null, p_status: null }),
        rpc("erp_cotacao_listar", { p_id_empresa: empresaGlobal, p_status: fStatus || null }),
      ]);
      setDados({ empresas: d?.empresas || [], fornecedores: d?.fornecedores || [] });
      setLista(Array.isArray(l) ? l : []);
    } catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, [empresaGlobal, fStatus]);
  useEffect(() => { carregarLista(); }, [carregarLista]);

  // Handoff da Demanda: abrir cotação recém-criada
  useEffect(() => {
    const ctx = consumirCtx();
    if (ctx && ctx.id_cotacao) abrirDetalhe(ctx.id_cotacao);
    /* eslint-disable-next-line */
  }, []);

  /* ─── nova / editar ─────────────────────────────────────────── */
  function nova() {
    setForm({ id: null, id_empresa: empresaGlobal ? String(empresaGlobal) : "", data_validade: "", observacao: "" });
    setItens([]);
    setView("edicao");
  }

  function addProduto(p) {
    setItens((xs) => {
      if (xs.some((i) => i.id_produto === p.id)) return xs;
      return [...xs, { id_produto: p.id, nome: p.nome, referencia: p.referencia, quantidade: 1 }];
    });
  }

  async function salvarCotacao(irParaDetalhe = true) {
    if (!form.id_empresa) { notificar("Selecione a empresa.", "erro"); return null; }
    if (itens.length === 0) { notificar("Adicione ao menos um produto.", "erro"); return null; }
    setSaving(true);
    try {
      const id = await rpc("erp_cotacao_salvar", {
        p_cab: { id: form.id, id_empresa: Number(form.id_empresa), id_usuario: usuario?.id || null, data_validade: form.data_validade || null, observacao: form.observacao || null },
        p_itens: itens.map((i) => ({ id_produto: i.id_produto, quantidade: num(i.quantidade) || 1 })),
      });
      notificar("Cotação salva.");
      if (irParaDetalhe) await abrirDetalhe(id);
      else { setView("lista"); carregarLista(); }
      return id;
    } catch (e) { notificar("Erro ao salvar: " + e.message, "erro"); return null; }
    finally { setSaving(false); }
  }

  /* ─── detalhe ───────────────────────────────────────────────── */
  const abrirDetalhe = useCallback(async (id) => {
    setLoading(true);
    try {
      const d = await rpc("erp_cotacao_detalhe", { p_id: id });
      setDet(d); setRespForn(""); setResp({});
      setView("detalhe");
    } catch (e) { notificar("Erro ao abrir: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, []);

  function editarItens() {
    if (!det) return;
    setForm({ id: det.cab.id, id_empresa: String(det.cab.id_empresa), data_validade: det.cab.data_validade ? String(det.cab.data_validade).slice(0, 10) : "", observacao: det.cab.observacao || "" });
    setItens((det.itens || []).map((i) => ({ id_produto: i.id_produto, nome: i.nome, referencia: i.referencia, quantidade: i.quantidade })));
    setView("edicao");
  }

  // Ao escolher fornecedor no lançamento, pré-carrega respostas existentes dele
  function selecionarForn(idf) {
    setRespForn(idf);
    const pre = {};
    if (idf && det) {
      (det.respostas || []).filter((r) => String(r.id_fornecedor) === String(idf)).forEach((r) => {
        pre[r.id_produto] = { preco: r.preco_unitario ?? "", prazo: r.prazo_entrega_dias ?? "", cond: r.condicao_pagamento ?? "" };
      });
    }
    setResp(pre);
  }

  async function salvarResposta() {
    if (!respForn) { notificar("Selecione o fornecedor.", "erro"); return; }
    const itensResp = (det.itens || [])
      .map((i) => ({ id_produto: i.id_produto, preco_unitario: num(resp[i.id_produto]?.preco) || 0, prazo_entrega_dias: num(resp[i.id_produto]?.prazo) || 0, condicao_pagamento: resp[i.id_produto]?.cond || null }))
      .filter((x) => x.preco_unitario > 0);
    if (itensResp.length === 0) { notificar("Informe ao menos um preço.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("erp_cotacao_resposta_salvar", { p_id_cotacao: det.cab.id, p_id_fornecedor: Number(respForn), p_itens: itensResp, p_id_usuario: usuario?.id || null });
      if (["ABERTA", "ENVIADA"].includes(det.cab.status)) { try { await rpc("erp_cotacao_status", { p_id: det.cab.id, p_status: "RESPONDIDA" }); } catch { /* noop */ } }
      notificar("Resposta lançada.");
      await abrirDetalhe(det.cab.id);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function selecionar(id_produto, id_fornecedor) {
    try {
      await rpc("erp_cotacao_selecionar", { p_id_cotacao: det.cab.id, p_id_produto: id_produto, p_id_fornecedor: id_fornecedor });
      await abrirDetalhe(det.cab.id);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }
  async function selecionarMenor() {
    try {
      const r = await rpc("erp_cotacao_selecionar_menor", { p_id_cotacao: det.cab.id });
      notificar(`${r?.selecionados || 0} item(ns) com menor preço selecionado(s).`);
      await abrirDetalhe(det.cab.id);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }
  async function mudarStatus(s) {
    try { await rpc("erp_cotacao_status", { p_id: det.cab.id, p_status: s }); await abrirDetalhe(det.cab.id); }
    catch (e) { notificar("Erro: " + e.message, "erro"); }
  }
  async function gerarPedidos() {
    if (!window.confirm("Gerar pedido(s) de compra com os fornecedores selecionados? Um pedido por fornecedor.")) return;
    setSaving(true);
    try {
      const r = await rpc("erp_cotacao_gerar_pedidos", { p_id_cotacao: det.cab.id, p_id_usuario: usuario?.id || null });
      const peds = (r && r.pedidos) || [];
      notificar(`${peds.length} pedido(s) gerado(s): ${peds.map((p) => p.numero).join(", ")}`);
      setTimeout(() => irPara("pedidos_compra"), 900);
    } catch (e) { notificar("Erro ao gerar: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── helpers do mapa ───────────────────────────────────────── */
  const respostaDe = (idProd, idForn) => (det?.respostas || []).find((r) => r.id_produto === idProd && String(r.id_fornecedor) === String(idForn));
  const menorDoItem = (idProd) => {
    const ps = (det?.respostas || []).filter((r) => r.id_produto === idProd && num(r.preco_unitario) > 0).map((r) => num(r.preco_unitario));
    return ps.length ? Math.min(...ps) : null;
  };
  const qtdItem = (idProd) => num((det?.itens || []).find((i) => i.id_produto === idProd)?.quantidade) || 1;
  const totalSelecionado = () => (det?.respostas || []).filter((r) => r.selecionado).reduce((s, r) => s + num(r.preco_unitario) * qtdItem(r.id_produto), 0);
  const nSelecionados = () => (det?.respostas || []).filter((r) => r.selecionado).length;

  const editavel = det && !["FINALIZADA", "CANCELADA"].includes(det.cab.status);

  /* ═══════════════════════════════════════════════════════════ */
  const Toast = toast ? <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.t === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>{toast.m}</div> : null;

  /* ─── LISTA ─────────────────────────────────────────────────── */
  if (view === "lista") {
    return (
      <div>
        {Toast}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Cotações de Compra</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Cote com vários fornecedores antes de fechar o pedido</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={carregarLista} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
            {podeIncluir && <button onClick={nova} style={btnPrimary()}><Plus size={15} /> Nova cotação</button>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {[["", "Todas"], ["ABERTA", "Abertas"], ["RESPONDIDA", "Respondidas"], ["FINALIZADA", "Finalizadas"], ["CANCELADA", "Canceladas"]].map(([v, l]) => (
            <button key={v} onClick={() => setFStatus(v)} style={{ ...btnGhost(), background: fStatus === v ? C.bluePale : "#fff", color: fStatus === v ? C.primary : C.foreground, borderColor: fStatus === v ? C.blueLight : C.border }}>{l}</button>
          ))}
        </div>

        <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
          {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={30} />)}</div>
            : lista.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><FileText size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma cotação.</div></div>
              : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
                <thead><tr>{["Número", "Status", "Emissão", "Validade", "Itens", "Forn.", "Selec.", ""].map((h, i) => <th key={i} style={th(i >= 4 && i <= 6)}>{h}</th>)}</tr></thead>
                <tbody>{lista.map((c) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => abrirDetalhe(c.id)}>
                    <td style={{ ...td(), fontFamily: mono, fontWeight: 700, color: C.primary }}>{c.numero}</td>
                    <td style={td()}><StatusBadge s={c.status} /></td>
                    <td style={{ ...td(), fontFamily: mono }}>{fmtData(c.data_emissao)}</td>
                    <td style={{ ...td(), fontFamily: mono }}>{fmtData(c.data_validade)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{c.qtd_itens}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{c.qtd_fornecedores}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{c.qtd_selecionados}</td>
                    <td style={{ ...td(), textAlign: "right" }}><span style={{ color: C.primary, fontWeight: 600 }}>Abrir →</span></td>
                  </tr>
                ))}</tbody>
              </table></div>}
        </div>
      </div>
    );
  }

  /* ─── EDIÇÃO (cabeçalho + itens) ────────────────────────────── */
  if (view === "edicao") {
    return (
      <div>
        {Toast}
        <button onClick={() => (det ? setView("detalhe") : setView("lista"))} style={{ ...btnGhost(), marginBottom: 14 }}><ArrowLeft size={14} /> Voltar</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>{form.id ? "Editar cotação" : "Nova cotação"}</h1>

        <div style={{ ...cardStyle(), marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Campo label="Empresa">
              <select value={form.id_empresa} onChange={(e) => setForm((f) => ({ ...f, id_empresa: e.target.value }))} style={sel(true)} disabled={!!form.id}>
                <option value="">Selecione...</option>
                {dados.empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Validade (opcional)"><input type="date" value={form.data_validade} onChange={(e) => setForm((f) => ({ ...f, data_validade: e.target.value }))} style={inp(true)} /></Campo>
            <Campo label="Observação"><input value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} style={inp(true)} /></Campo>
          </div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 6 }}>Adicionar produto</label>
          <BuscaServidor
            campos={[{ key: "nome", label: "Nome" }, { key: "referencia", label: "Referência" }, { key: "codigo_barras", label: "Cód. barras" }]}
            buscar={(campo, termo) => rpc("erp_produtos_buscar", { p_campo: campo, p_termo: termo, p_limit: 30 })}
            render={(p) => ({ label: p.nome, sub: [p.referencia].filter(Boolean).join(" · ") })}
            onSelect={addProduto}
            placeholder="Buscar produto (nome, ref, cód)..."
            full
          />
        </div>

        <div style={{ ...cardStyle(), padding: 0, overflow: "hidden", marginBottom: 14 }}>
          {itens.length === 0 ? <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted, fontSize: 13 }}>Nenhum item. Busque produtos acima.</div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead><tr>{["Ref.", "Produto", "Quantidade", ""].map((h, i) => <th key={i} style={th(i === 2)}>{h}</th>)}</tr></thead>
              <tbody>{itens.map((i) => (
                <tr key={i.id_produto} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{i.referencia || "—"}</td>
                  <td style={td()}>{i.nome}</td>
                  <td style={{ ...td(), textAlign: "right" }}><input value={i.quantidade} onChange={(e) => setItens((xs) => xs.map((x) => x.id_produto === i.id_produto ? { ...x, quantidade: e.target.value.replace(/[^\d.,]/g, "") } : x))} inputMode="decimal" style={{ ...inp(), width: 90, textAlign: "right", fontFamily: mono, height: 34 }} /></td>
                  <td style={{ ...td(), textAlign: "right" }}><button onClick={() => setItens((xs) => xs.filter((x) => x.id_produto !== i.id_produto))} style={{ ...btnGhost(), padding: "4px 8px", color: C.destructive }}><Trash2 size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => (det ? setView("detalhe") : setView("lista"))} style={btnGhost()}>Cancelar</button>
          <button onClick={() => salvarCotacao(true)} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}><Save size={15} /> {saving ? "Salvando..." : "Salvar cotação"}</button>
        </div>
      </div>
    );
  }

  /* ─── DETALHE (respostas + mapa comparativo) ────────────────── */
  if (view === "detalhe" && det) {
    const cab = det.cab, fornecedores = det.fornecedores || [], itensDet = det.itens || [];
    return (
      <div>
        {Toast}
        <button onClick={() => { setDet(null); setView("lista"); carregarLista(); }} style={{ ...btnGhost(), marginBottom: 14 }}><ArrowLeft size={14} /> Voltar</button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: mono }}>{cab.numero}</h1>
              <StatusBadge s={cab.status} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>Emissão {fmtData(cab.data_emissao)}{cab.data_validade ? ` · validade ${fmtData(cab.data_validade)}` : ""}{cab.observacao ? ` · ${cab.observacao}` : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {editavel && <button onClick={editarItens} style={btnGhost()}>Editar itens</button>}
            {editavel && cab.status === "ABERTA" && <button onClick={() => mudarStatus("ENVIADA")} style={btnGhost()}><Send size={14} /> Marcar enviada</button>}
            {editavel && <button onClick={() => { if (window.confirm("Cancelar esta cotação?")) mudarStatus("CANCELADA"); }} style={{ ...btnGhost(), color: C.destructive }}>Cancelar cotação</button>}
          </div>
        </div>

        {/* Lançar resposta de fornecedor */}
        {editavel && (
          <div style={{ ...cardStyle(), marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted }}>Lançar resposta de fornecedor</label>
              <div style={{ minWidth: 260 }}>
                <SelectBusca full opcoes={[{ id: "", label: "Selecione o fornecedor..." }, ...dados.fornecedores.map((f) => ({ id: f.id, label: f.nome }))]} value={respForn} onChange={selecionarForn} placeholder="Fornecedor" />
              </div>
            </div>
            {respForn && (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 620 }}>
                    <thead><tr>{["Produto", "Qtd", "Preço un.", "Prazo (d)", "Cond. pgto"].map((h, i) => <th key={i} style={th(i === 1 || i === 2 || i === 3)}>{h}</th>)}</tr></thead>
                    <tbody>{itensDet.map((i) => (
                      <tr key={i.id_produto} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={td()}><div style={{ fontWeight: 500 }}>{i.nome}</div>{i.referencia && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: mono }}>{i.referencia}</div>}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(i.quantidade)}</td>
                        <td style={{ ...td(), textAlign: "right" }}><input value={resp[i.id_produto]?.preco ?? ""} onChange={(e) => setResp((r) => ({ ...r, [i.id_produto]: { ...r[i.id_produto], preco: e.target.value.replace(/[^\d.,]/g, "") } }))} inputMode="decimal" placeholder="0,00" style={{ ...inp(), width: 100, textAlign: "right", fontFamily: mono, height: 34 }} /></td>
                        <td style={{ ...td(), textAlign: "right" }}><input value={resp[i.id_produto]?.prazo ?? ""} onChange={(e) => setResp((r) => ({ ...r, [i.id_produto]: { ...r[i.id_produto], prazo: e.target.value.replace(/[^\d]/g, "") } }))} inputMode="numeric" style={{ ...inp(), width: 70, textAlign: "right", fontFamily: mono, height: 34 }} /></td>
                        <td style={td()}><input value={resp[i.id_produto]?.cond ?? ""} onChange={(e) => setResp((r) => ({ ...r, [i.id_produto]: { ...r[i.id_produto], cond: e.target.value } }))} placeholder="ex.: 30/60" style={{ ...inp(), width: 120, height: 34 }} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={salvarResposta} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}><Save size={15} /> {saving ? "Salvando..." : "Salvar resposta"}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Mapa comparativo */}
        <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Mapa comparativo</div>
            {editavel && fornecedores.length > 0 && <button onClick={selecionarMenor} style={btnGhost()}><Award size={14} /> Selecionar menor preço</button>}
          </div>
          {fornecedores.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 13 }}>Ainda sem respostas. Lance os preços dos fornecedores acima.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
                <thead><tr>
                  <th style={{ ...th(), position: "sticky", left: 0, background: C.card }}>Produto</th>
                  <th style={th(true)}>Qtd</th>
                  {fornecedores.map((f) => <th key={f.id_fornecedor} style={{ ...th(true), minWidth: 130 }}>{f.fornecedor}</th>)}
                </tr></thead>
                <tbody>{itensDet.map((i) => {
                  const menor = menorDoItem(i.id_produto);
                  return (
                    <tr key={i.id_produto} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ ...td(), position: "sticky", left: 0, background: C.card }}><div style={{ fontWeight: 500 }}>{i.nome}</div>{i.referencia && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: mono }}>{i.referencia}</div>}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(i.quantidade)}</td>
                      {fornecedores.map((f) => {
                        const r = respostaDe(i.id_produto, f.id_fornecedor);
                        if (!r || num(r.preco_unitario) <= 0) return <td key={f.id_fornecedor} style={{ ...td(), textAlign: "center", color: C.textMuted }}>—</td>;
                        const isMenor = menor != null && Math.abs(num(r.preco_unitario) - menor) < 0.001;
                        const selecionadoCell = r.selecionado;
                        return (
                          <td key={f.id_fornecedor} style={{ ...td(), textAlign: "right", cursor: editavel ? "pointer" : "default", background: selecionadoCell ? C.successBg : "transparent", border: selecionadoCell ? `2px solid ${C.success}` : undefined }}
                            onClick={() => editavel && selecionar(i.id_produto, selecionadoCell ? null : f.id_fornecedor)} title={editavel ? (selecionadoCell ? "Clique para desmarcar" : "Clique para escolher este fornecedor") : ""}>
                            <div style={{ fontFamily: mono, fontWeight: selecionadoCell || isMenor ? 700 : 500, color: selecionadoCell ? C.success : isMenor ? C.primary : C.foreground }}>{fmtBRL(r.preco_unitario)}</div>
                            <div style={{ fontSize: 10.5, color: C.textMuted }}>{num(r.prazo_entrega_dias) > 0 ? `${num(r.prazo_entrega_dias)}d` : ""}{r.condicao_pagamento ? ` · ${r.condicao_pagamento}` : ""}</div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé de ação */}
        {fornecedores.length > 0 && (
          <div style={{ ...cardStyle(), marginTop: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13 }}>
              <b>{nSelecionados()}</b> item(ns) selecionado(s) · total estimado <b style={{ fontFamily: mono }}>{fmtBRL(totalSelecionado())}</b>
            </div>
            <div style={{ flex: 1 }} />
            {editavel && podeIncluir
              ? <button onClick={gerarPedidos} disabled={saving || nSelecionados() === 0} style={{ ...btnPrimary(), background: C.success, opacity: (saving || nSelecionados() === 0) ? 0.5 : 1 }}><ShoppingCart size={15} /> {saving ? "Gerando..." : "Gerar pedido(s) de compra"}</button>
              : cab.status === "FINALIZADA" ? <span style={{ fontSize: 12.5, color: C.success, fontWeight: 600 }}>Cotação finalizada — pedidos gerados.</span> : null}
          </div>
        )}
      </div>
    );
  }

  return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}><Skeleton h={30} /></div>;
}
