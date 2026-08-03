import { useState, useEffect } from "react";
import { PackageOpen, Plus, Search, ArrowLeft, Save, X, Printer, CheckCircle2, AlertCircle, Ban, Link2, DollarSign, Tag, Trash2, Eye } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton, SelectBusca } from "../ui";
import { EtiquetasLote } from "../EtiquetasLoteModal";

const VAZIA = () => ({ id: null, id_empresa: "", id_tipo_entrada: "", id_fornecedor: "", id_pedido: "", numero_nf_fornecedor: "", serie_nf: "", chave_nfe: "", data_emissao_nf: "", id_centro_estoque: "", id_condicao_pagamento: "", id_centro_custo: "", valor_frete: "", valor_desconto: "", valor_outras: "", observacao: "", itens: [] });
const statusCor = (s) => ({ DIGITACAO: "ABERTA", CONFIRMADO: "FATURADA", CANCELADO: "CANCELADA" }[s] || "muted");

export default function Entradas({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.compras) || {};
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [fEmpresa, setFEmpresa] = useState("");
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(VAZIA());
  const [atual, setAtual] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [finOpen, setFinOpen] = useState(false);
  const [loteOpen, setLoteOpen] = useState(false);
  const [loteItens, setLoteItens] = useState([]);
  // linha de item em edição
  const [it, setIt] = useState({ id_produto: "", quantidade: "", valor_unitario: "", valor_ipi: "" });

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function carregar() {
    setLoading(true);
    try { const d = await rpc("erp_entrada_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d); }
    catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [fEmpresa]);

  const L = dados || {};
  const empresas = L.empresas || [], fornecedores = L.fornecedores || [], produtos = L.produtos || [];
  const tiposEntrada = L.tipos_entrada || [], centrosEstoque = L.centros_estoque || [], condPag = L.condicoes_pagamento || [];
  const pedidosAbertos = L.pedidos_abertos || [], planoContas = L.plano_contas || [], centrosCusto = L.centros_custo || [];
  const nomeProd = (id) => (produtos.find((p) => p.id === Number(id)) || {});
  const nomeForn = (id) => (fornecedores.find((f) => f.id === Number(id)) || {}).nome || "—";
  const nomeTipo = (id) => (tiposEntrada.find((t) => t.id === Number(id)) || {}).descricao || "—";

  const abrirNova = () => { setForm(VAZIA()); setErroForm(""); setView("form"); };
  const abrirEditar = (e) => { setForm({ ...VAZIA(), ...e, itens: (e.itens || []).map((i) => ({ id_produto: i.id_produto, descricao: i.descricao, produto_ref: i.produto_ref, quantidade: i.quantidade, valor_unitario: i.valor_unitario, valor_ipi: i.valor_ipi || 0, id_pedido_item: i.id_pedido_item || null })) }); setErroForm(""); setView("form"); };
  const abrirDetalhe = (e) => { setAtual(e); setView("detalhe"); };

  async function vincularPedido(idPedido) {
    setF("id_pedido", idPedido);
    if (!idPedido) return;
    try {
      const d = await rpc("erp_pedido_compra_detalhe", { p_id: Number(idPedido) });
      const ped = (pedidosAbertos.find((p) => String(p.id) === String(idPedido)) || {});
      const itens = (d.itens || []).map((i) => ({ id_produto: i.id_produto, descricao: i.descricao, produto_ref: i.referencia_fornecedor || "", quantidade: Math.max(0, num(i.quantidade) - num(i.quantidade_recebida)) || num(i.quantidade), valor_unitario: i.valor_unitario, valor_ipi: 0, id_pedido_item: i.id }));
      setForm((f) => ({ ...f, id_pedido: idPedido, id_fornecedor: f.id_fornecedor || ped.id_fornecedor || "", itens }));
      notificar("Itens do pedido carregados.");
    } catch (e) { notificar("Erro ao carregar pedido: " + e.message, "erro"); }
  }

  function addItem() {
    if (!it.id_produto) { notificar("Selecione o produto.", "erro"); return; }
    const p = nomeProd(it.id_produto);
    setForm((f) => ({ ...f, itens: [...f.itens, { id_produto: Number(it.id_produto), descricao: p.descricao || "", produto_ref: p.referencia || "", quantidade: num(it.quantidade) || 1, valor_unitario: num(it.valor_unitario) || 0, valor_ipi: num(it.valor_ipi) || 0, id_pedido_item: null }] }));
    setIt({ id_produto: "", quantidade: "", valor_unitario: "", valor_ipi: "" });
  }
  const rmItem = (idx) => setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));

  const totalProdutos = form.itens.reduce((s, i) => s + num(i.quantidade) * num(i.valor_unitario), 0);
  const totalIpi = form.itens.reduce((s, i) => s + num(i.valor_ipi), 0);
  const totalGeral = totalProdutos + totalIpi + num(form.valor_frete) + num(form.valor_outras) - num(form.valor_desconto);

  async function salvar() {
    if (!form.id_empresa) { setErroForm("Selecione a empresa."); return; }
    if (!form.id_tipo_entrada) { setErroForm("Selecione o tipo de operação."); return; }
    if (form.itens.length === 0) { setErroForm("Adicione ao menos um item."); return; }
    setErroForm(""); setSaving(true);
    try {
      const r = await rpc("erp_entrada_salvar", {
        p_id: form.id || null, p_id_empresa: Number(form.id_empresa), p_id_fornecedor: form.id_fornecedor ? Number(form.id_fornecedor) : null,
        p_id_pedido: form.id_pedido ? Number(form.id_pedido) : null, p_id_usuario: usuario.id,
        p_id_centro_estoque: form.id_centro_estoque ? Number(form.id_centro_estoque) : null, p_id_tipo_entrada: Number(form.id_tipo_entrada),
        p_numero_nf_fornecedor: form.numero_nf_fornecedor || null, p_serie_nf: form.serie_nf || null, p_chave_nfe: form.chave_nfe || null,
        p_data_emissao_nf: form.data_emissao_nf || null, p_valor_frete: num(form.valor_frete), p_valor_desconto: num(form.valor_desconto),
        p_valor_outras: num(form.valor_outras), p_observacao: form.observacao || null,
        p_id_condicao_pagamento: form.id_condicao_pagamento ? Number(form.id_condicao_pagamento) : null,
        p_id_centro_custo: form.id_centro_custo ? Number(form.id_centro_custo) : null,
        p_itens: form.itens.map((i) => ({ id_produto: i.id_produto, id_pedido_item: i.id_pedido_item || null, descricao: i.descricao, quantidade: num(i.quantidade), valor_unitario: num(i.valor_unitario), valor_ipi: num(i.valor_ipi) || 0 })),
      });
      if (r && r.ok === false) { setErroForm(r.erro || "Falha ao salvar."); setSaving(false); return; }
      notificar(form.id ? "Entrada atualizada." : `Entrada ${r.numero} criada.`);
      const d = await rpc("erp_entrada_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d);
      const nova = (d.entradas || []).find((x) => x.id === (r.id || form.id));
      if (nova) abrirDetalhe(nova); else setView("lista");
    } catch (e) { setErroForm("Erro: " + (e.message || e)); }
    finally { setSaving(false); }
  }

  async function finalizar(planoContas) {
    setSaving(true);
    try {
      const r = await rpc("erp_entrada_finalizar", { p_id: atual.id, p_id_usuario: usuario.id, p_plano_contas: planoContas || [] });
      if (r && r.ok === false) { notificar(r.erro || "Falha ao finalizar.", "erro"); setSaving(false); setFinOpen(false); return; }
      notificar(`Entrada confirmada — ${r.movimentos_estoque || 0} item(ns) no estoque${r.titulos_gerados ? `, ${r.titulos_gerados} título(s)` : ""}.`);
      setFinOpen(false);
      const d = await rpc("erp_entrada_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d);
      const at = (d.entradas || []).find((x) => x.id === atual.id); setAtual(at || null); if (!at) setView("lista");
    } catch (e) { notificar("Erro: " + (e.message || e), "erro"); }
    finally { setSaving(false); }
  }

  async function cancelar() {
    if (!window.confirm("Cancelar esta entrada em digitação?")) return;
    try {
      await rpc("erp_entrada_cancelar", { p_id: atual.id, p_id_usuario: usuario.id });
      notificar("Entrada cancelada.");
      const d = await rpc("erp_entrada_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d); setView("lista");
    } catch (e) { notificar("Erro: " + (e.message || e), "erro"); }
  }

  function imprimirEtiquetas(e) {
    setLoteItens((e.itens || []).map((i) => ({ id: i.id_produto, nome: i.descricao, referencia: i.produto_ref, codigo_barras: i.produto_ref, preco_venda: "", qtd: num(i.quantidade) })));
    setLoteOpen(true);
  }

  /* ───────── render ───────── */
  if (loteOpen) return <EtiquetasLote produtos={[]} itens={loteItens} setItens={setLoteItens} onClose={() => setLoteOpen(false)} />;

  if (view === "form") return (
    <FormEntrada {...{ form, setF, erroForm, saving, salvar, voltar: () => setView("lista"), empresas, fornecedores, produtos, tiposEntrada, centrosEstoque, condPag, pedidosAbertos, centrosCusto, vincularPedido, it, setIt, addItem, rmItem, totalProdutos, totalIpi, totalGeral, nomeProd, toast }} />
  );

  if (view === "detalhe" && atual) {
    const dig = atual.status === "DIGITACAO";
    return (
      <>
        {toast && <Toast toast={toast} />}
        {finOpen && <FinalizarModal total={atual.valor_total} planoContas={planoContas} centrosCusto={centrosCusto} onClose={() => setFinOpen(false)} onConfirm={finalizar} saving={saving} />}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={18} /></button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Entrada {atual.numero} <Badge texto={atual.status} cor={statusCor(atual.status)} /></h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{nomeForn(atual.id_fornecedor)} · {nomeTipo(atual.id_tipo_entrada)}{atual.pedido_numero ? ` · Pedido ${atual.pedido_numero}` : ""}{atual.numero_nf_fornecedor ? ` · NF ${atual.numero_nf_fornecedor}` : ""}</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => imprimirEtiquetas(atual)} style={btnGhost()}><Tag size={14} /> Etiquetas</button>
            {dig && perms.editar && <button onClick={() => abrirEditar(atual)} style={btnGhost()}><Save size={14} /> Editar</button>}
            {dig && perms.excluir && <button onClick={cancelar} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><Ban size={14} /> Cancelar</button>}
            {dig && perms.aprovar && <button onClick={() => setFinOpen(true)} style={btnPrimary()}><CheckCircle2 size={14} /> Finalizar (dar entrada)</button>}
          </div>
        </div>
        <div style={{ ...cardStyle(), padding: 0, overflowX: "auto", marginBottom: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Produto", "Ref.", "Qtd", "Vlr unit.", "IPI", "Total", "Custo final"].map((h, i) => <th key={i} style={th(i >= 2)}>{h}</th>)}</tr></thead>
            <tbody>
              {(atual.itens || []).map((i) => (
                <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ ...td(), fontWeight: 500 }}>{i.descricao}</td>
                  <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{i.produto_ref || "—"}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(i.quantidade)}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(i.valor_unitario)}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(i.valor_ipi)}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(i.valor_total)}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.blueMid }}>{fmtBRL(i.custo_unitario_final)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...cardStyle(), maxWidth: 320, marginLeft: "auto" }}>
          {[["Produtos", atual.valor_produtos], ["IPI", atual.valor_ipi], ["ICMS ST", atual.valor_icms_st], ["Frete", atual.valor_frete], ["Outras", atual.valor_outras], ["Desconto", atual.valor_desconto != null ? -atual.valor_desconto : 0]].filter(([, v]) => num(v) !== 0).map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}><span style={{ color: C.muted }}>{l}</span><span style={{ fontFamily: mono }}>{fmtBRL(v)}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 6 }}><span>TOTAL</span><span style={{ fontFamily: mono }}>{fmtBRL(atual.valor_total)}</span></div>
        </div>
      </>
    );
  }

  // LISTA
  const lista = (L.entradas || []).filter((e) => { const q = busca.trim().toLowerCase(); return !q || (e.numero || "").toLowerCase().includes(q) || (e.fornecedor_nome || "").toLowerCase().includes(q) || (e.numero_nf_fornecedor || "").toLowerCase().includes(q); });
  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Entradas (NF)</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Compra, retorno, devolução — recebimento de mercadoria</p></div>
        {perms.incluir && <button onClick={abrirNova} style={btnPrimary()}><Plus size={16} /> Nova entrada</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nº, fornecedor ou NF..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
        <select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel()}><option value="">Todas as empresas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}</select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : lista.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><PackageOpen size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma entrada.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 680 }}>
              <thead><tr>{["Nº", "Fornecedor", "Tipo", "NF", "Total", "Status", ""].map((h, i) => <th key={i} style={th(i === 4)}>{h}</th>)}</tr></thead>
              <tbody>{lista.map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => abrirDetalhe(e)} onMouseEnter={(ev) => ev.currentTarget.style.background = C.surface2} onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}>
                  <td style={{ ...td(), fontFamily: mono, fontWeight: 600 }}>{e.numero}</td>
                  <td style={td()}>{e.fornecedor_nome || "—"}</td>
                  <td style={{ ...td(), color: C.muted }}>{nomeTipo(e.id_tipo_entrada)}</td>
                  <td style={{ ...td(), fontFamily: mono }}>{e.numero_nf_fornecedor || "—"}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(e.valor_total)}</td>
                  <td style={td()}><Badge texto={e.status} cor={statusCor(e.status)} /></td>
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

