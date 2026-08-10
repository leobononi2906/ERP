import { useState, useEffect } from "react";
import {
  Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle,
  ShoppingCart, Package, Wrench, FileText, DollarSign, Trash2, Eye, Ban, Printer, Tag, Undo2,
  ChevronDown, ChevronRight, History, Boxes,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { imprimirVendaDoc, imprimirEtiquetaExpedicao } from "../print";
import { irPara } from "../nav";
import {
  cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo,
  Aviso, Badge, Skeleton, ModalAprovacao, SelectBusca, BuscaServidor,
} from "../ui";
import { DrawerHistorico, DrawerEstoque } from "../drawers";
import { useEmpresaAtiva, getEmpresaAtiva } from "../empresa";


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
  const [view, setView] = useState("lista");   // "lista" | "venda"
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fEmpresa, setFEmpresa] = useState(getEmpresaAtiva());
  const empresaGlobal = useEmpresaAtiva();
  useEffect(() => { setFEmpresa(empresaGlobal ? String(empresaGlobal) : ""); }, [empresaGlobal]);
  const [dadosAbertos, setDadosAbertos] = useState(true);

  /* ─── detalhe ──────────────────────────────────────────────── */
  const [vendaAtual, setVendaAtual] = useState(null);
  const [itens, setItens] = useState([]);
  const [credito, setCredito] = useState(null);
  async function carregarCredito(idCliente, idEmpresa) {
    if (!idCliente) { setCredito(null); return; }
    try { const r = await rpc("erp_cliente_credito", { p_id_cliente: Number(idCliente), p_id_empresa: idEmpresa ? Number(idEmpresa) : null }); setCredito(r); }
    catch { setCredito(null); }
  }
  const [titulos, setTitulos] = useState([]);
  const [rateio, setRateio] = useState([]);
  const [loadDet, setLoadDet] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [formItem, setFormItem] = useState({ ...ITEM_VAZIO });

  /* ─── modais ───────────────────────────────────────────────── */
  const [fatOpen, setFatOpen] = useState(false);
  const [fatForma, setFatForma] = useState("");
  const [fatCond, setFatCond] = useState("");
  const [fatPreview, setFatPreview] = useState(null);   // { parcelas, rateio, is_cartao, forma, condicao }
  const [fatParcelas, setFatParcelas] = useState([]);   // parcelas editáveis [{numero, vencimento, valor}]
  const [fatLoadPrev, setFatLoadPrev] = useState(false);
  const [fatNsu, setFatNsu] = useState("");
  const [fatBandeira, setFatBandeira] = useState("");
  const [fatNumTransacao, setFatNumTransacao] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState("");
  const [aprovModal, setAprovModal] = useState({ aberto: false, mensagem: "", contexto: {} });
  const [histVenda, setHistVenda] = useState(false);
  const [drawerProdV, setDrawerProdV] = useState(null);

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
    carregarCredito(idCliente, form.id_empresa || fEmpresa);
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

  /* ─── nova venda ───────────────────────────────────────────── */
  function novaVenda() {
    const tipoPadrao = tiposSaida.find((t) => t.padrao);
    setForm({ id: null, id_empresa: fEmpresa || "", id_cliente: "", id_vendedor: "", id_tipo_saida: tipoPadrao?.id || "", id_condicao_pagamento: "", id_tabela_preco: "", observacao: "", percentual_comissao: 0 });
    setVendaAtual(null); setItens([]); setTitulos([]); setRateio([]); setCredito(null);
    setErroForm(""); setAddItem(false); setDadosAbertos(true); setView("venda");
  }

  /* ─── abrir venda existente ────────────────────────────────── */
  async function abrirDetalhe(venda) {
    setVendaAtual(venda); setForm({ ...venda }); setLoadDet(true); setView("venda"); setAddItem(false);
    setDadosAbertos(false);
    carregarCredito(venda.id_cliente, venda.id_empresa);
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
    setVendaAtual(d.venda); setForm((f) => ({ ...f, ...d.venda }));
    setItens(d.itens ?? []);
    setTitulos(d.titulos ?? []);
    setRateio(d.rateio ?? []);
    setLista((l) => l.map((x) => x.id === d.venda.id ? d.venda : x));
  }

  /* ─── salvar venda (dados) ─────────────────────────────────── */
  async function salvarVenda() {
    if (!form.id_cliente) { setErroForm("Selecione o cliente."); return; }
    if (!form.id_empresa) { setErroForm("Selecione a empresa."); return; }
    setErroForm(""); setSaving(true);
    try {
      const res = await rpc("venda_salvar", { p: { ...form, _ator: usuario.id } });
      if (res?.id) {
        setLista((l) => { const sem = l.filter((x) => x.id !== res.id); return [res, ...sem]; });
        const novo = !form.id;
        notificar(novo ? `Venda nº ${res.numero} criada.` : "Venda atualizada.");
        setVendaAtual(res); setForm({ ...res });
        if (novo) { setItens([]); setTitulos([]); setRateio([]); setDadosAbertos(false); }
        carregarCredito(res.id_cliente, res.id_empresa);
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

  /* ─── faturar: preview de movimentação financeira ─────────────── */
  async function abrirFaturar() {
    const f = vendaAtual.id_forma_pagamento || "";
    const c = vendaAtual.id_condicao_pagamento || "";
    setFatForma(f); setFatCond(c);
    setFatNsu(""); setFatBandeira(""); setFatNumTransacao("");
    setFatOpen(true);
    await carregarPreview(f || null, c || null);
  }

  async function carregarPreview(forma, cond) {
    setFatLoadPrev(true);
    try {
      const prev = await rpc("erp_venda_faturamento_preview", { p_id_venda: vendaAtual.id });
      setFatPreview(prev || null);
      const parc = Array.isArray(prev?.parcelas) ? prev.parcelas : [];
      setFatParcelas(parc.map((p) => ({ numero: p.numero, vencimento: p.vencimento, valor: num(p.valor) })));
    } catch (e) {
      setFatPreview(null); setFatParcelas([]);
      notificar("Não foi possível carregar as parcelas: " + e.message, "erro");
    } finally { setFatLoadPrev(false); }
  }

  function setParcela(idx, campo, valor) {
    setFatParcelas((ps) => ps.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)));
  }

  const totalParcelas = fatParcelas.reduce((s, p) => s + (num(p.valor) || 0), 0);
  const totalVenda = num(vendaAtual?.valor_total) || 0;
  const parcelasBatem = Math.abs(totalParcelas - totalVenda) < 0.01;

  /* ─── faturar ──────────────────────────────────────────────── */
  async function faturar(libCredito = false) {
    if (!fatForma) { notificar("Selecione a forma de pagamento.", "erro"); return; }
    if (fatParcelas.length > 0 && !parcelasBatem) {
      notificar(`As parcelas somam ${fmtBRL(totalParcelas)} e a venda é ${fmtBRL(totalVenda)}.`, "erro"); return;
    }
    if (fatPreview?.is_cartao && !fatNsu.trim()) { notificar("Informe o NSU da transação do cartão.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("venda_faturar", { p: {
        id_venda: vendaAtual.id, id_forma_pagamento: fatForma,
        id_condicao_pagamento: fatCond || null, _ator: usuario.id,
        _lib_credito: libCredito,
        _id_aprovador: libCredito ? usuario.id : null,
        parcelas: fatParcelas.length > 0 ? fatParcelas : null,
        nsu: fatNsu || null, bandeira: fatBandeira || null, num_transacao: fatNumTransacao || null,
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
    } catch (e) {
      const m = String(e.message || "");
      notificar(m.includes("|") ? m.split("|")[1] : "Erro: " + m, "erro");
    }
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

  /* ═══════════════════════════════════════════════════════════════
     VENDA — dados + itens + faturamento numa página só
     ═══════════════════════════════════════════════════════════════ */
  if (view === "venda") {
    const isNew = !vendaAtual?.id;
    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const totalProd = itens.filter((i) => i.tipo === "PRODUTO").reduce((s, i) => s + (num(i.valor_total) || 0), 0);
    const totalServ = itens.filter((i) => i.tipo === "SERVICO").reduce((s, i) => s + (num(i.valor_total) || 0), 0);
    const status = vendaAtual?.status || "ABERTA";
    const isFaturada = status === "FATURADA";
    const isCancelada = status === "CANCELADA";
    const podeEditarItens = !isNew && !isFaturada && !isCancelada && perms.editar;
    const podeEditarDados = isNew ? perms.incluir : (!isFaturada && !isCancelada && perms.editar);
    const cfop = vendaAtual ? cfopResolvido(vendaAtual) : "";
    const cliNome = isNew ? (form.id_cliente ? nomeCliente(Number(form.id_cliente)) : "Nova venda") : nomeCliente(vendaAtual.id_cliente);
    const condTxt = (vendaAtual?.id_condicao_pagamento || form.id_condicao_pagamento)
      ? (condPag.find((c) => c.id === (vendaAtual?.id_condicao_pagamento || Number(form.id_condicao_pagamento)))?.descricao || "A prazo")
      : "À vista";

    return (
      <div>{ToastEl}
        {/* ─── HEADER forte ─────────────────────────────────── */}
        <div style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.blueMid} 100%)`, borderRadius: 14, padding: "18px 20px", color: "#fff", marginBottom: 16, boxShadow: "0 6px 20px rgba(26,58,143,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <button onClick={() => { setView("lista"); carregar(); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.16)", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0 }}><ArrowLeft size={18} /></button>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{isNew ? "Nova venda" : "Venda"}</span>
                {!isNew && <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{vendaAtual.numero}</span>}
                {!isNew && <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{status}</span>}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cliNome}</div>
              <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
                {(vendaAtual?.id_vendedor || form.id_vendedor) ? `Vendedor: ${nomeUsuario(Number(vendaAtual?.id_vendedor || form.id_vendedor))} · ` : ""}
                {condTxt}
                {tipoSaidaDesc(vendaAtual?.id_tipo_saida || Number(form.id_tipo_saida)) ? ` · ${tipoSaidaDesc(vendaAtual?.id_tipo_saida || Number(form.id_tipo_saida))}` : ""}
                {cfop ? ` · CFOP: ${cfop}` : ""}
              </div>
            </div>
            {!isNew && (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10.5, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: mono, lineHeight: 1.1 }}>{fmtBRL(num(vendaAtual.valor_total))}</div>
              </div>
            )}
          </div>
          {credito && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.18)", fontSize: 12, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>A prazo disponível: {fmtBRL(credito.disponivel)}</span>
              <span style={{ opacity: 0.85 }}>Limite {fmtBRL(credito.limite)} · Em aberto {fmtBRL(credito.devedor)}</span>
              {num(credito.saldo) > 0 && <span style={{ fontWeight: 600 }}>💰 Saldo a favor {fmtBRL(credito.saldo)}</span>}
              {num(credito.qtd_vencidos) > 0 && <span style={{ fontWeight: 700, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 6 }}>⚠ {credito.qtd_vencidos} vencido(s): {fmtBRL(credito.vencidos)}</span>}
            </div>
          )}
        </div>

        {/* ─── Barra de ações ───────────────────────────────── */}
        {!isNew && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button onClick={() => imprimirVendaDoc({ venda: vendaAtual, itens, cliente: nomeCliente(vendaAtual.id_cliente), empresa: (empresas.find((e) => e.id === vendaAtual.id_empresa) || {}).nome_fantasia || "", pagamento: vendaAtual.id_condicao_pagamento ? ((condPag.find((c) => c.id === vendaAtual.id_condicao_pagamento) || {}).descricao || "A prazo") : "À vista" })} style={btnGhost()}><Printer size={14} /> Imprimir</button>
            <button onClick={() => imprimirEtiquetaExpedicao({ venda: vendaAtual, cliente: clientes.find((c) => c.id === vendaAtual.id_cliente) || { nome: nomeCliente(vendaAtual.id_cliente) }, empresa: (empresas.find((e) => e.id === vendaAtual.id_empresa) || {}).nome_fantasia || "" })} style={btnGhost()}><Tag size={14} /> Etiqueta</button>
            <button onClick={() => setHistVenda(true)} style={btnGhost()}><History size={14} /> Histórico</button>
            {!isCancelada && <button onClick={() => irPara("devolucoes", { origem: "VENDA", id: vendaAtual.id, numero: vendaAtual.numero })} style={btnGhost()}><Undo2 size={14} /> Devolver</button>}
            {!isFaturada && !isCancelada && perms.excluir && <button onClick={() => { setMotivoCancel(""); setCancelOpen(true); }} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><Ban size={14} /> Cancelar</button>}
            {!isFaturada && !isCancelada && perms.aprovar && itens.length > 0 && (
              <button onClick={abrirFaturar} style={{ ...btnPrimary(), marginLeft: "auto" }}>
                <DollarSign size={14} /> Faturar
              </button>
            )}
          </div>
        )}

        {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}
        {vendaAtual?.motivo_cancelamento && <Aviso cor="destructive"><Ban size={16} /> Cancelada: {vendaAtual.motivo_cancelamento}</Aviso>}
        {vendaAtual?.id_orcamento_origem && <div style={{ fontSize: 12, color: C.blueMid, marginBottom: 12 }}>Origem: Orçamento</div>}

        {/* ─── DADOS (cabeçalho editável) ───────────────────── */}
        {!isCancelada && (
          <div style={{ ...cardStyle(), marginBottom: 16, padding: 0, overflow: "hidden" }}>
            <div onClick={() => !isNew && setDadosAbertos((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", cursor: isNew ? "default" : "pointer", background: C.surface2, borderBottom: dadosAbertos ? `1px solid ${C.border}` : "none" }}>
              {!isNew && (dadosAbertos ? <ChevronDown size={16} style={{ color: C.muted }} /> : <ChevronRight size={16} style={{ color: C.muted }} />)}
              <FileText size={15} style={{ color: C.primary }} />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Dados da venda</span>
              {!isNew && !dadosAbertos && <span style={{ fontSize: 12, color: C.muted, marginLeft: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cliNome} · {condTxt}</span>}
            </div>
            {(isNew || dadosAbertos) && (
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  <Campo label="Empresa *">
                    <select value={form.id_empresa || ""} onChange={(e) => setF("id_empresa", e.target.value)} style={sel(true)} disabled={!podeEditarDados}>
                      <option value="">Selecione...</option>
                      {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Cliente *" span={2}>
                    <BuscaServidor
                      campos={[{ key: "nome", label: "Nome" }, { key: "cnpj", label: "CNPJ" }, { key: "codigo", label: "Código" }]}
                      buscar={(campo, termo) => rpc("erp_clientes_buscar", { p_campo: campo, p_termo: termo, p_id_empresa: form.id_empresa ? Number(form.id_empresa) : null, p_limit: 30 })}
                      render={(c) => ({ label: c.nome, sub: [c.codigo ? "#" + c.codigo : "", c.cpf_cnpj, c.cidade].filter(Boolean).join(" · ") })}
                      onSelect={(c) => { setClientes((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c]); aplicarDefaultsCliente(String(c.id)); }}
                      selecionadoLabel={form.id_cliente ? nomeCliente(Number(form.id_cliente)) : ""}
                      placeholder="Buscar cliente (nome, CNPJ ou código)..."
                      disabled={!podeEditarDados}
                      full
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
                    <select value={form.id_tipo_saida || ""} onChange={(e) => setF("id_tipo_saida", e.target.value)} style={sel(true)} disabled={!podeEditarDados}>
                      {tiposSaida.filter((t) => t.ativo && (!t.restrito || perms.aprovar || String(t.id) === String(form.id_tipo_saida))).map((t) => <option key={t.id} value={t.id}>{t.descricao}{t.restrito ? " 🔒" : ""}{t.padrao ? " ★" : ""}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Tabela de Preço">
                    <select value={form.id_tabela_preco || ""} onChange={(e) => { setF("id_tabela_preco", e.target.value); if (!isNew) recalcularPrecos(e.target.value); }} style={sel(true)} disabled={!podeEditarDados}>
                      <option value="">Padrão</option>
                      {tabelasPreco.map((t) => <option key={t.id} value={t.id}>{t.descricao}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Condição de Pagamento">
                    <select value={form.id_condicao_pagamento || ""} onChange={(e) => setF("id_condicao_pagamento", e.target.value)} style={sel(true)} disabled={!podeEditarDados}>
                      <option value="">À vista</option>
                      {condPag.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Comissão %">
                    <input value={form.percentual_comissao || ""} onChange={(e) => setF("percentual_comissao", e.target.value)} inputMode="decimal" style={inp(true)} disabled={!podeEditarDados} />
                  </Campo>
                  <Campo label="Observação" span={3}>
                    <textarea value={form.observacao || ""} onChange={(e) => setF("observacao", e.target.value)} rows={2} style={{ ...inp(true), height: "auto", resize: "vertical" }} disabled={!podeEditarDados} />
                  </Campo>
                </div>
                {podeEditarDados && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                    <button onClick={salvarVenda} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
                      <Save size={16} /> {saving ? "Salvando..." : isNew ? "Abrir venda" : "Salvar dados"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── ITENS + FINANCEIRO (só após abrir a venda) ───── */}
        {isNew ? (
          <div style={{ ...cardStyle(), textAlign: "center", padding: "36px 0", color: C.textMuted }}>
            <ShoppingCart size={28} style={{ opacity: 0.3 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>Preencha os dados e clique em <b>Abrir venda</b> para lançar os itens.</div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
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
                  {podeEditarItens && <button onClick={() => { setEncOpen(!encOpen); setAddItem(false); }} style={btnGhost()}><Package size={14} /> Encomendar</button>}
                  {podeEditarItens && <button onClick={() => { setAddItem(!addItem); setEncOpen(false); }} style={btnPrimary()}><Plus size={14} /> Adicionar item</button>}
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
                        <BuscaServidor
                          campos={[{ key: "nome", label: "Nome" }, { key: "referencia", label: "Referência" }, { key: "codigo_barras", label: "Cód. barras" }]}
                          buscar={(campo, termo) => rpc("erp_produtos_buscar", { p_campo: campo, p_termo: termo, p_limit: 30 })}
                          render={(p) => ({ label: p.nome, sub: [p.referencia, fmtBRL(p.preco_venda)].filter(Boolean).join(" · ") })}
                          onSelect={(p) => {
                            setProdutos((prev) => prev.some((x) => x.id === p.id) ? prev : [...prev, p]);
                            setFormItem((f) => ({ ...f, id_produto: String(p.id), descricao: p.nome, valor_unitario: p.preco_venda, referencia: p.referencia, percentual_desconto: 0 }));
                            resolverPreco(String(p.id)); consultarLimiteDesconto(String(p.id));
                          }}
                          selecionadoLabel={formItem.id_produto ? (produtos.find((x) => x.id === Number(formItem.id_produto))?.nome || formItem.descricao) : ""}
                          placeholder="Buscar produto (nome, referência ou cód. barras)..."
                          full
                        />
                        {formItem.id_produto && (
                          <button type="button" onClick={() => setDrawerProdV(Number(formItem.id_produto))} style={{ ...btnGhost(), marginTop: 6, padding: "6px 10px", fontSize: 12 }}>
                            <Boxes size={13} /> Ver estoque do produto
                          </button>
                        )}
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
                        <td style={td()}>{podeEditarItens && <button onClick={() => removerItem(it.id)} style={{ ...btnIcon(), color: C.destructive }} title="Remover"><Trash2 size={13} /></button>}</td>
                      </tr>
                    ))}</tbody>
                  </table>}
            </div>

            {/* Financeiro (rateio + títulos) */}
            {isFaturada && (rateio.length > 0 || titulos.length > 0) && (
              <div style={{ ...cardStyle(), marginTop: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 14 }}>
                  <DollarSign size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Financeiro
                </span>

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
          </>
        )}

        {/* Modal Faturar — Movimentação Financeira */}
        {fatOpen && vendaAtual && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setFatOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: 640, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Movimentação Financeira — Venda {vendaAtual.numero}</h2>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: C.primary }}>{fmtBRL(totalVenda)}</span>
              </div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Confira as parcelas, o rateio no DRE e informe o NSU quando for cartão.</p>

              {/* forma + condição */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Campo label="Forma de pagamento *">
                  <select value={fatForma} onChange={(e) => { setFatForma(e.target.value); carregarPreview(e.target.value || null, fatCond || null); }} style={sel(true)}>
                    <option value="">Selecione...</option>
                    {formasPag.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
                  </select>
                </Campo>
                <Campo label="Condição de pagamento">
                  <select value={fatCond} onChange={(e) => { setFatCond(e.target.value); carregarPreview(fatForma || null, e.target.value || null); }} style={sel(true)}>
                    <option value="">À vista</option>
                    {condPag.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                  </select>
                </Campo>
              </div>

              {/* NSU (cartão) */}
              {fatPreview?.is_cartao && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff8ec", border: `1px solid ${C.warning || "#f0c060"}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#8a6d1a", marginBottom: 8 }}>💳 Transação de cartão</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
                    <Campo label="NSU *"><input value={fatNsu} onChange={(e) => setFatNsu(e.target.value)} style={inp(true)} placeholder="NSU / DOC" /></Campo>
                    <Campo label="Nº transação"><input value={fatNumTransacao} onChange={(e) => setFatNumTransacao(e.target.value)} style={inp(true)} /></Campo>
                    <Campo label="Bandeira"><input value={fatBandeira} onChange={(e) => setFatBandeira(e.target.value)} style={inp(true)} placeholder="Visa, Master..." /></Campo>
                  </div>
                </div>
              )}

              {/* Parcelas / boletos */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Parcelas / boletos</div>
                {fatLoadPrev ? (
                  <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>Calculando parcelas...</div>
                ) : fatParcelas.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>À vista — título único quitado no faturamento.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>
                      <th style={{ ...th, width: 50 }}>#</th>
                      <th style={th}>Vencimento</th>
                      <th style={{ ...th, textAlign: "right" }}>Valor</th>
                    </tr></thead>
                    <tbody>
                      {fatParcelas.map((p, i) => (
                        <tr key={i}>
                          <td style={td}>{p.numero}</td>
                          <td style={td}>
                            <input type="date" value={p.vencimento || ""} onChange={(e) => setParcela(i, "vencimento", e.target.value)} style={{ ...inp(true), padding: "5px 8px" }} />
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <input type="number" step="0.01" value={p.valor} onChange={(e) => setParcela(i, "valor", e.target.value)} style={{ ...inp(true), padding: "5px 8px", textAlign: "right", width: 120 }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr>
                      <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Total das parcelas</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: parcelasBatem ? C.success : C.destructive }}>{fmtBRL(totalParcelas)}</td>
                    </tr></tfoot>
                  </table>
                )}
                {!parcelasBatem && fatParcelas.length > 0 && (
                  <div style={{ fontSize: 11, color: C.destructive, marginTop: 6 }}>⚠ As parcelas precisam somar {fmtBRL(totalVenda)}.</div>
                )}
              </div>

              {/* Rateio DRE */}
              {Array.isArray(fatPreview?.rateio) && fatPreview.rateio.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Rateio no DRE (para onde vai)</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <tbody>
                      {fatPreview.rateio.map((r, i) => (
                        <tr key={i}>
                          <td style={td}>{r.descricao || r.tipo_linha}</td>
                          <td style={{ ...td, textAlign: "right", fontFamily: mono }}>{fmtBRL(num(r.valor))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={() => setFatOpen(false)} style={btnGhost()}>Cancelar</button>
                <button onClick={() => faturar()} disabled={saving || fatLoadPrev} style={{ ...btnPrimary(), opacity: (saving || fatLoadPrev) ? 0.6 : 1 }}>
                  <DollarSign size={14} /> {saving ? "Faturando..." : "Confirmar Faturamento"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Cancelar */}
        {cancelOpen && vendaAtual && (
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

        {histVenda && !isNew && <DrawerHistorico tabela="vendas" registro={vendaAtual.id} titulo="Histórico da venda" sub={`Venda ${vendaAtual.numero}`} onClose={() => setHistVenda(false)} />}
        {drawerProdV && <DrawerEstoque idProduto={drawerProdV} idEmpresa={vendaAtual?.id_empresa || null} onClose={() => setDrawerProdV(null)} />}
      </div>
    );
  }

  /* ═══ LISTA ═══ */
  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Vendas</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {lista.length}</p></div>
        {perms.incluir && <button onClick={novaVenda} style={btnPrimary()}><Plus size={16} /> Nova Venda</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nº ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}>
          <option value="">Todos</option><option value="ABERTA">Aberta</option><option value="FATURADA">Faturada</option><option value="CANCELADA">Cancelada</option>
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
