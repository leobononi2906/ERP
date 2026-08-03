import { useState, useEffect } from "react";
import { Truck, Plus, Search, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Ban, Send, Trash2, Eye, PackageCheck } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Skeleton, SelectBusca } from "../ui";

const VAZIO = () => ({ id: null, id_empresa: "", id_fornecedor: "", id_condicao_pagamento: "", data_previsao: "", valor_frete: "", valor_desconto: "", observacao: "", status: "PENDENTE", itens: [] });

// status do pedido -> [rótulo, cor de fundo, cor do texto]
const ST = {
  PENDENTE: ["Pendente", C.warningBg, C.warning],
  APROVADO: ["Aprovado", C.bluePale, C.blueMid],
  ENVIADO: ["Enviado", C.bluePale, C.blueMid],
  RECEBIDO_PARCIAL: ["Receb. parcial", C.warningBg, C.warning],
  RECEBIDO: ["Recebido", C.successBg, C.success],
  CANCELADO: ["Cancelado", C.destructiveBg, C.destructive],
};
function StatusBadge({ status }) {
  const [txt, bg, fg] = ST[status] || [status || "—", C.surface2, C.muted];
  return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{txt}</span>;
}
// status em que o pedido não é mais editável
const BLOQUEADO = (s) => ["RECEBIDO", "RECEBIDO_PARCIAL", "CANCELADO"].includes(s);