function FormEntrada({ form, setF, erroForm, saving, salvar, voltar, empresas, fornecedores, produtos, tiposEntrada, centrosEstoque, condPag, pedidosAbertos, centrosCusto, vincularPedido, it, setIt, addItem, rmItem, totalProdutos, totalIpi, totalGeral, nomeProd }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={voltar} style={btnIcon()}><ArrowLeft size={18} /></button>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{form.id ? "Editar entrada" : "Nova entrada"}</h1></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={voltar} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={salvar} disabled={saving} style={btnPrimary()}><Save size={16} /> {saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
      {erroForm && <Aviso cor="destructive"><AlertCircle size={15} /> {erroForm}</Aviso>}

      <Secao titulo="Operação">
        <Campo label="Empresa *"><select value={form.id_empresa} onChange={(e) => setF("id_empresa", e.target.value)} style={sel(true)}><option value="">Selecione...</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}</select></Campo>
        <Campo label="Tipo de operação *"><select value={form.id_tipo_entrada} onChange={(e) => setF("id_tipo_entrada", e.target.value)} style={sel(true)}><option value="">Selecione...</option>{tiposEntrada.map((t) => <option key={t.id} value={t.id}>{t.descricao}</option>)}</select></Campo>
        <Campo label="Fornecedor"><SelectBusca full opcoes={fornecedores.map((f) => ({ id: f.id, label: f.nome, sub: f.cpf_cnpj || "" }))} value={form.id_fornecedor} onChange={(v) => setF("id_fornecedor", v)} placeholder="Selecione..." /></Campo>
        <Campo label="Vincular pedido de compra"><select value={form.id_pedido} onChange={(e) => vincularPedido(e.target.value)} style={sel(true)}><option value="">— sem pedido —</option>{pedidosAbertos.map((p) => <option key={p.id} value={p.id}>{p.numero} · {p.fornecedor_nome}</option>)}</select></Campo>
        <Campo label="Centro de estoque"><select value={form.id_centro_estoque} onChange={(e) => setF("id_centro_estoque", e.target.value)} style={sel(true)}><option value="">Selecione...</option>{centrosEstoque.map((c) => <option key={c.id} value={c.id}>{c.descricao || c.nome}</option>)}</select></Campo>
        <Campo label="Condição de pagamento"><select value={form.id_condicao_pagamento} onChange={(e) => setF("id_condicao_pagamento", e.target.value)} style={sel(true)}><option value="">—</option>{condPag.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}</select></Campo>
      </Secao>

      <Secao titulo="Nota fiscal de entrada">
        <Campo label="Nº da NF"><input value={form.numero_nf_fornecedor} onChange={(e) => setF("numero_nf_fornecedor", e.target.value)} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Série"><input value={form.serie_nf} onChange={(e) => setF("serie_nf", e.target.value)} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Data de emissão"><input type="date" value={form.data_emissao_nf} onChange={(e) => setF("data_emissao_nf", e.target.value)} style={inp(true)} /></Campo>
        <Campo label="Chave NF-e" span={3}><input value={form.chave_nfe} onChange={(e) => setF("chave_nfe", e.target.value)} placeholder="44 dígitos" style={{ ...inp(true), fontFamily: mono }} /></Campo>
      </Secao>

      <div style={{ ...cardStyle(), marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 12 }}>Itens</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 90px 120px 100px auto", gap: 8, alignItems: "end", background: C.surface2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Campo label="Produto"><SelectBusca full opcoes={produtos.map((p) => ({ id: p.id, label: p.descricao, sub: p.referencia || "" }))} value={it.id_produto} onChange={(v) => setIt((x) => ({ ...x, id_produto: v }))} placeholder="Buscar produto..." /></Campo>
          <Campo label="Qtd"><input value={it.quantidade} onChange={(e) => setIt((x) => ({ ...x, quantidade: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <Campo label="Vlr unit."><input value={it.valor_unitario} onChange={(e) => setIt((x) => ({ ...x, valor_unitario: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <Campo label="IPI (R$)"><input value={it.valor_ipi} onChange={(e) => setIt((x) => ({ ...x, valor_ipi: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <button onClick={addItem} style={{ ...btnPrimary(), padding: "10px 12px" }}><Plus size={14} /></button>
        </div>
        {form.itens.length === 0 ? <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: "12px 0" }}>Nenhum item. Adicione acima ou vincule um pedido.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Produto", "Ref.", "Qtd", "Vlr unit.", "IPI", "Total", ""].map((h, i) => <th key={i} style={th(i >= 2)}>{h}</th>)}</tr></thead>
            <tbody>{form.itens.map((i, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...td(), fontWeight: 500 }}>{i.descricao}{i.id_pedido_item ? <Link2 size={12} style={{ marginLeft: 6, color: C.blueMid }} /> : null}</td>
                <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{i.produto_ref || "—"}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(i.quantidade)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(i.valor_unitario)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(i.valor_ipi)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(num(i.quantidade) * num(i.valor_unitario))}</td>
                <td style={{ ...td(), textAlign: "right" }}><button onClick={() => rmItem(idx)} style={{ ...btnIcon(), color: C.destructive }}><Trash2 size={14} /></button></td>
              </tr>))}
            </tbody>
          </table>}
      </div>

      <Secao titulo="Valores">
        <Campo label="Frete (R$)"><input value={form.valor_frete} onChange={(e) => setF("valor_frete", e.target.value.replace(/[^\d.,]/g, ""))} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Desconto (R$)"><input value={form.valor_desconto} onChange={(e) => setF("valor_desconto", e.target.value.replace(/[^\d.,]/g, ""))} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Outras despesas (R$)"><input value={form.valor_outras} onChange={(e) => setF("valor_outras", e.target.value.replace(/[^\d.,]/g, ""))} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Observação" span={3}><textarea value={form.observacao} onChange={(e) => setF("observacao", e.target.value)} rows={2} style={{ ...inp(true), resize: "vertical", height: "auto", paddingTop: 10 }} /></Campo>
      </Secao>

      <div style={{ ...cardStyle(), maxWidth: 320, marginLeft: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}><span style={{ color: C.muted }}>Produtos</span><span style={{ fontFamily: mono }}>{fmtBRL(totalProdutos)}</span></div>
        {totalIpi > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}><span style={{ color: C.muted }}>IPI</span><span style={{ fontFamily: mono }}>{fmtBRL(totalIpi)}</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 6 }}><span>TOTAL</span><span style={{ fontFamily: mono }}>{fmtBRL(totalGeral)}</span></div>
      </div>
    </>
  );
}

function FinalizarModal({ total, planoContas, centrosCusto, onClose, onConfirm, saving }) {
  const [gerar, setGerar] = useState(false);
  const [idPlano, setIdPlano] = useState("");
  const [venc, setVenc] = useState("");
  const [valor, setValor] = useState(String(total || ""));
  function confirmar() {
    if (gerar) {
      if (!idPlano) { alert("Selecione o plano de contas."); return; }
      onConfirm([{ id_plano_conta: Number(idPlano), valor: num(valor) || num(total), data_vencimento: venc || null, parcela: "1/1" }]);
    } else { onConfirm([]); }
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,29,53,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle(), width: 520, maxWidth: "100%" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Finalizar entrada</div>
        <Aviso cor="warning"><AlertCircle size={15} /> Isto dá <b>entrada no estoque</b> (com custo médio) e atualiza o pedido vinculado. Não pode ser desfeito.</Aviso>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, margin: "8px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={gerar} onChange={(e) => setGerar(e.target.checked)} /> <span>Gerar conta a pagar (título)</span>
        </label>
        {gerar && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <Campo label="Plano de contas"><select value={idPlano} onChange={(e) => setIdPlano(e.target.value)} style={sel(true)}><option value="">Selecione...</option>{(planoContas || []).map((p) => <option key={p.id} value={p.id}>{(p.codigo ? p.codigo + " - " : "") + (p.descricao || p.nome)}</option>)}</select></Campo>
            <Campo label="Vencimento"><input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} style={inp(true)} /></Campo>
            <Campo label="Valor (R$)"><input value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))} style={{ ...inp(true), fontFamily: mono }} /></Campo>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={btnGhost()}>Cancelar</button>
          <button onClick={confirmar} disabled={saving} style={btnPrimary()}><CheckCircle2 size={15} /> {saving ? "Processando..." : "Confirmar entrada"}</button>
        </div>
      </div>
    </div>
  );
}
