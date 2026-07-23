import { useState, useEffect } from "react";
import {
  Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle,
  ShoppingCart, Package, Wrench, FileText, DollarSign, Trash2, Eye, Ban,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import {
  cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo,
  Aviso, Badge, Skeleton, ModalAprovacao, SelectBusca,
} from "../ui";


const ITEM_VAZIO = { tipo: "PRODUTO", id_produto: "", id_servico: "", descricao: "", referencia: "", quantidade: 1, valor_unitario: "", percentual_desconto: 0 };

function DescontoFeedback({ limite, origem, bloqueado, promocao }) {
  if (bloqueado) return <span style={{ fontSize: 11, color: C.destructive, fontWeight: 600 }}>Sem desconto</span>;
  if (promocao) return <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>Promo: {promocao.nome}</span>;
  if (limite == null) return null;
  return <span style={{ fontSize: 11, color: C.muted }}>Limite: {limite}%</span>;
}

export default function Vendas({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.vendas) || {};

  /* ─── dados ────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [formasPag, setFormasPag] = useState([]);
  const [condPag, setCondPag] = useState([]);
  const [tiposSaida, setTiposSaida] = useState([]);
  const [tabelasPreco, setTabelasPreco] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [naturezas, setNaturezas] = useState([]);

  /* ─── UI ───────────────────────────────────────────────────── */
  const [view, setView] = useState("lista");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");

  /* ─── detalhe ──────────────────────────────────────────────── */
  const [vendaAtual, setVendaAtual] = useState(null);
  const [itens, setItens] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [rateio, setRateio] = useState([]);
  const [loadDet, setLoadDet] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [formItem, setFormItem] = useState({ ...ITEM_VAZIO });

  /* ─── modais ───────────────────────────────────────────────── */
  const [fatOpen, setFatOpen] = useState(false);
  const [fatForma, setFatForma] = useState("");
  const [fatCond, setFatCond] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState("");
  const [aprovModal, setAprovModal] = useState({ aberto: false, mensagem: "", contexto: {} });

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };
  const nomeCliente = (id) => (clientes.find((c) => c.id === id) || {}).nome || "—";
  const nomeUsuario = (id) => (usuarios.find((u) => u.id === id) || {}).nome || "—";
  const tipoSaidaDesc = (id) => (tiposSaida.find((t) => t.id === id) || {}).descricao || "";

  /* ─── carregar ─────────────────────────────────────────────── */
  async function carregar() {
    setLoading(true);
    try {
      const d = await rpc("vendas_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null });
      setLista(d.vendas ?? []); setClientes(d.clientes ?? []);
      setProdutos(d.produtos ?? []); setServicos(d.servicos ?? []);
      setUsuarios(d.usuarios ?? []); setFormasPag(d.formas_pagamento ?? []);
      setCondPag(d.condicoes_pagamento ?? []); setTiposSaida(d.tipos_saida ?? []);
      setTabelasPreco(d.tabelas_preco ?? []); setEmpresas(d.empresas ?? []);
      setNaturezas(d.naturezas_operacao ?? []);
    } catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, [fEmpresa]);

  /* ─── defaults do cliente ──────────────────────────────────── */
  function aplicarDefaultsCliente(idCliente) {
    const cli = clientes.find((c) => c.id === Number(idCliente));
    if (!cli) return;
    const vendedor = usuarios.find((u) => u.id === cli.id_vendedor);
    setForm((f) => ({
      ...f, id_cliente: idCliente,
      id_vendedor: cli.id_vendedor || f.id_vendedor || "",
      id_condicao_pagamento: cli.id_condicao_pagamento || f.id_condicao_pagamento || "",
      id_tabela_preco: cli.id_tabela_preco || f.id_tabela_preco || "",
      percentual_comissao: vendedor?.percentual_comissao || f.percentual_comissao || 0,
    }));
  }

  /* ─── recalcular preços ao mudar cliente/tabela numa venda existente ── */
  async function recalcularPrecos(novoIdTabela) {
    if (!vendaAtual?.id) return;
    try {
      const res = await rpc("venda_recalcular_precos", {
        p_id_venda: vendaAtual.id,
        p_id_tabela_preco: novoIdTabela ? Number(novoIdTabela) : null,
        p_ator: usuario.id,
      });
      if (res?.itens_alterados > 0) {
        await recarregarDetalhe(vendaAtual.id);
        notificar(`${res.itens_alterados} item(ns) atualizado(s) com novos preços.`);
      }
    } catch (e) { console.error("Erro ao recalcular:", e); }
  }

  /* ─── consulta limite de desconto em tempo real ──────────── */
  const [limiteDesc, setLimiteDesc] = useState(null);
  async function consultarLimiteDesconto(idProduto) {
    if (!idProduto) { setLimiteDesc(null); return; }
    try {
      const r = await rpc("erp_consultar_limite_desconto", {
        p_id_usuario: usuario.id, p_id_produto: Number(idProduto),
      });
      setLimiteDesc(r);
    } catch { setLimiteDesc(null); }
  }

  function isAVista() {
    return !vendaAtual?.id_condicao_pagamento;
  }

  /* ─── CFOP resolvido ───────────────────────────────────────── */
  function cfopResolvido(venda) {
    if (!venda?.id_tipo_saida) return "";
    const tipo = tiposSaida.find((t) => t.id === venda.id_tipo_saida);
    if (!tipo) return "";
    const cli = clientes.find((c) => c.id === venda.id_cliente);
    const emp = empresas.find((e) => e.id === venda.id_empresa);
    if (!cli || !emp) return "";
    const mesmaUf = (cli.uf || "").trim().toUpperCase() === (emp.uf || "").trim().toUpperCase();
    const natId = mesmaUf ? tipo.id_natureza_dentro : tipo.id_natureza_fora;
    if (!natId) return "";
    const nat = naturezas.find((n) => n.id === natId);
    return nat ? `${nat.cfop} — ${nat.descricao}` : "";
  }

  /* ─── abrir detalhe ────────────────────────────────────────── */
  async function abrirDetalhe(venda) {
    setVendaAtual(venda); setLoadDet(true); setView("detalhe"); setAddItem(false);
    try {
      const d = await rpc("vendas_detalhe_dados", { p_id_venda: venda.id });
      setItens(d.itens ?? []);
      setTitulos(d.titulos ?? []);
      setRateio(d.rateio ?? []);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoadDet(false); }
  }

  async function recarregarDetalhe(id) {
    const d = await rpc("vendas_detalhe_dados", { p_id_venda: id });
    setVendaAtual(d.venda);
    setItens(d.itens ?? []);
    setTitulos(d.titulos ?? []);
    setRateio(d.rateio ?? []);
    setLista((l) => l.map((x) => x.id === d.venda.id ? d.venda : x));
  }

  /* ─── salvar venda ─────────────────────────────────────────── */
  async function salvarVenda() {
    if (!form.id_cliente) { setErroForm("Selecione o cliente."); return; }
    if (!form.id_empresa) { setErroForm("Selecione a empresa."); return; }
    setErroForm(""); setSaving(true);
    try {
      const res = await rpc("venda_salvar", { p: { ...form, _ator: usuario.id } });
      if (res?.id) {
        setLista((l) => { const sem = l.filter((x) => x.id !== res.id); return [res, ...sem]; });
        notificar(form.id ? "Venda atualizada." : `Venda nº ${res.numero} criada.`);
        abrirDetalhe(res);
      }
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── preço resolvido: cliente+produto > tabela > geral ─────── */
  const [precoOrigem, setPrecoOrigem] = useState("");
  async function resolverPreco(idProduto) {
    try {
      const r = await rpc("erp_resolver_preco", {
        p_id_cliente: vendaAtual?.id_cliente || null, p_id_produto: Number(idProduto),
        p_id_empresa: vendaAtual?.id_empresa || null, p_id_tabela_preco: vendaAtual?.id_tabela_preco || null,
      });
      if (r?.preco != null) {
        setFormItem((f) => ({ ...f, valor_unitario: r.preco }));
        setPrecoOrigem(r.origem === "CLIENTE_PRODUTO" ? "preço especial do cliente" : r.origem === "GERAL" ? "" : "tabela de preço");
      }
    } catch { /* mantém preço padrão */ }
  }

  /* ─── lançar item ──────────────────────────────────────────── */
  async function lancarItem(libDesconto = false, aprovador = null) {
    if (!formItem.descricao.trim()) { notificar("Descrição obrigatória.", "erro"); return; }
    const qty = num(formItem.quantidade) || 1;
    const vu = num(formItem.valor_unitario) || 0;
    const descP = num(formItem.percentual_desconto) || 0;
    const vDesc = Math.round(qty * vu * descP / 100 * 100) / 100;
    const vt = Math.round((qty * vu - vDesc) * 100) / 100;
    setSaving(true);
    try {
      if (formItem.tipo === "PRODUTO") {
        // Produto vai para Separação em vez de movimentar estoque direto
        const res = await rpc("venda_solicitar_item", {
          p_id_venda: vendaAtual.id,
          p_id_produto: num(formItem.id_produto),
          p_descricao: formItem.descricao,
          p_referencia: formItem.referencia || null,
          p_quantidade: qty, p_valor_unitario: vu,
          p_percentual_desconto: descP, p_valor_desconto: vDesc, p_valor_total: vt,
          p_id_usuario: usuario.id,
          p_lib_desconto: libDesconto,
          p_id_aprovador: aprovador?.id || null,
        });
        await recarregarDetalhe(vendaAtual.id);
        setFormItem({ ...ITEM_VAZIO }); setAddItem(false); setPrecoOrigem("");
        notificar(`Produto solicitado → Separação ${res.numero_sep}`);
      } else {
        // Serviço continua no fluxo normal (sem separação)
        const res = await rpc("venda_lancar_item", { p: {
          id_venda: vendaAtual.id, tipo: "SERVICO",
          id_produto: null,
          id_servico: formItem.id_servico || null,
          descricao: formItem.descricao, referencia: formItem.referencia || null,
          quantidade: qty, valor_unitario: vu, percentual_desconto: descP,
          valor_desconto: vDesc, valor_total: vt, _ator: usuario.id,
        }});
        if (res?.ok === false) { notificar(res.msg, "erro"); setSaving(false); return; }
        await recarregarDetalhe(vendaAtual.id);
        setFormItem({ ...ITEM_VAZIO }); setAddItem(false);
        notificar("Serviço adicionado.");
      }
    } catch (e) {
      if (String(e.message).includes("DESCONTO_EXCEDIDO")) {
        const msg = String(e.message).split("|")[1] || "Desconto acima do permitido.";
        setSaving(false);
        setAprovModal({
          aberto: true, mensagem: msg,
          contexto: { id_venda: vendaAtual.id, id_produto: formItem.id_produto, percentual: num(formItem.percentual_desconto) },
        });
        return;
      } else notificar("Erro: " + e.message, "erro");
    }
    finally { setSaving(false); }
  }

  /* ─── encomenda (produto que não temos em estoque) ─────────── */
  const [encOpen, setEncOpen] = useState(false);
  const [formEnc, setFormEnc] = useState({ id_produto: "", descricao: "", quantidade: 1, observacao: "" });
  async function solicitarEncomenda() {
    if (!formEnc.descricao.trim()) { notificar("Descreva o item da encomenda.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("encomenda_solicitar", { p: {
        origem: "VENDA", id_venda: vendaAtual.id,
        id_produto: formEnc.id_produto || null, descricao: formEnc.descricao,
        quantidade: num(formEnc.quantidade) || 1, observacao: formEnc.observacao || null,
        _ator: usuario.id,
      }});
      setEncOpen(false); setFormEnc({ id_produto: "", descricao: "", quantidade: 1, observacao: "" });
      notificar(`Encomenda ${res.numero} enviada para o Compras cotar.`);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function removerItem(idItem) {
    try {
      await rpc("venda_remover_item", { p: { id_item: idItem, _ator: usuario.id } });
      await recarregarDetalhe(vendaAtual.id);
      notificar("Item removido e estoque devolvido.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  /* ─── faturar ──────────────────────────────────────────────── */
  async function faturar(libCredito = false) {
    if (!fatForma) { notificar("Selecione a forma de pagamento.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("venda_faturar", { p: {
        id_venda: vendaAtual.id, id_forma_pagamento: fatForma,
        id_condicao_pagamento: fatCond || null, _ator: usuario.id,
        _lib_credito: libCredito,
      }});
      if (res?.ok === false) {
        if (res.credito?.permite_liberacao && perms.aprovar && !libCredito) {
          setSaving(false);
          if (window.confirm(res.msg + "\n\nVocê tem permissão de aprovação. Liberar o crédito e faturar mesmo assim?")) { faturar(true); }
          return;
        }
        notificar(res.msg, "erro"); setSaving(false); return;
      }
      await recarregarDetalhe(vendaAtual.id);
      setFatOpen(false);
      notificar("Venda faturada com sucesso!");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── cancelar ─────────────────────────────────────────────── */
  async function cancelar() {
    if (!motivoCancel.trim()) { notificar("Informe o motivo.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("venda_cancelar", { p: { id_venda: vendaAtual.id, motivo: motivoCancel, _ator: usuario.id } });
      if (res?.ok === false) { notificar(res.msg, "erro"); setSaving(false); return; }
      await recarregarDetalhe(vendaAtual.id);
      setCancelOpen(false); setMotivoCancel("");
      notificar("Venda cancelada.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── filtros ──────────────────────────────────────────────── */
  const filtrados = lista.filter((v) => {
    const q = busca.trim().toLowerCase();
    const okB = !q || (v.numero || "").includes(q) || nomeCliente(v.id_cliente).toLowerCase().includes(q);
    return okB && (!fStatus || v.status === fStatus);
  });

  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  /* ═══ FORMULÁRIO ═══ */
  if (view === "form") {
    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.id ? `Editar Venda ${form.numero}` : "Nova Venda"}</h1>
        </div>
        {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}
        <Secao titulo="Dados da Venda">
          <Campo label="Empresa *">
            <select value={form.id_empresa || ""} onChange={(e) => setF("id_empresa", e.target.value)} style={sel(true)}>
              <option value="">Selecione...</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Cliente *" span={2}>
            <SelectBusca
              opcoes={clientes.map((c) => ({ id: c.id, label: c.nome }))}
              value={form.id_cliente || ""}
              onChange={(id) => aplicarDefaultsCliente(id)}
              placeholder="Selecione..."
              full={true}
            />
          </Campo>
          <Campo label="Vendedor">
            <SelectBusca
              opcoes={usuarios.map((u) => ({ id: u.id, label: u.nome }))}
              value={form.id_vendedor || ""}
              onChange={(id) => {
                const vend = usuarios.find((u) => u.id === Number(id));
                setForm((f) => ({ ...f, id_vendedor: id, percentual_comissao: vend?.percentual_comissao || 0 }));
              }}
              placeholder="—"
              full={true}
            />
          </Campo>
          <Campo label="Tipo de Operação">
            <select value={form.id_tipo_saida || ""} onChange={(e) => setF("id_tipo_saida", e.target.value)} style={sel(true)}>
              {tiposSaida.filter((t) => t.ativo).map((t) => <option key={t.id} value={t.id}>{t.descricao}{t.padrao ? " ★" : ""}</option>)}
            </select>
          </Campo>
          <Campo label="Tabela de Preço">
            <select value={form.id_tabela_preco || ""} onChange={(e) => setF("id_tabela_preco", e.target.value)} style={sel(true)}>
              <option value="">Padrão</option>
              {tabelasPreco.map((t) => <option key={t.id} value={t.id}>{t.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Condição de Pagamento">
            <select value={form.id_condicao_pagamento || ""} onChange={(e) => setF("id_condicao_pagamento", e.target.value)} style={sel(true)}>
              <option value="">À vista</option>
              {condPag.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Comissão %">
            <input value={form.percentual_comissao || ""} onChange={(e) => setF("percentual_comissao", e.target.value)} inputMode="decimal" style={inp(true)} />
          </Campo>
          <Campo label="Observação" span={3}>
            <textarea value={form.observacao || ""} onChange={(e) => setF("observacao", e.target.value)} rows={2} style={{ ...inp(true), height: "auto", resize: "vertical" }} />
          </Campo>
        </Secao>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={salvarVenda} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
            <Save size={16} /> {saving ? "Salvando..." : form.id ? "Salvar" : "Abrir Venda"}
          </button>
        </div>
      </div>
    );
  }

  /* ═══ DETALHE ═══ */
  if (view === "detalhe" && vendaAtual) {
    const totalProd = itens.filter((i) => i.tipo === "PRODUTO").reduce((s, i) => s + (num(i.valor_total) || 0), 0);
    const totalServ = itens.filter((i) => i.tipo === "SERVICO").reduce((s, i) => s + (num(i.valor_total) || 0), 0);
    const isFaturada = vendaAtual.status === "FATURADA";
    const isCancelada = vendaAtual.status === "CANCELADA";
    const podeEditar = !isFaturada && !isCancelada && perms.editar;
    const cfop = cfopResolvido(vendaAtual);

    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <button onClick={() => { setView("lista"); carregar(); }} style={btnIcon()}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Venda {vendaAtual.numero}</h1>
              <Badge texto={vendaAtual.status} cor={vendaAtual.status} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
              {nomeCliente(vendaAtual.id_cliente)}
              {vendaAtual.id_vendedor ? ` · Vendedor: ${nomeUsuario(vendaAtual.id_vendedor)}` : ""}
              {` · ${vendaAtual.id_condicao_pagamento ? (condPag.find((c) => c.id === vendaAtual.id_condicao_pagamento)?.descricao || "A prazo") : "À vista"}`}
              {tipoSaidaDesc(vendaAtual.id_tipo_saida) ? ` · ${tipoSaidaDesc(vendaAtual.id_tipo_saida)}` : ""}
              {cfop ? ` · CFOP: ${cfop}` : ""}
            </p>
            {vendaAtual.id_orcamento_origem && <p style={{ fontSize: 12, color: C.blueMid, margin: "2px 0 0" }}>Origem: Orçamento</p>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {podeEditar && <button onClick={() => { setForm({ ...vendaAtual }); setView("form"); }} style={btnGhost()}><Pencil size={14} /> Editar</button>}
            {!isFaturada && !isCancelada && perms.excluir && <button onClick={() => { setMotivoCancel(""); setCancelOpen(true); }} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><Ban size={14} /> Cancelar</button>}
            {!isFaturada && !isCancelada && perms.aprovar && itens.length > 0 && (
              <button onClick={() => { setFatForma(vendaAtual.id_forma_pagamento || ""); setFatCond(vendaAtual.id_condicao_pagamento || ""); setFatOpen(true); }} style={btnPrimary()}>
                <DollarSign size={14} /> Faturar
              </button>
            )}
          </div>
        </div>

        {vendaAtual.motivo_cancelamento && <Aviso cor="destructive"><Ban size={16} /> Cancelada: {vendaAtual.motivo_cancelamento}</Aviso>}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "16px 0" }}>
          {[
            { label: "Produtos", valor: fmtBRL(totalProd), icone: Package },
            { label: "Serviços", valor: fmtBRL(totalServ), icone: Wrench },
            { label: "Total", valor: fmtBRL(num(vendaAtual.valor_total)), icone: FileText },
          ].map((kpi, i) => (
            <div key={i} style={cardStyle()}>
              <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><kpi.icone size={13} /> {kpi.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono }}>{kpi.valor}</div>
            </div>
          ))}
        </div>

        {/* Itens */}
        <div style={cardStyle()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Itens ({itens.length})</span>
            <div style={{ display: "flex", gap: 8 }}>
              {podeEditar && <button onClick={() => { setEncOpen(!encOpen); setAddItem(false); }} style={btnGhost()}><Package size={14} /> Encomendar</button>}
              {podeEditar && <button onClick={() => { setAddItem(!addItem); setEncOpen(false); }} style={btnPrimary()}><Plus size={14} /> Adicionar item</button>}
            </div>
          </div>

          {encOpen && (
            <div style={{ background: C.warningBg, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.warning, marginBottom: 10 }}>ENCOMENDA — item sem estoque, o Compras vai cotar e você aprova o preço antes de entrar na venda</div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 10, alignItems: "end" }}>
                <Campo label="Produto (se cadastrado)">
                  <select value={formEnc.id_produto} onChange={(e) => {
                    const p = produtos.find((x) => x.id === Number(e.target.value));
                    setFormEnc((f) => ({ ...f, id_produto: e.target.value, descricao: p ? p.nome : f.descricao }));
                  }} style={sel(true)}>
                    <option value="">— item novo / avulso —</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.referencia ? `${p.referencia} — ` : ""}{p.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Descrição *"><input value={formEnc.descricao} onChange={(e) => setFormEnc((f) => ({ ...f, descricao: e.target.value }))} style={inp(true)} /></Campo>
                <Campo label="Qtd"><input value={formEnc.quantidade} onChange={(e) => setFormEnc((f) => ({ ...f, quantidade: e.target.value }))} inputMode="numeric" style={inp(true)} /></Campo>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={solicitarEncomenda} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                  <button onClick={() => setEncOpen(false)} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
                </div>
              </div>
            </div>
          )}

          {addItem && (
            <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Campo label="Tipo">
                  <select value={formItem.tipo} onChange={(e) => setFormItem((f) => ({ ...f, tipo: e.target.value, id_produto: "", id_servico: "", descricao: "", valor_unitario: "", referencia: "" }))} style={sel(true)}>
                    <option value="PRODUTO">Produto</option>
                    <option value="SERVICO">Serviço</option>
                  </select>
                </Campo>
                {formItem.tipo === "PRODUTO" ? (
                  <Campo label="Produto" span={2}>
                    <SelectBusca
                      opcoes={produtos.map((p) => ({ id: p.id, label: p.nome, sub: p.referencia || "" }))}
                      value={formItem.id_produto}
                      onChange={(id) => {
                        const p = produtos.find((x) => x.id === Number(id));
                        setFormItem((f) => ({ ...f, id_produto: id, descricao: p ? p.nome : "", valor_unitario: p ? p.preco_venda : "", referencia: p ? p.referencia : "", percentual_desconto: 0 }));
                        if (id) { resolverPreco(id); consultarLimiteDesconto(id); }
                        else setLimiteDesc(null);
                      }}
                      placeholder="Selecione..."
                      full={true}
                    />
                  </Campo>
                ) : (
                  <Campo label="Serviço" span={2}>
                    <SelectBusca
                      opcoes={servicos.map((s) => ({ id: s.id, label: s.nome }))}
                      value={formItem.id_servico}
                      onChange={(id) => {
                        const s = servicos.find((x) => x.id === Number(id));
                        setFormItem((f) => ({ ...f, id_servico: id, descricao: s ? s.nome : "", valor_unitario: s ? s.preco : "" }));
                        setLimiteDesc(null);
                      }}
                      placeholder="Selecione..."
                      full={true}
                    />
                  </Campo>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                <Campo label="Descrição"><input value={formItem.descricao} onChange={(e) => setFormItem((f) => ({ ...f, descricao: e.target.value }))} style={inp(true)} /></Campo>
                <Campo label="Qtd"><input value={formItem.quantidade} onChange={(e) => setFormItem((f) => ({ ...f, quantidade: e.target.value }))} inputMode="numeric" style={inp(true)} /></Campo>
                <Campo label={precoOrigem ? `Valor unit. (${precoOrigem})` : "Valor unit."}><input value={formItem.valor_unitario} onChange={(e) => setFormItem((f) => ({ ...f, valor_unitario: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
                <Campo label={<span>Desc % {limiteDesc && <DescontoFeedback {...limiteDesc} />}</span>}>
                  <input value={formItem.percentual_desconto} onChange={(e) => setFormItem((f) => ({ ...f, percentual_desconto: e.target.value }))} inputMode="decimal"
                    disabled={limiteDesc?.bloqueado}
                    style={{
                      ...inp(true, limiteDesc?.bloqueado),
                      borderColor: limiteDesc && num(formItem.percentual_desconto) > 0
                        ? (num(formItem.percentual_desconto) > (isAVista() ? (limiteDesc.limite_vista ?? 999) : (limiteDesc.limite_prazo ?? 999)) ? C.destructive : C.success)
                        : C.border,
                    }} />
                </Campo>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => lancarItem()} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                  <button onClick={() => setAddItem(false)} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
                </div>
              </div>
            </div>
          )}

          {loadDet ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={28} />)}</div>
            : itens.length === 0 ? <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}><ShoppingCart size={28} style={{ opacity: 0.3 }} /><div style={{ marginTop: 8, fontSize: 13 }}>Nenhum item adicionado.</div></div>
              : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>
                  {["Tipo", "Descrição", "Qtd", "Valor Unit.", perms.exportar ? "Custo" : null, "Desc %", "Total", ""].filter(Boolean).map((h, i) => <th key={i} style={th(i >= 2)}>{h}</th>)}
                </tr></thead>
                <tbody>{itens.map((it) => (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={td()}><Badge texto={it.tipo} cor={it.tipo === "PRODUTO" ? "ATIVO" : "ABERTA"} /></td>
                    <td style={{ ...td(), fontWeight: 500 }}>{it.descricao}{it.referencia ? <span style={{ color: C.muted, fontSize: 11, marginLeft: 6 }}>{it.referencia}</span> : null}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{it.quantidade}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(it.valor_unitario)}</td>
                    {perms.exportar && <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.muted }}>{fmtBRL(it.valor_custo)}</td>}
                    <td style={{ ...td(), textAlign: "right" }}>{num(it.percentual_desconto) > 0 ? `${it.percentual_desconto}%` : "—"}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(it.valor_total)}</td>
                    <td style={td()}>{podeEditar && <button onClick={() => removerItem(it.id)} style={{ ...btnIcon(), color: C.destructive }} title="Remover"><Trash2 size={13} /></button>}</td>
                  </tr>
                ))}</tbody>
              </table>}
        </div>

        {/* ─── Financeiro (rateio + títulos) ─────────────────── */}
        {isFaturada && (rateio.length > 0 || titulos.length > 0) && (
          <div style={cardStyle()}>
            <span style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 14 }}>
              <DollarSign size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Financeiro
            </span>

            {/* Rateio contábil */}
            {rateio.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted, marginBottom: 8 }}>Rateio Contábil</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                  <thead><tr>
                    {["Descrição", "Valor", "Plano de Contas", "Centro de Custo"].map((h, i) => <th key={i} style={th(i === 1)}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {rateio.map((r) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ ...td(), fontWeight: 500 }}>{r.descricao}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600, color: r.valor < 0 ? C.destructive : C.foreground }}>{fmtBRL(r.valor)}</td>
                        <td style={{ ...td(), color: C.muted, fontSize: 12 }}>{r.id_plano_conta ? `Cód ${r.id_plano_conta}` : "—"}</td>
                        <td style={{ ...td(), color: C.muted, fontSize: 12 }}>{r.id_centro_custo ? `CC ${r.id_centro_custo}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Títulos (parcelas) */}
            {titulos.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted, marginBottom: 8 }}>Parcelas / Títulos</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr>
                    {["Parcela", "Vencimento", "Valor", "Pago", "Saldo", "Status"].map((h, i) => <th key={i} style={th(i >= 2 && i <= 4)}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {titulos.map((t) => (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ ...td(), fontFamily: mono, fontWeight: 600 }}>{t.parcela}</td>
                        <td style={{ ...td(), color: C.muted }}>{t.data_vencimento ? new Date(t.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(t.valor)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.success }}>{fmtBRL(t.valor_pago)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(t.valor_saldo ?? t.valor)}</td>
                        <td style={td()}><Badge texto={t.status} cor={t.status === "PAGO" ? "ATIVO" : t.status === "ABERTO" ? "ABERTA" : t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* Modal Faturar */}
        {fatOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setFatOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Faturar Venda {vendaAtual.numero}</h2>
              <p style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: C.primary, marginBottom: 16 }}>{fmtBRL(vendaAtual.valor_total)}</p>
              <Campo label="Forma de pagamento *">
                <select value={fatForma} onChange={(e) => setFatForma(e.target.value)} style={sel(true)}>
                  <option value="">Selecione...</option>
                  {formasPag.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
                </select>
              </Campo>
              <div style={{ marginTop: 12 }}>
                <Campo label="Condição de pagamento">
                  <select value={fatCond} onChange={(e) => setFatCond(e.target.value)} style={sel(true)}>
                    <option value="">À vista</option>
                    {condPag.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                  </select>
                </Campo>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={() => setFatOpen(false)} style={btnGhost()}>Cancelar</button>
                <button onClick={() => faturar()} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
                  <DollarSign size={14} /> {saving ? "Faturando..." : "Confirmar Faturamento"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Cancelar */}
        {cancelOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setCancelOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: C.destructive }}>Cancelar Venda {vendaAtual.numero}</h2>
              <Campo label="Motivo do cancelamento *">
                <textarea value={motivoCancel} onChange={(e) => setMotivoCancel(e.target.value)} rows={3} placeholder="Informe o motivo..." style={{ ...inp(true), height: "auto", resize: "vertical" }} />
              </Campo>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={() => setCancelOpen(false)} style={btnGhost()}>Voltar</button>
                <button onClick={cancelar} disabled={saving} style={{ ...btnPrimary(), background: C.destructive, opacity: saving ? 0.6 : 1 }}>
                  <Ban size={14} /> {saving ? "Cancelando..." : "Confirmar Cancelamento"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ModalAprovacao
          aberto={aprovModal.aberto}
          titulo="Liberar desconto acima do permitido"
          mensagem={aprovModal.mensagem}
          modulo="vendas"
          acao="DESCONTO_LIBERADO"
          contexto={aprovModal.contexto}
          onAprovado={(aprovador) => {
            setAprovModal({ aberto: false, mensagem: "", contexto: {} });
            lancarItem(true, aprovador);
          }}
          onCancelar={() => setAprovModal({ aberto: false, mensagem: "", contexto: {} })}
        />
      </div>
    );
  }

  /* ═══ LISTA ═══ */
  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Vendas</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {lista.length}</p></div>
        {perms.incluir && <button onClick={() => {
          const tipoPadrao = tiposSaida.find((t) => t.padrao);
          setForm({ id: null, id_empresa: fEmpresa || "", id_cliente: "", id_vendedor: "", id_tipo_saida: tipoPadrao?.id || "", id_condicao_pagamento: "", observacao: "", percentual_comissao: 0 });
          setErroForm(""); setView("form");
        }} style={btnPrimary()}><Plus size={16} /> Nova Venda</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nº ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}>
          <option value="">Todos</option><option value="ABERTA">Aberta</option><option value="FATURADA">Faturada</option><option value="CANCELADA">Cancelada</option>
        </select>
        <select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel()}>
          <option value="">Todas empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
        </select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><ShoppingCart size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma venda encontrada.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead><tr>{["Nº", "Cliente", "Vendedor", "Tipo Op.", "Status", "Data", "Total", ""].map((h, i) => <th key={i} style={th(i === 6)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((v) => (
                <tr key={v.id} onClick={() => abrirDetalhe(v)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{v.numero}</span></td>
                  <td style={{ ...td(), fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeCliente(v.id_cliente)}</td>
                  <td style={{ ...td(), color: C.muted }}>{v.id_vendedor ? nomeUsuario(v.id_vendedor) : "—"}</td>
                  <td style={{ ...td(), color: C.muted, fontSize: 11 }}>{tipoSaidaDesc(v.id_tipo_saida) || "—"}</td>
                  <td style={td()}><Badge texto={v.status} cor={v.status} /></td>
                  <td style={{ ...td(), color: C.muted }}>{v.criado_em ? new Date(v.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(v.valor_total)}</td>
                  <td style={td()}><button onClick={(e) => { e.stopPropagation(); abrirDetalhe(v); }} style={btnIcon()}><Eye size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>}
      </div>
    </>
  );
}