export default function PedidosCompra({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.compras) || {};
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [fEmpresa, setFEmpresa] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(VAZIO());
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [it, setIt] = useState({ id_produto: "", quantidade: "", valor_unitario: "", valor_desconto: "" });

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function carregar() {
    setLoading(true);
    try { const d = await rpc("erp_pedido_compra_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d); }
    catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [fEmpresa]);

  const L = dados || {};
  const empresas = L.empresas || [], fornecedores = L.fornecedores || [], produtos = L.produtos || [], condPag = L.condicoes_pagamento || [];
  const nomeProd = (id) => produtos.find((p) => p.id === Number(id)) || {};

  const abrirNovo = () => { setForm(VAZIO()); setErroForm(""); setIt({ id_produto: "", quantidade: "", valor_unitario: "", valor_desconto: "" }); setView("form"); };
  const abrirPedido = (p) => {
    setForm({
      ...VAZIO(), ...p,
      data_previsao: p.data_previsao ? String(p.data_previsao).slice(0, 10) : "",
      valor_frete: p.valor_frete ?? "", valor_desconto: p.valor_desconto ?? "",
      itens: (p.itens || []).map((i) => ({ id_produto: i.id_produto, descricao: i.descricao, produto_ref: i.produto_ref || i.referencia_fornecedor || "", referencia_fornecedor: i.referencia_fornecedor || "", quantidade: i.quantidade, valor_unitario: i.valor_unitario, valor_desconto: i.valor_desconto || 0, quantidade_recebida: i.quantidade_recebida || 0 })),
    });
    setErroForm(""); setView("form");
  };

  function addItem() {
    if (!it.id_produto) { notificar("Selecione o produto.", "erro"); return; }
    const p = nomeProd(it.id_produto);
    setForm((f) => ({ ...f, itens: [...f.itens, { id_produto: Number(it.id_produto), descricao: p.descricao || "", produto_ref: p.referencia || "", referencia_fornecedor: "", quantidade: num(it.quantidade) || 1, valor_unitario: num(it.valor_unitario) || num(p.preco_custo) || 0, valor_desconto: num(it.valor_desconto) || 0, quantidade_recebida: 0 }] }));
    setIt({ id_produto: "", quantidade: "", valor_unitario: "", valor_desconto: "" });
  }
  const setItem = (idx, k, v) => setForm((f) => ({ ...f, itens: f.itens.map((i, ix) => ix === idx ? { ...i, [k]: v } : i) }));
  const rmItem = (idx) => setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));

  const totalProdutos = form.itens.reduce((s, i) => s + num(i.quantidade) * num(i.valor_unitario) - num(i.valor_desconto), 0);
  const totalGeral = totalProdutos + num(form.valor_frete) - num(form.valor_desconto);
  const bloq = BLOQUEADO(form.status);

  async function salvar() {
    if (!form.id_empresa) { setErroForm("Selecione a empresa."); return; }
    if (!form.id_fornecedor) { setErroForm("Selecione o fornecedor."); return; }
    const itensValidos = form.itens.filter((i) => i.id_produto && num(i.quantidade) > 0);
    if (itensValidos.length === 0) { setErroForm("Adicione ao menos um item com quantidade."); return; }
    setErroForm(""); setSaving(true);
    try {
      const cab = {
        id: form.id || null, id_empresa: Number(form.id_empresa), id_fornecedor: Number(form.id_fornecedor),
        id_condicao_pagamento: form.id_condicao_pagamento ? Number(form.id_condicao_pagamento) : null,
        data_previsao: form.data_previsao || null, valor_frete: num(form.valor_frete), valor_desconto: num(form.valor_desconto),
        observacao: form.observacao || null, id_usuario: usuario.id,
      };
      const itens = itensValidos.map((i) => ({ id_produto: Number(i.id_produto), descricao: i.descricao, referencia_fornecedor: i.referencia_fornecedor || null, quantidade: num(i.quantidade), valor_unitario: num(i.valor_unitario), valor_desconto: num(i.valor_desconto) || 0 }));
      const novoId = await rpc("erp_pedido_compra_salvar", { p_cab: cab, p_itens: itens });
      notificar(form.id ? "Pedido salvo." : `Pedido criado.`);
      const d = await rpc("erp_pedido_compra_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d);
      const alvo = (d.pedidos || []).find((x) => x.id === (form.id || Number(novoId)));
      if (alvo) abrirPedido(alvo); else setView("lista");
    } catch (e) { setErroForm("Erro: " + (e.message || e)); }
    finally { setSaving(false); }
  }

  async function mudarStatus(novo) {
    const acao = novo === "APROVADO" ? "aprovar" : novo === "ENVIADO" ? "marcar como enviado" : "atualizar";
    if (!window.confirm(`Confirma ${acao} este pedido?`)) return;
    setSaving(true);
    try {
      await rpc("erp_pedido_compra_status", { p_id: form.id, p_status: novo });
      notificar(`Pedido ${ST[novo] ? ST[novo][0].toLowerCase() : novo}.`);
      const d = await rpc("erp_pedido_compra_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d);
      const alvo = (d.pedidos || []).find((x) => x.id === form.id);
      if (alvo) abrirPedido(alvo);
    } catch (e) { notificar("Erro: " + (e.message || e), "erro"); }
    finally { setSaving(false); }
  }

  async function cancelar() {
    if (!window.confirm("Cancelar este pedido de compra?")) return;
    setSaving(true);
    try {
      await rpc("erp_pedido_compra_cancelar", { p_id: form.id, p_id_usuario: usuario.id });
      notificar("Pedido cancelado.");
      const d = await rpc("erp_pedido_compra_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d);
      setView("lista");
    } catch (e) { notificar("Erro: " + (e.message || e), "erro"); }
    finally { setSaving(false); }
  }

  /* ───────── FORM ───────── */
  if (view === "form") {
    const podeEditar = !bloq && (form.id ? perms.editar : perms.incluir);
    return (
      <>
        {toast && <Toast toast={toast} />}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={18} /></button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{form.id ? `Pedido ${form.numero || ""}` : "Novo pedido de compra"} {form.id && <StatusBadge status={form.status} />}</h1>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {podeEditar && <button onClick={salvar} disabled={saving} style={btnPrimary()}><Save size={16} /> {saving ? "Salvando..." : "Salvar"}</button>}
            {form.id && form.status === "PENDENTE" && perms.aprovar && <button onClick={() => mudarStatus("APROVADO")} disabled={saving} style={{ ...btnGhost(), color: C.success, borderColor: C.success }}><CheckCircle2 size={15} /> Aprovar</button>}
            {form.id && form.status === "APROVADO" && perms.editar && <button onClick={() => mudarStatus("ENVIADO")} disabled={saving} style={btnGhost()}><Send size={15} /> Marcar enviado</button>}
            {form.id && !bloq && perms.excluir && <button onClick={cancelar} disabled={saving} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><Ban size={15} /> Cancelar</button>}
            <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Fechar</button>
          </div>
        </div>
        {erroForm && <Aviso cor="destructive"><AlertCircle size={15} /> {erroForm}</Aviso>}
        {bloq && <Aviso cor="muted"><AlertCircle size={15} /> Pedido {ST[form.status] ? ST[form.status][0].toLowerCase() : form.status} — somente leitura.</Aviso>}

        <Secao titulo="Dados do pedido">
          <Campo label="Empresa *"><select value={form.id_empresa} onChange={(e) => setF("id_empresa", e.target.value)} disabled={!!form.id || bloq} style={sel(true, !!form.id || bloq)}><option value="">Selecione...</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></Campo>
          <Campo label="Fornecedor *"><SelectBusca full opcoes={fornecedores.map((f) => ({ id: f.id, label: f.nome }))} value={form.id_fornecedor} onChange={(v) => setF("id_fornecedor", v)} placeholder="Selecione..." disabled={bloq} /></Campo>
          <Campo label="Condição de pagamento"><select value={form.id_condicao_pagamento} onChange={(e) => setF("id_condicao_pagamento", e.target.value)} disabled={bloq} style={sel(true, bloq)}><option value="">—</option>{condPag.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}</select></Campo>
          <Campo label="Previsão de entrega"><input type="date" value={form.data_previsao} onChange={(e) => setF("data_previsao", e.target.value)} disabled={bloq} style={inp(true, bloq)} /></Campo>
          <Campo label="Frete (R$)"><input value={form.valor_frete} onChange={(e) => setF("valor_frete", e.target.value.replace(/[^\d.,]/g, ""))} disabled={bloq} style={{ ...inp(true, bloq), fontFamily: mono }} /></Campo>
          <Campo label="Desconto (R$)"><input value={form.valor_desconto} onChange={(e) => setF("valor_desconto", e.target.value.replace(/[^\d.,]/g, ""))} disabled={bloq} style={{ ...inp(true, bloq), fontFamily: mono }} /></Campo>
          <Campo label="Observação" span={3}><textarea value={form.observacao} onChange={(e) => setF("observacao", e.target.value)} disabled={bloq} rows={2} style={{ ...inp(true, bloq), resize: "vertical", height: "auto", paddingTop: 10 }} /></Campo>
        </Secao>

        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 12 }}>Itens</div>
          {!bloq && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 90px 120px 100px auto", gap: 8, alignItems: "end", background: C.surface2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Campo label="Produto"><SelectBusca full opcoes={produtos.map((p) => ({ id: p.id, label: p.descricao, sub: p.referencia || "" }))} value={it.id_produto} onChange={(v) => setIt((x) => ({ ...x, id_produto: v, valor_unitario: x.valor_unitario || String(nomeProd(v).preco_custo || "") }))} placeholder="Buscar produto..." /></Campo>
              <Campo label="Qtd"><input value={it.quantidade} onChange={(e) => setIt((x) => ({ ...x, quantidade: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
              <Campo label="Vlr unit."><input value={it.valor_unitario} onChange={(e) => setIt((x) => ({ ...x, valor_unitario: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
              <Campo label="Desc. (R$)"><input value={it.valor_desconto} onChange={(e) => setIt((x) => ({ ...x, valor_desconto: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
              <button onClick={addItem} style={{ ...btnPrimary(), padding: "10px 12px" }}><Plus size={14} /></button>
            </div>
          )}
          {form.itens.length === 0 ? <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: "12px 0" }}>Nenhum item.</div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Produto", "Ref.", "Qtd", "Vlr unit.", "Desc.", "Total", "Recebido", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 6)}>{h}</th>)}</tr></thead>
              <tbody>{form.itens.map((i, idx) => {
                const tot = num(i.quantidade) * num(i.valor_unitario) - num(i.valor_desconto);
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), fontWeight: 500 }}>{i.descricao}</td>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{i.produto_ref || "—"}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{bloq ? <span style={{ fontFamily: mono }}>{num(i.quantidade)}</span> : <input value={i.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} inputMode="decimal" style={{ ...inp(), width: 74, textAlign: "right", fontFamily: mono }} />}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{bloq ? <span style={{ fontFamily: mono }}>{fmtBRL(i.valor_unitario)}</span> : <input value={i.valor_unitario} onChange={(e) => setItem(idx, "valor_unitario", e.target.value)} inputMode="decimal" style={{ ...inp(), width: 96, textAlign: "right", fontFamily: mono }} />}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{bloq ? <span style={{ fontFamily: mono }}>{fmtBRL(i.valor_desconto)}</span> : <input value={i.valor_desconto} onChange={(e) => setItem(idx, "valor_desconto", e.target.value)} inputMode="decimal" style={{ ...inp(), width: 84, textAlign: "right", fontFamily: mono }} />}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(tot)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: num(i.quantidade_recebida) > 0 ? C.success : C.textMuted }}>{num(i.quantidade_recebida) || "—"}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{!bloq && <button onClick={() => rmItem(idx)} style={{ ...btnIcon(), color: C.destructive }}><Trash2 size={14} /></button>}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>}
        </div>

        <div style={{ ...cardStyle(), maxWidth: 320, marginLeft: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}><span style={{ color: C.muted }}>Produtos</span><span style={{ fontFamily: mono }}>{fmtBRL(totalProdutos)}</span></div>
          {num(form.valor_frete) > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}><span style={{ color: C.muted }}>Frete</span><span style={{ fontFamily: mono }}>{fmtBRL(form.valor_frete)}</span></div>}
          {num(form.valor_desconto) > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}><span style={{ color: C.muted }}>Desconto</span><span style={{ fontFamily: mono }}>-{fmtBRL(form.valor_desconto)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 6 }}><span>TOTAL</span><span style={{ fontFamily: mono }}>{fmtBRL(totalGeral)}</span></div>
        </div>
      </>
    );
  }

  /* ───────── LISTA ───────── */
  const pedidos = (L.pedidos || []).filter((p) => {
    if (fStatus && p.status !== fStatus) return false;
    const q = busca.trim().toLowerCase();
    return !q || (p.numero || "").toLowerCase().includes(q) || (p.fornecedor_nome || "").toLowerCase().includes(q);
  });
  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pedidos de Compra</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Emissão e acompanhamento de pedidos ao fornecedor</p></div>
        {perms.incluir && <button onClick={abrirNovo} style={btnPrimary()}><Plus size={16} /> Novo pedido</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nº ou fornecedor..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
        <select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel()}><option value="">Todas as empresas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}><option value="">Todos os status</option>{Object.keys(ST).map((s) => <option key={s} value={s}>{ST[s][0]}</option>)}</select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : pedidos.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Truck size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum pedido de compra.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead><tr>{["Nº", "Fornecedor", "Previsão", "Itens", "Total", "Status", ""].map((h, i) => <th key={i} style={th(i === 3 || i === 4)}>{h}</th>)}</tr></thead>
              <tbody>{pedidos.map((p) => (
                <tr key={p.id} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => abrirPedido(p)} onMouseEnter={(ev) => ev.currentTarget.style.background = C.surface2} onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}>
                  <td style={{ ...td(), fontFamily: mono, fontWeight: 600 }}>{p.numero}</td>
                  <td style={td()}>{p.fornecedor_nome || "—"}</td>
                  <td style={{ ...td(), color: C.muted }}>{p.data_previsao ? new Date(p.data_previsao + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{p.total_itens || 0}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(p.valor_total)}</td>
                  <td style={td()}><StatusBadge status={p.status} /></td>
                  <td style={{ ...td(), textAlign: "right" }}><button style={btnIcon()}><Eye size={15} /></button></td>
                </tr>))}
              </tbody>
            </table></div>}
      </div>
    </>
  );
}

function Toast({ toast }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.tipo === "erro" ? C.destructiveBg : C.successBg, color: toast.tipo === "erro" ? C.destructive : C.success }}>{toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{toast.msg}</div>;
}
