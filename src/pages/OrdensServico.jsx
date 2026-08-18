import { useState, useEffect, useRef } from "react";
import {
  Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle,
  Lock, Wrench, Play, Square, Clock, User, Package, FileText, ChevronDown, ChevronUp, Trash2,
  DollarSign, Send, Eye, Printer, Undo2, History, Boxes,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc, ATALHOS } from "../config";
import { getEmpresaAtiva, useEmpresaAtiva } from "../empresa";
import { NovoClienteModal, NovoVeiculoModal } from "../CadastroRapido";
import { DrawerHistorico, DrawerEstoque, DrawerFollowup } from "../drawers";
import { imprimirOSDoc } from "../print";
import { irPara } from "../nav";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton, SelectBusca, BuscaServidor, ModalAprovacao } from "../ui";

// status do defeito (unidade de trabalho do pátio)
const DEF_ST = {
  ABERTO:      { t: "Aberto",       bg: C.bluePale,  fg: C.blueMid },
  EM_EXECUCAO: { t: "Em execução",  bg: "#FFF3E0",   fg: C.warning },
  PAUSADO:     { t: "Pausado",      bg: "#F1F5F9",   fg: "#64748B" },
  CONCLUIDO:   { t: "Concluído",    bg: C.successBg, fg: C.success },
};


const STATUS_CORES = {
  ABERTA: "ABERTA", EM_EXECUCAO: "ATIVO", FATURADA: "FATURADA", CANCELADA: "CANCELADA",
};

const OS_VAZIA = () => ({
  id: null, numero: "", id_empresa: "", id_cliente: "", id_veiculo: "", id_tipo_os: "",
  id_usuario_abertura: "", id_usuario_responsavel: "", id_vendedor: "", id_prisma: "", status: "ABERTA",
  data_prevista: "", km_entrada: "", defeito_relatado: "", observacao_interna: "",
});

/* ═══════════════════════════════════════════════════════════════ */
export default function OrdensServico({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.os) || {};

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tiposOs, setTiposOs] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [servicos, setServicos] = useState([]);

  // views
  const [view, setView] = useState("lista"); // lista | form | detalhe
  const [form, setForm] = useState(OS_VAZIA());
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [novoVeiculoAberto, setNovoVeiculoAberto] = useState(false);
  function onClienteCriadoOS(c) {
    setClientes((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c]);
    if (c.id) setForm((f) => ({ ...f, id_cliente: String(c.id) }));
  }
  function onVeiculoCriadoOS(v) {
    setVeiculos((prev) => prev.some((x) => x.id === v.id) ? prev : [...prev, v]);
    if (v.id) setForm((f) => ({ ...f, id_veiculo: v.id }));
  }
  useEffect(() => {
    if (view !== "form") return;
    const onKey = (e) => { if (e.key === ATALHOS.novo) { e.preventDefault(); setNovoClienteAberto(true); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");

  // detalhe
  const [osAtual, setOsAtual] = useState(null);
  const [osServicos, setOsServicos] = useState([]);
  const [osPecas, setOsPecas] = useState([]);
  const [osOrcamentos, setOsOrcamentos] = useState([]);
  const [osApontamentos, setOsApontamentos] = useState([]);
  const [abaDetalhe, setAbaDetalhe] = useState("servicos");
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // defeitos
  const [osDefeitos, setOsDefeitos] = useState([]);
  const [prismasOs, setPrismasOs] = useState([]);
  const [prismasForm, setPrismasForm] = useState([]); // prismas livres do vendedor, na criação/edição da OS
  const [addDefeito, setAddDefeito] = useState(false);
  const [formDefeito, setFormDefeito] = useState({ descricao: "", id_area: "" });

  // servico inline
  const [addServico, setAddServico] = useState(false);
  const [formServ, setFormServ] = useState({ id_servico: "", descricao: "", quantidade: 1, valor_unitario: "", id_tecnico: "", id_area: "" });
  const refServDesc = useRef(null);
  const [areas, setAreas] = useState([]);
  const [empresasOs, setEmpresasOs] = useState([]);

  // apontamento
  const [apontando, setApontando] = useState(null); // id_servico_os sendo apontado

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  /* ─── Carregar dados iniciais ────────────────────────────────── */
  useEffect(() => {
    let ok = true;
    rpc("os_dados")
      .then((d) => {
        if (!ok) return;
        setLista(d.ordens_servico ?? []);
        setClientes(d.clientes ?? []);
        setTiposOs(d.tipos_os ?? []);
        setVeiculos(d.veiculos ?? []);
        setUsuarios(d.usuarios ?? []);
        setServicos(d.servicos ?? []);
        setAreas(d.grupos_servico ?? []);
      })
      .catch((e) => setErro(e.message))
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  useEffect(() => {
    let a = true;
    rpc("erp_list", { p_tabela: "empresas", p_limit: 9999 })
      .then((rows) => { if (a) setEmpresasOs((Array.isArray(rows) ? rows : []).filter((e) => e.ativa !== false)); })
      .catch(() => {});
    return () => { a = false; };
  }, []);

  /* ─── Carregar detalhe de uma OS ─────────────────────────────── */
  async function abrirDetalhe(os) {
    setOsAtual(os);
    setAbaDetalhe("defeitos");
    setLoadingDetalhe(true);
    setView("detalhe");
    setPendenciasOs(null);
    try {
      const d = await rpc("os_detalhe_dados", { p_id_os: os.id });
      setOsServicos(d.servicos ?? []);
      setOsPecas(d.pecas ?? []);
      setOsApontamentos(d.apontamentos ?? []);
      setExpedicoesOs(d.expedicoes ?? []);
      setOsDefeitos(d.defeitos ?? []);
      rpc("os_defeitos_listar", { p_id_os: os.id }).then((dd) => setOsDefeitos(Array.isArray(dd) ? dd : (d.defeitos ?? []))).catch(() => {});
      rpc("erp_os_orcamentos", { p_id_os: os.id }).then((oo) => setOsOrcamentos(Array.isArray(oo) ? oo : [])).catch(() => setOsOrcamentos([]));
      rpc("os_prismas_dados", { p_id_vendedor: os.id_vendedor || null }).then((pd) => setPrismasOs(pd?.prismas || [])).catch(() => {});
      rpc("erp_os_pendencias", { p_id_os: os.id }).then((p) => setPendenciasOs(p)).catch(() => {});
    } catch (e) {
      notificar("Erro ao carregar detalhe: " + e.message, "erro");
    } finally {
      setLoadingDetalhe(false);
    }
  }

  /* ─── Próximo número de OS ───────────────────────────────────── */
  function proximoNumero() {
    let max = 0;
    lista.forEach((o) => { const n = parseInt(o.numero, 10); if (!isNaN(n) && n > max) max = n; });
    return String(max + 1);
  }

  // Carrega os prismas do vendedor escolhido, na tela de abrir/editar OS
  useEffect(() => {
    if (view !== "form" || !form.id_vendedor) { setPrismasForm([]); return; }
    let ok = true;
    rpc("os_prismas_dados", { p_id_vendedor: num(form.id_vendedor) || null })
      .then((pd) => { if (ok) setPrismasForm(pd?.prismas || []); })
      .catch(() => { if (ok) setPrismasForm([]); });
    return () => { ok = false; };
  }, [form.id_vendedor, view]);

  /* ─── Salvar OS (criar / editar) ─────────────────────────────── */
  async function salvarOS() {
    if (!form.id_empresa) { setErroForm("Selecione a empresa (escolha a empresa ativa no topo ou no cabeçalho da OS)."); return; }
    if (!form.id_cliente) { setErroForm("Selecione o cliente."); return; }
    if (!form.id_vendedor && !form.id_usuario_responsavel) { setErroForm("Informe o vendedor ou o responsável pela OS."); return; }
    if (!form.id && !form.id_prisma) { setErroForm("Selecione o prisma da OS (escolha o vendedor para listar os prismas livres)."); return; }
    setErroForm(""); setSaving(true);
    try {
      const saved = await rpc("os_salvar", {
        p_id: form.id || null,
        p_numero: form.numero || proximoNumero(),
        p_id_empresa: num(form.id_empresa),
        p_id_cliente: num(form.id_cliente),
        p_id_veiculo: num(form.id_veiculo) || null,
        p_id_tipo_os: num(form.id_tipo_os) || null,
        p_id_usuario_abertura: num(form.id_usuario_abertura) || null,
        p_id_usuario_responsavel: num(form.id_usuario_responsavel) || null,
        p_id_vendedor: num(form.id_vendedor) || null,
        p_status: form.status || "ABERTA",
        p_data_prevista: form.data_prevista || null,
        p_km_entrada: num(form.km_entrada) || null,
        p_defeito_relatado: form.defeito_relatado || null,
        p_observacao_interna: form.observacao_interna || null,
        p_ator: usuario.id,
      });
      if (form.id_prisma && saved.id) {
        try { await rpc("os_prisma_atribuir", { p_id_os: saved.id, p_id_prisma: num(form.id_prisma), p_id_usuario: usuario.id }); }
        catch (e) { notificar("OS salva, mas o prisma não pôde ser atribuído: " + e.message, "erro"); }
      }
      setLista((l) => {
        const sem = l.filter((o) => o.id !== saved.id);
        return [saved, ...sem];
      });
      notificar(form.id ? "OS atualizada." : `OS nº ${saved.numero} criada.`);
      abrirDetalhe(saved);
    } catch (e) {
      notificar("Erro ao salvar: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  /* ─── Adicionar serviço na OS ─────────────────────────────── */
  async function adicionarServico() {
    if (!formServ.descricao.trim()) { notificar("Descrição do serviço é obrigatória.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("os_servico_salvar", {
        p_id_os: osAtual.id,
        p_id_servico: num(formServ.id_servico) || null,
        p_descricao: formServ.descricao,
        p_quantidade: num(formServ.quantidade) || 1,
        p_valor_unitario: num(formServ.valor_unitario) || 0,
        p_valor_total: (num(formServ.quantidade) || 1) * (num(formServ.valor_unitario) || 0),
        p_id_tecnico: num(formServ.id_tecnico) || null,
        p_id_area: num(formServ.id_area) || null,
      });
      setOsServicos((l) => [...l, res]);
      // cadeia: mantém o form aberto, limpa e refoca a descrição (mantém a área p/ a próxima linha)
      setFormServ((f) => ({ id_servico: "", descricao: "", quantidade: 1, valor_unitario: "", id_tecnico: "", id_area: f.id_area }));
      const osAtualizada = await rpc("os_recarregar", { p_id_os: osAtual.id });
      if (osAtualizada) setOsAtual(osAtualizada);
      notificar("Serviço adicionado — próximo (Esc fecha).");
      setTimeout(() => refServDesc.current?.focus(), 30);
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  /* ─── Defeitos ──────────────────────────────────────────── */
  async function adicionarDefeito() {
    if (!formDefeito.descricao.trim()) { notificar("Descrição do defeito é obrigatória.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("os_defeito_salvar", {
        p_id_os: osAtual.id,
        p_descricao: formDefeito.descricao.trim(),
        p_id_area: num(formDefeito.id_area) || null,
      });
      const dd = await rpc("os_defeitos_listar", { p_id_os: osAtual.id });
      setOsDefeitos(Array.isArray(dd) ? dd : []);
      setFormDefeito({ descricao: "", id_area: "" }); setAddDefeito(false);
      notificar("Defeito adicionado.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function excluirDefeito(id) {
    try {
      await rpc("os_defeito_excluir", { p_id: id });
      setOsDefeitos((l) => l.filter((d) => d.id !== id));
      notificar("Defeito removido.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  /* ─── Prisma da OS ──────────────────────────────────────── */
  async function atribuirPrisma(idPrisma) {
    try {
      const r = await rpc("os_prisma_atribuir", { p_id_os: osAtual.id, p_id_prisma: idPrisma ? parseInt(idPrisma) : null, p_id_usuario: usuario.id });
      if (r && r.ok === false) { notificar(r.erro || "Não foi possível atribuir o prisma.", "erro"); return; }
      const osAtu = await rpc("os_recarregar", { p_id_os: osAtual.id });
      if (osAtu) setOsAtual(osAtu);
      const pd = await rpc("os_prismas_dados", { p_id_vendedor: (osAtu || osAtual).id_vendedor || null });
      setPrismasOs(pd?.prismas || []);
      notificar(idPrisma ? "Prisma atribuído." : "Prisma liberado.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  /* ─── Solicitar peça (envia para Separação) ─────────────── */
  const [modalPeca, setModalPeca] = useState(false);
  const [modoDireto, setModoDireto] = useState(false);
  const [formPeca, setFormPeca] = useState({ id_produto: "", quantidade: 1, consumo: false, id_producao: "" });
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [expedicoesOs, setExpedicoesOs] = useState([]);
  const [pendenciasOs, setPendenciasOs] = useState(null);
  const [modalVendaPerdida, setModalVendaPerdida] = useState(null); // { id_produto, nome_produto, quantidade, motivo, concorrente, observacao }
  const [salvandoVendaPerdida, setSalvandoVendaPerdida] = useState(false);

  async function carregarProdutos() {
    if (produtos.length > 0) return;
    setLoadingProdutos(true);
    try {
      const d = await rpc("os_produtos_dados");
      setProdutos(d.produtos ?? []);
    } catch (e) { /* ignore */ }
    finally { setLoadingProdutos(false); }
  }

  function abrirModalVendaPerdida(idProduto, nomeProduto) {
    setModalVendaPerdida({ id_produto: idProduto, nome_produto: nomeProduto, quantidade: "", motivo: "", concorrente: "", observacao: "" });
  }

  async function registrarVendaPerdida() {
    const m = modalVendaPerdida; if (!m) return;
    const qtd = num(m.quantidade);
    if (!(qtd > 0)) { notificar("Informe a quantidade.", "erro"); return; }
    if (!m.motivo) { notificar("Selecione o motivo.", "erro"); return; }
    setSalvandoVendaPerdida(true);
    try {
      const prod = produtos.find((p) => p.id === num(m.id_produto));
      const r = await rpc("erp_venda_perdida_registrar", {
        p_id_produto: num(m.id_produto),
        p_quantidade: qtd,
        p_motivo: m.motivo,
        p_id_empresa: usuario.id_empresa || getEmpresaAtiva(),
        p_id_vendedor: osAtual?.id_vendedor || usuario.id,
        p_id_cliente: osAtual?.id_cliente || null,
        p_valor_unitario: prod?.preco_venda || 0,
        p_concorrente: m.concorrente || null,
        p_observacao: m.observacao || null,
        p_ator: usuario.id,
      });
      if (!r?.ok) { notificar(r?.erro || "Erro ao registrar venda perdida.", "erro"); return; }
      notificar(`Venda perdida registrada (R$ ${fmtBRL(r.valor_perdido || 0)})`);
      setModalVendaPerdida(null);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSalvandoVendaPerdida(false); }
  }

  async function recarregarDetalheOs(idOs) {
    try {
      const d = await rpc("os_detalhe_dados", { p_id_os: idOs });
      setExpedicoesOs(d.expedicoes ?? []);
      setOsPecas(d.pecas ?? []);
      return d;
    } catch (e) { /* ignore */ }
  }

  async function solicitarPeca() {
    if (!formPeca.id_produto) { notificar("Selecione um produto.", "erro"); return; }
    setSaving(true);
    try {
      const prod = produtos.find(p => p.id === num(formPeca.id_produto));
      let res;
      if (modoDireto) {
        // Lançamento direto (só autorizado): baixa estoque na hora
        res = await rpc("os_peca_lancar_direto", {
          p_id_os: osAtual.id,
          p_id_produto: num(formPeca.id_produto),
          p_quantidade: num(formPeca.quantidade) || 1,
          p_valor_unitario: prod ? prod.preco_venda : 0,
          p_ator: usuario.id,
        });
        notificar(`Peça entregue direto (${res.id_os_peca}) — estoque baixado`);
      } else {
        // Solicitação normal: vai pra separação
        res = await rpc("os_solicitar_peca", {
          p_id_os: osAtual.id,
          p_id_produto: num(formPeca.id_produto),
          p_quantidade: num(formPeca.quantidade) || 1,
          p_valor_unitario: prod ? prod.preco_venda : 0,
          p_id_usuario: usuario.id,
          p_consumo: false,  // OS/Vendas: sempre é cobrado (consumo só no pátio)
        });
        notificar(`Peça solicitada → Separação ${res.numero}`);
      }
      // Limpar form e reabrir modal pra próxima peça (keyboard-first: adiciona e já abre a próxima)
      setFormPeca({ id_produto: "", quantidade: 1 });
      await recarregarDetalheOs(osAtual.id);
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  /* ─── Avaliar serviços ──────────────────────────────────── */
  const [modalAvaliar, setModalAvaliar] = useState(false);
  const [avalServicos, setAvalServicos] = useState([]);

  function abrirAvaliacao() {
    setAvalServicos(osServicos.map(s => ({
      id: s.id, descricao: s.descricao, status: s.status === "CONCLUIDO" ? "CONCLUIDO" : "CONCLUIDO",
      valor_unitario: s.valor_unitario || 0, valor_total: s.valor_total || 0,
      tempo_realizado: s.tempo_realizado || 0,
      horas_apontadas: osApontamentos.filter(a => a.id_servico_os === s.id && a.hora_termino).reduce((sum, a) => sum + (a.horas_trabalhadas || 0), 0),
    })));
    setModalAvaliar(true);
  }

  async function confirmarAvaliacao() {
    setSaving(true);
    try {
      await rpc("os_avaliar_servicos", {
        p_id_os: osAtual.id,
        p_servicos: avalServicos.map(s => ({ id: s.id, valor_unitario: s.valor_unitario, valor_total: s.valor_total, status: s.status, tempo_realizado: s.tempo_realizado })),
        p_id_usuario: usuario.id,
      });
      setModalAvaliar(false);
      await abrirDetalhe(osAtual);
      notificar("Serviços avaliados com sucesso.");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  /* ─── Faturar OS ────────────────────────────────────────── */
  const [modalFaturar, setModalFaturar] = useState(false);
  const [histOs, setHistOs] = useState(false);
  const [followupOs, setFollowupOs] = useState(false);
  const [drawerProdOs, setDrawerProdOs] = useState(null);
  const [formasPag, setFormasPag] = useState([]);
  const [condicoesPag, setCondicoesPag] = useState([]);
  const [fatForma, setFatForma] = useState("");
  const [fatCond, setFatCond] = useState("");
  const [fatAprov, setFatAprov] = useState({ aberto: false, mensagem: "" });

  async function liberarFaturamentoOS() {
    try {
      const res = await rpc("erp_os_liberar_faturamento", { p_id_os: osAtual.id, p_ator: usuario.id });
      if (res?.ok === false) { notificar(res.erro || "Não foi possível liberar.", "erro"); return; }
      setOsAtual((o) => ({ ...o, status: "LIBERADO_FATURAMENTO" }));
      notificar("OS liberada para faturamento!");
    } catch (e) { notificar("Erro: " + (e.message || ""), "erro"); }
  }
  async function reverterLiberacaoOS() {
    try {
      const res = await rpc("erp_os_reverter_liberacao", { p_id_os: osAtual.id, p_ator: usuario.id });
      if (res?.ok === false) { notificar(res.erro || "Não foi possível reverter.", "erro"); return; }
      setOsAtual((o) => ({ ...o, status: "ABERTA" }));
      notificar("Liberação revertida — OS voltou para edição.");
    } catch (e) { notificar("Erro: " + (e.message || ""), "erro"); }
  }

  async function abrirFaturamento() {
    try {
      const pend = await rpc("erp_os_pendencias", { p_id_os: osAtual.id });
      setPendenciasOs(pend);
      if (pend && pend.ok === false) {
        notificar("Não é possível faturar — resolva os pendências antes.", "aviso");
        return;
      }
      const d = await rpc("os_faturamento_dados");
      setFormasPag(d.formas_pagamento ?? []);
      setCondicoesPag(d.condicoes_pagamento ?? []);
      setFatForma(""); setFatCond("");
      setModalFaturar(true);
    } catch (e) {
      notificar("Erro ao carregar dados: " + e.message, "erro");
    }
  }

  async function confirmarFaturamento(libCredito = false, aprovadorId = null) {
    if (!fatForma) { notificar("Selecione a forma de pagamento.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("os_faturar", { p: {
        id_os: osAtual.id, id_forma_pagamento: num(fatForma),
        id_condicao_pagamento: num(fatCond) || null, _ator: usuario.id,
        _lib_credito: libCredito,
        _id_aprovador: libCredito ? (aprovadorId || usuario.id) : null,
      }});
      if (res?.ok === false) {
        if (res.credito?.permite_liberacao && !libCredito) {
          setSaving(false);
          setFatAprov({ aberto: true, mensagem: res.msg });
          return;
        }
        notificar(res.msg, "erro"); setSaving(false); return;
      }
      setModalFaturar(false);
      const osAtualizada = await rpc("os_recarregar", { p_id_os: osAtual.id });
      if (osAtualizada) { setOsAtual(osAtualizada); setLista(l => l.map(o => o.id === osAtualizada.id ? osAtualizada : o)); }
      notificar("OS faturada com sucesso!");
    } catch (e) {
      const m = String(e.message || "");
      notificar(m.includes("|") ? m.split("|")[1] : "Erro: " + m, "erro");
    } finally { setSaving(false); }
  }

  function pecaEmSeparacao(idPeca) {
    if (!expedicoesOs || expedicoesOs.length === 0) return false;
    return expedicoesOs.some((exp) => {
      if (!["SOLICITADA", "EM_SEPARACAO"].includes(exp.status)) return false;
      if (!Array.isArray(exp.itens)) return false;
      return exp.itens.some((item) => item.id_os_peca === idPeca);
    });
  }

  /* ─── Produção (OP dentro da OS) ─────────────────────────────── */
  const [modalProducao, setModalProducao] = useState(false);
  const [formProd, setFormProd] = useState({ id_produto: "", quantidade: 1, valor_unitario: "", id_area: "" });

  async function lancarProducao() {
    if (!formProd.id_produto) { notificar("Selecione o produto a produzir.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("os_lancar_producao", { p: {
        id_os: osAtual.id, id_produto: num(formProd.id_produto),
        quantidade: num(formProd.quantidade) || 1,
        valor_unitario: num(formProd.valor_unitario) || null,
        id_area: num(formProd.id_area) || null, _ator: usuario.id,
      }});
      setModalProducao(false); setFormProd({ id_produto: "", quantidade: 1, valor_unitario: "", id_area: "" });
      await recarregarDetalheOs(osAtual.id);
      const osAtu = await rpc("os_recarregar", { p_id_os: osAtual.id });
      if (osAtu) setOsAtual(osAtu);
      notificar("Produção lançada — vai aparecer na Distribuição para o gestor designar o colaborador.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function concluirProducao(idOsPeca) {
    if (!window.confirm("Concluir a produção? O produto acabado entra no estoque e sai imediatamente para esta OS.")) return;
    setSaving(true);
    try {
      const res = await rpc("os_producao_concluir", { p_id_os_peca: idOsPeca, p_id_usuario: usuario.id });
      if (res?.ok === false) { notificar(res.msg, "erro"); setSaving(false); return; }
      await recarregarDetalheOs(osAtual.id);
      const osAtu = await rpc("os_recarregar", { p_id_os: osAtual.id });
      if (osAtu) setOsAtual(osAtu);
      notificar(`Produção concluída — custo ${res.modo_custo === "REAL" ? "real (consumo)" : "pela composição"}: ${fmtBRL(res.custo_usado)}`);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function iniciarApontamentoProducao(idOsPeca) {
    const agora = new Date();
    try {
      const saved = await rpc("os_apontamento_salvar", {
        p_id_os: osAtual.id, p_id_os_peca: idOsPeca, p_id_colaborador: usuario.id,
        p_data_apontamento: agora.toISOString().slice(0, 10),
        p_hora_inicio: agora.toTimeString().slice(0, 8),
        p_horas_trabalhadas: 0, p_fator: 0,
      });
      setOsApontamentos((l) => [saved, ...l]);
      notificar("Apontamento da produção iniciado.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  /* ─── Apontamento: iniciar / finalizar ───────────────────────── */
  async function iniciarApontamento(idServicoOs) {
    const agora = new Date();
    const horaStr = agora.toTimeString().slice(0, 8);
    try {
      const saved = await rpc("os_apontamento_salvar", {
        p_id_os: osAtual.id,
        p_id_servico_os: idServicoOs,
        p_id_colaborador: usuario.id,
        p_data_apontamento: agora.toISOString().slice(0, 10),
        p_hora_inicio: horaStr,
        p_horas_trabalhadas: 0,
        p_fator: 0,
      });
      setOsApontamentos((l) => [saved, ...l]);
      setApontando(idServicoOs);
      notificar("Apontamento iniciado.");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    }
  }

  async function finalizarApontamento(apt) {
    const agora = new Date();
    const horaStr = agora.toTimeString().slice(0, 8);
    const [hi, mi] = apt.hora_inicio.split(":").map(Number);
    const [hf, mf] = horaStr.split(":").map(Number);
    const diffMin = (hf * 60 + mf) - (hi * 60 + mi);
    const horas = Math.max(0, +(diffMin / 60).toFixed(2));
    try {
      const saved = await rpc("os_apontamento_salvar", {
        p_id: apt.id,
        p_hora_termino: horaStr,
        p_horas_trabalhadas: horas,
        p_fator: horas,
      });
      setOsApontamentos((l) => l.map((a) => a.id === saved.id ? saved : a));
      setApontando(null);
      notificar(`Apontamento finalizado — ${horas}h registradas.`);
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    }
  }

  /* ─── Excluir apontamento ────────────────────────────────────── */
  async function excluirApontamento(id) {
    try {
      await rpc("os_apontamento_excluir", { p_id: id });
      setOsApontamentos((l) => l.filter((a) => a.id !== id));
      notificar("Apontamento removido.");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    }
  }

  /* ─── Helpers de nome/dados ───────────────────────────────────── */
  const nomeCliente = (id) => (clientes.find((c) => c.id === id) || {}).nome || "—";
  const nomeTecnico = (id) => (usuarios.find((u) => u.id === id) || {}).nome || "—";
  const nomeVeiculo = (id) => (veiculos.find((v) => v.id === id) || {}).placa || "—";
  const nomeArea = (id) => { const a = areas.find((a) => a.id === id); return a ? (a.codigo || a.descricao) : "—"; };
  const dadosCliente = (id) => clientes.find((c) => c.id === id) || {};
  const dadosVeiculo = (id) => veiculos.find((v) => v.id === id) || {};
  const dadosUsuario = (id) => usuarios.find((u) => u.id === id) || {};

  /* ─── Filtro da lista ────────────────────────────────────────── */
  const empresaGlobal = useEmpresaAtiva();
  const filtrados = lista.filter((o) => {
    const q = busca.trim().toLowerCase();
    const okBusca = !q || (o.numero || "").toLowerCase().includes(q) || nomeCliente(o.id_cliente).toLowerCase().includes(q);
    const okStatus = !fStatus || o.status === fStatus;
    const okEmpresa = !empresaGlobal || Number(o.id_empresa) === empresaGlobal;
    return okBusca && okStatus && okEmpresa && !o.cancelada;
  });

  /* ─── TOAST ──────────────────────────────────────────────────── */
  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════ */
  /* ─── VIEW: FORMULÁRIO ───────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════════ */
  if (view === "form") {
    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const veicCliente = veiculos.filter((v) => !form.id_cliente || v.id_cliente === num(form.id_cliente));

    return (
      <div>
        {ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.id ? `Editar OS ${form.numero}` : "Nova Ordem de Serviço"}</h1>
        </div>

        {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}

        <Secao titulo="Dados da OS">
          <Campo label="Empresa *">
            <select value={form.id_empresa || ""} onChange={(e) => setF("id_empresa", e.target.value)} style={sel(true)}>
              <option value="">Selecione...</option>
              {empresasOs.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social || e.nome || ("Empresa " + e.id)}</option>)}
            </select>
          </Campo>
          <Campo label="Cliente *" span={2}>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <BuscaServidor
                  campos={[{ key: "nome", label: "Nome" }, { key: "cnpj", label: "CNPJ" }, { key: "codigo", label: "Código" }]}
                  buscar={(campo, termo) => rpc("erp_clientes_buscar", { p_campo: campo, p_termo: termo, p_id_empresa: null, p_limit: 30 })}
                  render={(c) => ({ label: c.nome, sub: [c.codigo ? "#" + c.codigo : "", c.cpf_cnpj, c.cidade].filter(Boolean).join(" · ") })}
                  onSelect={(c) => { setClientes((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c]); setF("id_cliente", String(c.id)); }}
                  selecionadoLabel={form.id_cliente ? nomeCliente(Number(form.id_cliente)) : ""}
                  placeholder="Buscar cliente (nome, CNPJ ou código)..."
                  full
                />
              </div>
              <button type="button" onClick={() => setNovoClienteAberto(true)} title="Novo cliente (F2)" style={{ ...btnGhost(), whiteSpace: "nowrap", flex: "0 0 auto" }}><Plus size={14} /> Novo <kbd style={{ fontSize: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "0 4px", fontFamily: mono }}>F2</kbd></button>
            </div>
          </Campo>
          <Campo label="Veículo">
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SelectBusca
                  opcoes={veicCliente.map((v) => ({ id: v.id, label: v.placa, sub: v.marca ? v.marca + " " + (v.modelo || "") : "" }))}
                  value={form.id_veiculo}
                  onChange={(id) => setF("id_veiculo", id)}
                  placeholder="Nenhum"
                  full={true}
                />
              </div>
              <button type="button" onClick={() => { if (!form.id_cliente) { setErroForm("Selecione o cliente antes de cadastrar o veículo."); return; } setNovoVeiculoAberto(true); }} title="Novo veículo" style={{ ...btnGhost(), whiteSpace: "nowrap", flex: "0 0 auto" }}><Plus size={14} /> Novo</button>
            </div>
          </Campo>
          <Campo label="Vendedor *">
            <SelectBusca
              opcoes={usuarios.map((u) => ({ id: u.id, label: u.nome }))}
              value={form.id_vendedor}
              onChange={(id) => setForm((f) => ({ ...f, id_vendedor: id, id_prisma: "" }))}
              placeholder="Selecione o vendedor..."
              full={true}
            />
          </Campo>
          <Campo label="Responsável">
            <SelectBusca
              opcoes={usuarios.map((u) => ({ id: u.id, label: u.nome }))}
              value={form.id_usuario_responsavel}
              onChange={(id) => setF("id_usuario_responsavel", id)}
              placeholder="Selecione..."
              full={true}
            />
          </Campo>
          <Campo label={form.id ? "Prisma" : "Prisma *"}>
            <select value={form.id_prisma} onChange={(e) => setF("id_prisma", e.target.value)} disabled={!form.id_vendedor} style={sel(true)}>
              <option value="">{form.id_vendedor ? "Selecione o prisma..." : "Escolha o vendedor primeiro"}</option>
              {prismasForm.filter((p) => p.ativo && (!p.em_uso || String(p.os_numero) === String(form.numero))).map((p) => <option key={p.id} value={p.id}>{p.numero}</option>)}
            </select>
          </Campo>
          <Campo label="Data prevista">
            <input type="date" value={form.data_prevista} onChange={(e) => setF("data_prevista", e.target.value)} style={inp(true)} />
          </Campo>
        </Secao>

        <Secao titulo="Informações">
          <Campo label="KM Entrada">
            <input value={form.km_entrada} onChange={(e) => setF("km_entrada", e.target.value)} inputMode="numeric" style={inp(true)} />
          </Campo>
          <Campo label="Observação interna" span={2}>
            <textarea value={form.observacao_interna} onChange={(e) => setF("observacao_interna", e.target.value)} rows={2} style={{ ...inp(true), height: "auto", resize: "vertical" }} />
          </Campo>
        </Secao>
        {!form.id && (
          <div style={{ background: C.bluePale, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: C.primary, fontWeight: 500 }}>
            Após abrir a OS, você poderá adicionar os defeitos relatados, serviços e peças na tela de detalhe.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={salvarOS} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
            <Save size={16} /> {saving ? "Salvando..." : form.id ? "Salvar" : "Abrir OS"}
          </button>
        </div>
        <NovoClienteModal aberto={novoClienteAberto} onClose={() => setNovoClienteAberto(false)} onCreated={onClienteCriadoOS} idEmpresa={form.id_empresa} usuario={usuario} empresas={empresasOs} />
        <NovoVeiculoModal aberto={novoVeiculoAberto} onClose={() => setNovoVeiculoAberto(false)} onCreated={onVeiculoCriadoOS} idCliente={form.id_cliente ? Number(form.id_cliente) : null} clienteNome={form.id_cliente ? nomeCliente(Number(form.id_cliente)) : ""} usuario={usuario} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* ─── VIEW: DETALHE DA OS ────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════════ */
  if (view === "detalhe" && osAtual) {
    const totalServicos = osServicos.reduce((s, sv) => s + (num(sv.valor_total) || 0), 0);
    const totalPecas = osPecas.reduce((s, p) => s + (num(p.valor_total) || 0), 0);
    const cli = dadosCliente(osAtual.id_cliente);
    const osLiberado = osAtual.status === "LIBERADO_FATURAMENTO";
    const veic = osAtual.id_veiculo ? dadosVeiculo(osAtual.id_veiculo) : null;
    const resp = osAtual.id_usuario_responsavel ? dadosUsuario(osAtual.id_usuario_responsavel) : null;
    const infoStyle = { fontSize: 12, color: C.muted, lineHeight: 1.6 };
    const infoLabel = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted };

    return (
      <div>
        {ToastEl}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>OS {osAtual.numero}</h1>
              <Badge texto={osAtual.status} cor={STATUS_CORES[osAtual.status]} />
              {perms.editar && osAtual.status !== "FATURADA" && osAtual.status !== "LIBERADO_FATURAMENTO" && !osAtual.cancelada && (() => {
                const atual = prismasOs.find((p) => p.os_numero === osAtual.numero);
                const livres = prismasOs.filter((p) => p.ativo && (!p.em_uso || p.os_numero === osAtual.numero));
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }} title="Prisma da OS (números do vendedor)">
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted }}>Prisma</span>
                    <select value={atual ? atual.id : ""} onChange={(e) => atribuirPrisma(e.target.value)} style={{ ...sel(), height: 32, padding: "4px 10px", fontFamily: mono, fontWeight: 700, minWidth: 90 }}>
                      <option value="">— livre —</option>
                      {livres.map((p) => <option key={p.id} value={p.id}>{p.numero}</option>)}
                    </select>
                  </div>
                );
              })()}
            </div>
          </div>

          {osLiberado && (
            <div style={{ background: C.warningBg, color: C.warning, padding: "12px 16px", borderRadius: 8, margin: "0 0 16px", fontSize: 13, fontWeight: 500 }}>
              🔒 OS <b>liberada para faturamento</b> — edição travada. Para alterar, o faturamento precisa reverter a liberação.
            </div>
          )}

          {/* Aviso de pendências para faturar */}
          {pendenciasOs && pendenciasOs.ok === false && pendenciasOs.pendencias && pendenciasOs.pendencias.length > 0 && (
            <div style={{ background: C.warningBg, color: C.warning, padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
              <div style={{ marginBottom: 8 }}>⚠️ <strong>Não é possível faturar.</strong> Resolva os pendências:</div>
              <ul style={{ margin: "0 0 0 20px", paddingLeft: 0 }}>
                {pendenciasOs.pendencias.map((p, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {p.tipo === "SERVICO" && "🔧 "}
                    {p.tipo === "SEPARACAO" && "📦 "}
                    {p.tipo === "APONTAMENTO" && "⏱️ "}
                    <strong>{p.qtd}</strong> {p.msg}
                    {p.tipo === "SEPARACAO" && (
                      <button onClick={() => irPara("separacao")} style={{ marginLeft: 8, background: "none", border: "none", color: C.warning, textDecoration: "underline", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        ir para Separação →
                      </button>
                    )}
                    {p.tipo === "SERVICO" && (
                      <button onClick={() => irPara("distribuicao_os")} style={{ marginLeft: 8, background: "none", border: "none", color: C.warning, textDecoration: "underline", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        ir para Distribuição →
                      </button>
                    )}
                    {p.tipo === "APONTAMENTO" && (
                      <button onClick={() => setAbaDetalhe("apontamentos")} style={{ marginLeft: 8, background: "none", border: "none", color: C.warning, textDecoration: "underline", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        ver apontamentos →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {perms.aprovar && osAtual.status !== "FATURADA" && osAtual.status !== "LIBERADO_FATURAMENTO" && !osAtual.cancelada && osServicos.length > 0 && (
              <button onClick={abrirAvaliacao} style={btnGhost()}>
                <CheckCircle2 size={14} /> Avaliar
              </button>
            )}
            {perms.editar && osAtual.status !== "FATURADA" && osAtual.status !== "LIBERADO_FATURAMENTO" && !osAtual.cancelada && (osServicos.length > 0 || osPecas.length > 0) && (
              <button onClick={liberarFaturamentoOS} disabled={pendenciasOs && pendenciasOs.ok === false} style={{ ...btnPrimary(), background: pendenciasOs && pendenciasOs.ok === false ? C.muted : C.success, opacity: pendenciasOs && pendenciasOs.ok === false ? 0.6 : 1, cursor: pendenciasOs && pendenciasOs.ok === false ? "not-allowed" : "pointer" }} title={pendenciasOs && pendenciasOs.ok === false ? "Resolva os pendências antes de liberar" : "Libera a OS para o faturamento (trava edição)"}>
                <DollarSign size={14} /> Liberar Faturamento
              </button>
            )}
            {osLiberado && perms.aprovar && (
              <button onClick={reverterLiberacaoOS} style={{ ...btnGhost(), color: C.warning, borderColor: C.warning }}><Undo2 size={14} /> Reverter liberação</button>
            )}
            {osLiberado && perms.aprovar && (
              <button onClick={abrirFaturamento} style={{ ...btnPrimary(), background: C.success }}><DollarSign size={14} /> Faturar OS</button>
            )}
            {perms.editar && osAtual.status !== "FATURADA" && (
              <button onClick={() => { setForm({ ...OS_VAZIA(), ...osAtual }); setView("form"); }} style={btnGhost()}>
                <Pencil size={14} /> Editar
              </button>
            )}
            <button onClick={() => imprimirOSDoc({ os: osAtual, pecas: osPecas, servicos: osServicos, cliente: nomeCliente(osAtual.id_cliente), empresa: osAtual.empresa || "" })} style={btnGhost()}>
              <Printer size={14} /> Imprimir
            </button>
            <button onClick={() => setHistOs(true)} style={btnGhost()}>
              <History size={14} /> Histórico
            </button>
            <button onClick={() => setFollowupOs(true)} style={btnGhost()}>
              <History size={14} /> Follow-up
            </button>
            {osAtual.status !== "CANCELADA" && (osPecas || []).length > 0 && (
              <button onClick={() => irPara("devolucoes", { origem: "OS", id: osAtual.id, numero: osAtual.numero })} style={btnGhost()}>
                <Undo2 size={14} /> Devolver
              </button>
            )}
            {!osAtual.cancelada && (
              <button onClick={() => irPara("orcamentos", { id_os: osAtual.id, numero_os: osAtual.numero, id_cliente: osAtual.id_cliente, id_empresa: osAtual.id_empresa })} style={btnGhost()}>
                <FileText size={14} /> Novo orçamento
              </button>
            )}
          </div>
        </div>

        {/* Painel: Cliente / Veículo / Responsável */}
        <div style={{ display: "grid", gridTemplateColumns: veic ? "2fr 2fr 1fr" : "3fr 1fr", gap: 12, margin: "12px 0" }}>
          {/* Cliente */}
          <div style={cardStyle()}>
            <div style={{ ...infoLabel, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}><User size={12} /> Cliente</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{cli.codigo ? <span style={{ fontFamily: mono, color: C.muted }}>#{cli.codigo} · </span> : null}{cli.nome || "—"}</div>
            <div style={infoStyle}>
              {cli.cpf_cnpj && <div>CPF/CNPJ: <span style={{ fontFamily: mono }}>{cli.cpf_cnpj}</span></div>}
              {(cli.telefone || cli.celular) && <div>Tel: {cli.telefone || cli.celular}</div>}
              {cli.endereco && <div>{cli.endereco}{cli.numero ? `, ${cli.numero}` : ""}{cli.bairro ? ` — ${cli.bairro}` : ""}</div>}
              {cli.cidade && <div>{cli.cidade}{cli.uf ? `/${cli.uf}` : ""}{cli.cep ? ` · ${cli.cep}` : ""}</div>}
            </div>
          </div>
          {/* Veículo */}
          {veic && (
            <div style={cardStyle()}>
              <div style={{ ...infoLabel, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}><FileText size={12} /> Veículo</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, fontFamily: mono }}>{veic.placa || "—"}</div>
              <div style={infoStyle}>
                {(veic.marca || veic.modelo) && <div>{veic.marca} {veic.modelo}</div>}
                {(veic.ano_fabricacao || veic.ano_modelo) && <div>Ano: {veic.ano_fabricacao || ""}{veic.ano_modelo ? `/${veic.ano_modelo}` : ""}</div>}
                {veic.cor && <div>Cor: {veic.cor}</div>}
                {veic.combustivel && <div>Combustível: {veic.combustivel}</div>}
                {veic.km_atual > 0 && <div>KM: <span style={{ fontFamily: mono }}>{Number(veic.km_atual).toLocaleString("pt-BR")}</span></div>}
                {veic.chassi && <div>Chassi: <span style={{ fontFamily: mono, fontSize: 11 }}>{veic.chassi}</span></div>}
              </div>
            </div>
          )}
          {/* Responsável */}
          <div style={cardStyle()}>
            <div style={{ ...infoLabel, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}><User size={12} /> Responsável</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{resp ? resp.nome : "Não atribuído"}</div>
            <div style={infoStyle}>
              {osAtual.data_entrada && <div>Entrada: {new Date(osAtual.data_entrada).toLocaleDateString("pt-BR")}</div>}
              {osAtual.data_prevista && <div>Prevista: {new Date(osAtual.data_prevista + "T00:00").toLocaleDateString("pt-BR")}</div>}
              {osAtual.km_entrada > 0 && <div>KM entrada: <span style={{ fontFamily: mono }}>{Number(osAtual.km_entrada).toLocaleString("pt-BR")}</span></div>}
            </div>
          </div>
        </div>

        {/* Orçamentos vinculados a esta OS */}
        {osOrcamentos.length > 0 && (
          <div style={{ ...cardStyle(), margin: "12px 0", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={15} color={C.primary} /> Orçamentos desta OS
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>· {osOrcamentos.length}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Nº", "Status", "Emissão", "Validade", "Vendedor", "Total"].map((h, i) => <th key={i} style={th(i === 5)}>{h}</th>)}</tr></thead>
                <tbody>
                  {osOrcamentos.map((o) => (
                    <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ ...td(), fontFamily: mono, fontWeight: 700, color: C.primary }}>{o.numero}</td>
                      <td style={td()}>{o.status}</td>
                      <td style={td()}>{o.data_emissao ? new Date(o.data_emissao).toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={td()}>{o.data_validade ? new Date(o.data_validade + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={td()}>{o.vendedor || "—"}</td>
                      <td style={{ ...td(true), fontFamily: mono }}>{fmtBRL(o.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "12px 0" }}>
          {[
            { label: "Defeitos", valor: `${osDefeitos.length}`, icone: AlertCircle },
            { label: "Serviços", valor: fmtBRL(totalServicos), icone: Wrench },
            { label: "Peças", valor: fmtBRL(totalPecas), icone: Package },
            { label: "Total", valor: fmtBRL(totalServicos + totalPecas), icone: FileText },
          ].map((kpi, i) => (
            <div key={i} style={cardStyle()}>
              <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <kpi.icone size={13} /> {kpi.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono }}>{kpi.valor}</div>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 16 }}>
          {[
            { key: "defeitos", label: "Defeitos", icon: AlertCircle, count: osDefeitos.length },
            { key: "servicos", label: "Serviços", icon: Wrench, count: osServicos.length },
            { key: "pecas", label: "Peças", icon: Package, count: osPecas.length },
            { key: "apontamentos", label: "Apontamentos", icon: Clock, count: osApontamentos.length },
          ].map((aba) => (
            <button key={aba.key} onClick={() => setAbaDetalhe(aba.key)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 13, fontWeight: 600,
              border: "none", background: "transparent", cursor: "pointer",
              color: abaDetalhe === aba.key ? C.primary : C.muted,
              borderBottom: abaDetalhe === aba.key ? `2px solid ${C.primary}` : "2px solid transparent",
              marginBottom: -2,
            }}>
              <aba.icon size={15} /> {aba.label} ({aba.count})
            </button>
          ))}
        </div>

        {loadingDetalhe ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : (
          <>
            {/* ─── ABA DEFEITOS ────────────────────────────────── */}
            {abaDetalhe === "defeitos" && (
              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Defeitos Relatados</span>
                  {perms.editar && osAtual.status !== "FATURADA" && osAtual.status !== "LIBERADO_FATURAMENTO" && !osAtual.cancelada && (
                    <button onClick={() => setAddDefeito(!addDefeito)} style={btnPrimary()}>
                      <Plus size={14} /> Adicionar defeito
                    </button>
                  )}
                </div>

                {addDefeito && (
                  <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
                      <Campo label="Descrição do defeito *" span={1}>
                        <input value={formDefeito.descricao} onChange={(e) => setFormDefeito((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Vazamento de óleo no motor" style={{ ...inp(true), width: "100%", minWidth: 300 }}
                          onKeyDown={(e) => { if (e.key === "Enter") adicionarDefeito(); }} />
                      </Campo>
                      {areas.length > 0 && (
                        <Campo label="Área / Setor">
                          <SelectBusca
                            opcoes={areas.map((a) => ({ id: a.id, label: a.descricao, sub: a.codigo || "" }))}
                            value={formDefeito.id_area}
                            onChange={(id) => setFormDefeito((f) => ({ ...f, id_area: id }))}
                            placeholder="Selecione a área..."
                            full={true}
                          />
                        </Campo>
                      )}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={adicionarDefeito} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                        <button onClick={() => setAddDefeito(false)} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
                      </div>
                    </div>
                  </div>
                )}

                {osDefeitos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}>
                    <AlertCircle size={28} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 8, fontSize: 13 }}>Nenhum defeito relatado ainda.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {osDefeitos.map((d) => (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff" }}>
                        <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 13, color: C.destructive, minWidth: 44 }}>{d.codigo}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{d.descricao}</span>
                        {d.area && <span style={{ background: C.bluePale, color: C.blueMid, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{d.area}</span>}
                        {d.status && (() => { const st = DEF_ST[d.status] || DEF_ST.ABERTO; return <span style={{ background: st.bg, color: st.fg, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{st.t}</span>; })()}
                        {perms.editar && osAtual.status !== "FATURADA" && osAtual.status !== "LIBERADO_FATURAMENTO" && !osAtual.cancelada && !d.tem_apontamento && (
                          <button onClick={() => excluirDefeito(d.id)} style={{ ...btnIcon(), color: C.muted }} title="Remover"><Trash2 size={13} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── ABA SERVIÇOS ─────────────────────────────────── */}
            {abaDetalhe === "servicos" && (
              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Serviços da OS</span>
                  {perms.editar && (
                    <button onClick={() => { const abrir = !addServico; setAddServico(abrir); if (abrir) setTimeout(() => refServDesc.current?.focus(), 40); }} style={btnPrimary()}>
                      <Plus size={14} /> Adicionar serviço
                    </button>
                  )}
                </div>

                {/* Form inline para adicionar serviço */}
                {addServico && (
                  <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ marginBottom: 10 }}>
                    <Campo label="Serviço (da relação de serviços) *">
                      <SelectBusca
                        full
                        opcoes={servicos.map((s) => ({ id: s.id, label: s.nome, sub: (s.codigo ? s.codigo + " · " : "") + fmtBRL(s.preco) }))}
                        value={formServ.id_servico}
                        onChange={(id) => { const s = servicos.find((x) => String(x.id) === String(id)) || {}; setFormServ((f) => ({ ...f, id_servico: id, descricao: s.nome || f.descricao, valor_unitario: s.preco != null ? String(s.preco) : f.valor_unitario })); }}
                        placeholder="Buscar serviço no cadastro..."
                      />
                    </Campo>
                  </div>
                  <div onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setAddServico(false); } }} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 1fr 1.2fr auto", gap: 10, alignItems: "end" }}>
                    <Campo label="Descrição *">
                      <input ref={refServDesc} value={formServ.descricao} onChange={(e) => setFormServ((f) => ({ ...f, descricao: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarServico(); } }} placeholder="Descreva ou selecione acima" style={inp(true)} />
                    </Campo>
                    <Campo label="Área (código)">
                      <select value={formServ.id_area} onChange={(e) => setFormServ((f) => ({ ...f, id_area: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarServico(); } }} style={sel(true)}>
                        <option value="">—</option>
                        {areas.map((a) => <option key={a.id} value={a.id}>{a.codigo ? a.codigo + " - " : ""}{a.descricao}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Qtd">
                      <input value={formServ.quantidade} onChange={(e) => setFormServ((f) => ({ ...f, quantidade: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarServico(); } }} inputMode="numeric" style={inp(true)} />
                    </Campo>
                    <Campo label="Valor unit.">
                      <input value={formServ.valor_unitario} onChange={(e) => setFormServ((f) => ({ ...f, valor_unitario: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarServico(); } }} inputMode="decimal" style={inp(true)} />
                    </Campo>
                    <Campo label="Técnico">
                      <SelectBusca
                        opcoes={usuarios.map((u) => ({ id: u.id, label: u.nome }))}
                        value={formServ.id_tecnico}
                        onChange={(id) => setFormServ((f) => ({ ...f, id_tecnico: id }))}
                        placeholder="—"
                        full={true}
                      />
                    </Campo>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => adicionarServico()} disabled={saving} title="Adicionar (Enter)" style={{ ...btnPrimary(), padding: "10px 12px" }}><Plus size={14} /></button>
                      <button onClick={() => setAddServico(false)} title="Fechar (Esc)" style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>Descrição → Tab → Área (digite o código) → <b>Enter</b> adiciona e já abre a próxima linha. <b>Esc</b> fecha.</div>
                  </div>
                )}

                {osServicos.filter(s => s.finalizado_em).length > 0 && (
                  <div style={{ ...cardStyle(), padding: 12, marginTop: 14, background: C.successBg, border: `2px solid ${C.success}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.success, marginBottom: 8 }}>✅ Finalizados aguardando precificação</div>
                    <div style={{ fontSize: 12, color: C.foreground }}>
                      {osServicos.filter(s => s.finalizado_em).map((sv, i) => (
                        <div key={i} style={{ marginBottom: 4 }}>
                          {sv.descricao} · Finalizado por {sv.finalizado_por_nome || "?"} em {new Date(sv.finalizado_em).toLocaleString("pt-BR")}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {osServicos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}>
                    <Wrench size={28} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 8, fontSize: 13 }}>Nenhum serviço adicionado ainda.</div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>
                      {["#", "Área", "Descrição", "Técnico", "Qtd", "Valor Unit.", "Total", "Status", "Apontar"].map((h, i) => (
                        <th key={i} style={th(i >= 4 && i <= 6)}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {osServicos.map((sv, i) => {
                        const aptAberto = osApontamentos.find((a) => a.id_servico_os === sv.id && !a.hora_termino);
                        return (
                          <tr key={sv.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={td()}>{i + 1}</td>
                            <td style={td()}><span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: C.primary, background: C.bluePale, padding: "2px 6px", borderRadius: 4 }}>{nomeArea(sv.id_area)}</span></td>
                            <td style={{ ...td(), fontWeight: 500 }}>{sv.descricao}</td>
                            <td style={{ ...td(), color: C.muted }}>{sv.id_tecnico ? nomeTecnico(sv.id_tecnico) : "—"}</td>
                            <td style={{ ...td(), textAlign: "right" }}>{sv.quantidade}</td>
                            <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(sv.valor_unitario)}</td>
                            <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(sv.valor_total)}</td>
                            <td style={td()}><Badge texto={sv.status || "PENDENTE"} /></td>
                            <td style={td()}>
                              {perms.aprovar && (
                                aptAberto ? (
                                  <button onClick={() => finalizarApontamento(aptAberto)} style={{ ...btnIcon(), background: C.destructiveBg, color: C.destructive, border: `1px solid ${C.destructive}30` }} title="Finalizar apontamento">
                                    <Square size={14} />
                                  </button>
                                ) : (
                                  <button onClick={() => iniciarApontamento(sv.id)} style={{ ...btnIcon(), background: C.successBg, color: C.success, border: `1px solid ${C.success}30` }} title="Iniciar apontamento">
                                    <Play size={14} />
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ─── ABA PEÇAS ────────────────────────────────────── */}
            {abaDetalhe === "pecas" && (
              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Peças da OS{num(osAtual.valor_consumo) > 0 ? <span style={{ fontSize: 11, fontWeight: 500, color: C.warning, marginLeft: 10 }}>consumo interno: {fmtBRL(osAtual.valor_consumo)} (não cobrado)</span> : null}</span>
                  {perms.editar && osAtual.status !== "FATURADA" && osAtual.status !== "LIBERADO_FATURAMENTO" && !osAtual.cancelada && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => {
                        const desc = window.prompt("Encomenda — descreva o item que precisa ser comprado para esta OS:");
                        if (!desc) return;
                        const qtd = window.prompt("Quantidade:", "1");
                        if (qtd === null) return;
                        rpc("encomenda_solicitar", { p: { origem: "OS", id_os: osAtual.id, descricao: desc, quantidade: num(qtd) || 1, _ator: usuario.id } })
                          .then((r) => notificar(`Encomenda ${r.numero} enviada para o Compras cotar.`))
                          .catch((e) => notificar("Erro: " + e.message, "erro"));
                      }} style={btnGhost()}>
                        <Package size={14} /> Encomendar
                      </button>
                      <button onClick={() => { carregarProdutos(); setModalProducao(true); }} style={btnGhost()}>
                        <Wrench size={14} /> Lançar Produção
                      </button>
                      <button onClick={() => { carregarProdutos(); setModalPeca(true); }} style={btnPrimary()}>
                        <Send size={14} /> Solicitar Peça
                      </button>
                    </div>
                  )}
                </div>

                {/* Solicitações pendentes */}
                {expedicoesOs.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.textMuted, letterSpacing: "0.08em" }}>Solicitações de Separação</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {expedicoesOs.map(exp => (
                        <div key={exp.id} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: exp.status === "SOLICITADA" ? C.warningBg || "#FFF3CD" : exp.status === "ENTREGUE" ? C.successBg : C.surface2, color: exp.status === "SOLICITADA" ? "#856404" : exp.status === "ENTREGUE" ? C.success : C.muted, border: `1px solid ${C.border}` }}>
                          {exp.numero} · <Badge texto={exp.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {osPecas.length === 0 && expedicoesOs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}>
                    <Package size={28} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 8, fontSize: 13 }}>Nenhuma peça. Use "Solicitar Peça" para enviar ao estoque.</div>
                  </div>
                ) : osPecas.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>
                      {["Código", "Descrição", "Referência", "Qtd", "Valor Unit.", "Total", ""].map((h, i) => (
                        <th key={i} style={th(i >= 3 && i <= 5)}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {osPecas.map((p) => {
                        const aptAbertoProd = p.produzido ? osApontamentos.find((a) => a.id_os_peca === p.id && !a.hora_termino) : null;
                        const emSeparacao = pecaEmSeparacao(p.id);
                        return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, opacity: (p.consumo || emSeparacao) ? 0.85 : 1 }}>
                          <td style={{ ...td(), fontFamily: mono, color: C.muted, fontWeight: 600 }}>{p.codigo ? "#" + p.codigo : "—"}</td>
                          <td style={{ ...td(), fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            {emSeparacao && <Lock size={13} color={C.warning} title="Em separação — só a boqueta altera" />}
                            {p.descricao}
                            {p.consumo && <span style={{ marginLeft: 8, background: C.warningBg, color: C.warning, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>CONSUMO</span>}
                            {p.produzido && <span style={{ marginLeft: 8, background: "#E8E0F8", color: "#6B3FA0", fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>PRODUÇÃO · {p.status || "PENDENTE"}</span>}
                            {p.id_encomenda && <span style={{ marginLeft: 8, background: C.bluePale, color: C.blueMid, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>ENCOMENDA</span>}
                          </td>
                          <td style={{ ...td(), color: C.muted, fontFamily: mono }}>{p.referencia || "—"}</td>
                          <td style={{ ...td(), textAlign: "right" }}>{p.quantidade}</td>
                          <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(p.valor_unitario)}</td>
                          <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{p.consumo ? "—" : fmtBRL(p.valor_total)}</td>
                          <td style={{ ...td(), whiteSpace: "nowrap" }}>
                            {p.produzido && p.status !== "CONCLUIDO" && (
                              <span style={{ display: "inline-flex", gap: 6 }}>
                                {aptAbertoProd ? (
                                  <button onClick={() => finalizarApontamento(aptAbertoProd)} disabled={emSeparacao} style={{ ...btnIcon(), background: C.destructiveBg, color: C.destructive, border: `1px solid ${C.destructive}30`, opacity: emSeparacao ? 0.5 : 1, cursor: emSeparacao ? "not-allowed" : "pointer" }} title={emSeparacao ? "Em separação — não pode finalizar" : "Finalizar apontamento"}>
                                    <Square size={14} />
                                  </button>
                                ) : (
                                  <button onClick={() => iniciarApontamentoProducao(p.id)} disabled={emSeparacao} style={{ ...btnIcon(), background: C.successBg, color: C.success, border: `1px solid ${C.success}30`, opacity: emSeparacao ? 0.5 : 1, cursor: emSeparacao ? "not-allowed" : "pointer" }} title={emSeparacao ? "Em separação — não pode iniciar" : "Iniciar apontamento"}>
                                    <Play size={14} />
                                  </button>
                                )}
                                {perms.aprovar && (
                                  <button onClick={() => concluirProducao(p.id)} disabled={emSeparacao} style={{ ...btnIcon(), color: emSeparacao ? C.muted : C.primary, borderColor: emSeparacao ? C.muted : C.primary, opacity: emSeparacao ? 0.5 : 1, cursor: emSeparacao ? "not-allowed" : "pointer" }} title={emSeparacao ? "Em separação — não pode concluir" : "Concluir produção"}>
                                    <CheckCircle2 size={14} />
                                  </button>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ─── ABA APONTAMENTOS ────────────────────────────── */}
            {abaDetalhe === "apontamentos" && (
              <div style={cardStyle()}>
                <span style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 14 }}>Apontamentos</span>
                {osApontamentos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}>
                    <Clock size={28} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 8, fontSize: 13 }}>Nenhum apontamento registrado.</div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>
                      {["Data", "Colaborador", "Serviço", "Início", "Término", "Horas"].map((h, i) => (
                        <th key={i} style={th(i === 5)}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {osApontamentos.map((apt) => {
                        const servDesc = apt.id_os_peca ? ("PRODUÇÃO: " + ((osPecas.find((x) => x.id === apt.id_os_peca) || {}).descricao || "—")) : ((osServicos.find((s) => s.id === apt.id_servico_os) || {}).descricao || "—");
                        const emAberto = !apt.hora_termino;
                        return (
                          <tr key={apt.id} style={{ borderBottom: `1px solid ${C.border}`, background: emAberto ? C.successBg : "transparent" }}>
                            <td style={td()}>{apt.data_apontamento ? new Date(apt.data_apontamento + "T00:00").toLocaleDateString("pt-BR") : "—"}</td>
                            <td style={{ ...td(), fontWeight: 500 }}>{nomeTecnico(apt.id_colaborador)}</td>
                            <td style={{ ...td(), color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{servDesc}</td>
                            <td style={{ ...td(), fontFamily: mono }}>{(apt.hora_inicio || "").slice(0, 5)}</td>
                            <td style={{ ...td(), fontFamily: mono }}>
                              {emAberto ? <span style={{ color: C.success, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>● em andamento</span> : (apt.hora_termino || "").slice(0, 5)}
                            </td>
                            <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>
                              {emAberto ? "—" : `${apt.horas_trabalhadas}h`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {/* ─── MODAL LANÇAR PRODUÇÃO ─────────────────────────── */}
        {modalProducao && (
          <div onClick={() => setModalProducao(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Lançar Produção na OS</span>
                <button onClick={() => setModalProducao(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
              </div>
              <div style={{ padding: 20 }}>
                {loadingProdutos ? <div style={{ textAlign: "center", padding: 20, color: C.textMuted }}>Carregando produtos...</div> : (
                  <>
                    {produtos.filter(x => x.produzido).length === 0 && (
                      <Aviso cor="warning"><AlertCircle size={15} /> Nenhum produto marcado como "produzido". Marque no cadastro de Produtos.</Aviso>
                    )}
                    <Campo label="Produto a produzir *">
                      <select value={formProd.id_produto} onChange={e => {
                        const pr = produtos.find(x => x.id === Number(e.target.value));
                        setFormProd(f => ({ ...f, id_produto: e.target.value, valor_unitario: pr ? pr.preco_venda : "" }));
                      }} style={sel(true)}>
                        <option value="">Selecione...</option>
                        {produtos.filter(x => x.produzido).map(x => <option key={x.id} value={x.id}>{x.referencia ? `${x.referencia} — ` : ""}{x.nome}</option>)}
                      </select>
                    </Campo>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                      <Campo label="Quantidade"><input value={formProd.quantidade} onChange={e => setFormProd(f => ({ ...f, quantidade: e.target.value }))} inputMode="numeric" style={inp(true)} /></Campo>
                      <Campo label="Valor de venda unit."><input value={formProd.valor_unitario} onChange={e => setFormProd(f => ({ ...f, valor_unitario: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
                    </div>
                    {areas.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6 }}>Área responsável</span>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {areas.map((a) => {
                            const on = String(formProd.id_area) === String(a.id);
                            return (
                              <div key={a.id} onClick={() => setFormProd((f) => ({ ...f, id_area: on ? "" : String(a.id) }))} style={{
                                padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                                border: on ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                                background: on ? "rgba(0,170,238,0.08)" : "#fff",
                                color: on ? C.primary : C.foreground,
                              }}>{a.codigo ? `${a.codigo} · ` : ""}{a.descricao}</div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                      <button onClick={() => setModalProducao(false)} style={btnGhost()}>Cancelar</button>
                      <button onClick={lancarProducao} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
                        <Wrench size={14} /> {saving ? "Lançando..." : "Lançar Produção"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL SOLICITAR PEÇA ──────────────────────────── */}
        {modalPeca && (
          <div onClick={() => { setModalPeca(false); setModoDireto(false); }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Solicitar Peça para Separação</span>
                <button onClick={() => { setModalPeca(false); setModoDireto(false); }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
              </div>
              <div style={{ padding: 20 }}>
                {loadingProdutos ? <div style={{ textAlign: "center", padding: 20, color: C.textMuted }}>Carregando produtos...</div> : (
                  <>
                    <Campo label="Produto *">
                      <BuscaServidor
                        campos={[{ key: "codigo_nome", label: "Código + Nome" }, { key: "referencia", label: "Ref. fornecedor" }, { key: "codigo_barras", label: "Cód. barras" }]}
                        buscar={(campo, termo) => rpc("erp_produtos_buscar", { p_campo: campo, p_termo: termo, p_limit: 30 })}
                        render={(p) => ({ label: p.nome, sub: [p.codigo ? "#" + p.codigo : null, p.referencia, fmtBRL(p.preco_venda)].filter(Boolean).join(" · ") })}
                        placeholder="Buscar produto (código ou nome)..."
                        onSelect={(p) => { setProdutos((prev) => prev.some((x) => x.id === p.id) ? prev : [...prev, p]); setFormPeca(f => ({ ...f, id_produto: String(p.id) })); }}
                        selecionadoLabel={formPeca.id_produto ? (produtos.find((x) => x.id === Number(formPeca.id_produto))?.nome || "") : ""}
                        full
                      />
                      {formPeca.id_produto && (() => {
                        const prod = produtos.find((x) => x.id === Number(formPeca.id_produto));
                        return prod ? (
                          <div style={{ marginTop: 10, padding: 12, background: C.surface2, borderRadius: 8, display: "flex", gap: 12, alignItems: "center" }}>
                            {prod.foto_url && <img src={prod.foto_url} alt={prod.nome} style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{prod.nome}</div>
                              <div style={{ fontSize: 11, color: C.muted, margin: "2px 0" }}>
                                {prod.codigo ? `#${prod.codigo}` : ""} {prod.referencia && `· ${prod.referencia}`}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 500, fontFamily: mono, color: C.foreground }}>
                                {fmtBRL(prod.preco_venda || 0)}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: prod.estoque_atual > 0 ? C.success : C.destructive }}>
                                {prod.estoque_atual > 0 ? `${Math.floor(prod.estoque_atual)} em estoque` : "sem estoque"}
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </Campo>
                    <Campo label="Quantidade">
                      <input value={formPeca.quantidade} onChange={e => setFormPeca(f => ({ ...f, quantidade: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') solicitarPeca(); else if (e.key === 'Escape') setModalPeca(false); }} inputMode="numeric" style={inp(true)} />
                    </Campo>
                    {perms.aprovar && (
                      <div style={{ marginTop: 12, marginBottom: 8 }}>
                        <button onClick={() => setModoDireto(!modoDireto)} style={{ padding: "6px 12px", borderRadius: 6, border: modoDireto ? `2px solid ${C.primary}` : `1px solid ${C.border}`, background: modoDireto ? C.bluePale : "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: modoDireto ? C.primary : C.textMuted }}>
                          {modoDireto ? "🎯 Lançamento direto (estoque baixado)" : "⬜ Solicitar para separação (padrão)"}
                        </button>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                      <button onClick={() => { setModalPeca(false); setModoDireto(false); }} style={btnGhost()}>Cancelar</button>
                      <button onClick={solicitarPeca} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
                        <Send size={14} /> {saving ? "Enviando..." : "Solicitar"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL AVALIAR SERVIÇOS ────────────────────────── */}
        {modalAvaliar && (
          <div onClick={() => setModalAvaliar(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Avaliar Serviços — OS {osAtual.numero}</span>
                <button onClick={() => setModalAvaliar(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
              </div>
              <div style={{ padding: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr>
                    {["Serviço", "Horas apontadas", "Valor Unit.", "Total", "Status"].map((h, i) => (
                      <th key={i} style={th(i >= 1 && i <= 3)}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {avalServicos.map((s, idx) => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ ...td(), fontWeight: 500, maxWidth: 200 }}>{s.descricao}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{s.horas_apontadas.toFixed(1)}h</td>
                        <td style={td()}>
                          <input value={s.valor_unitario} onChange={e => setAvalServicos(l => l.map((x, i) => i === idx ? { ...x, valor_unitario: num(e.target.value) || 0, valor_total: (num(e.target.value) || 0) * (x.quantidade || 1) } : x))} inputMode="decimal" style={{ ...inp(), width: 90, textAlign: "right" }} />
                        </td>
                        <td style={td()}>
                          <input value={s.valor_total} onChange={e => setAvalServicos(l => l.map((x, i) => i === idx ? { ...x, valor_total: num(e.target.value) || 0 } : x))} inputMode="decimal" style={{ ...inp(), width: 90, textAlign: "right" }} />
                        </td>
                        <td style={td()}>
                          <select value={s.status} onChange={e => setAvalServicos(l => l.map((x, i) => i === idx ? { ...x, status: e.target.value } : x))} style={sel()}>
                            <option value="CONCLUIDO">Concluído</option>
                            <option value="PENDENTE">Pendente</option>
                            <option value="EM_EXECUCAO">Em Execução</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                  <button onClick={() => setModalAvaliar(false)} style={btnGhost()}>Cancelar</button>
                  <button onClick={confirmarAvaliacao} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
                    <CheckCircle2 size={14} /> {saving ? "Salvando..." : "Confirmar Avaliação"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL FATURAR OS ──────────────────────────────── */}
        {histOs && <DrawerHistorico tabela="ordens_servico" registro={osAtual.id} titulo="Histórico da OS" sub={`OS ${osAtual.numero}`} onClose={() => setHistOs(false)} />}
        {followupOs && <DrawerFollowup tipo="os" idRegistro={osAtual.id} titulo="Follow-up da OS" sub={`OS ${osAtual.numero}`} onClose={() => setFollowupOs(false)} />}
        {drawerProdOs && <DrawerEstoque idProduto={drawerProdOs} idEmpresa={osAtual.id_empresa || null} onClose={() => setDrawerProdOs(null)} />}

        {modalFaturar && (
          <div onClick={() => setModalFaturar(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Faturar OS {osAtual.numero}</span>
                <button onClick={() => setModalFaturar(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ textAlign: "center", fontSize: 24, fontWeight: 700, fontFamily: mono, marginBottom: 16 }}>
                  {fmtBRL((osAtual.valor_total || 0))}
                </div>
                <Campo label="Forma de pagamento *">
                  <select value={fatForma} onChange={e => setFatForma(e.target.value)} style={sel(true)}>
                    <option value="">Selecione...</option>
                    {formasPag.map(f => <option key={f.id} value={f.id}>{f.descricao}</option>)}
                  </select>
                </Campo>
                <Campo label="Condição de pagamento">
                  <select value={fatCond} onChange={e => setFatCond(e.target.value)} style={sel(true)}>
                    <option value="">À vista</option>
                    {condicoesPag.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                  </select>
                </Campo>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                  <button onClick={() => setModalFaturar(false)} style={btnGhost()}>Cancelar</button>
                  <button onClick={() => confirmarFaturamento()} disabled={saving} style={{ ...btnPrimary(), background: C.success, opacity: saving ? 0.6 : 1 }}>
                    <DollarSign size={14} /> {saving ? "Faturando..." : "Confirmar Faturamento"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ModalAprovacao
          aberto={fatAprov.aberto}
          titulo="Liberar crédito acima do limite"
          mensagem={fatAprov.mensagem}
          modulo="os"
          acao="CREDITO_LIBERADO"
          contexto={{ id_os: osAtual?.id }}
          solicitante={usuario.id}
          idEmpresa={osAtual?.id_empresa}
          tipo="CREDITO"
          origem="OS"
          idOrigem={osAtual?.id}
          numeroOrigem={osAtual?.numero}
          descricao={`OS ${osAtual?.numero || ""} — ${fatAprov.mensagem || "crédito acima do limite do cliente"}`}
          onAprovado={(aprovador) => { setFatAprov({ aberto: false, mensagem: "" }); confirmarFaturamento(true, aprovador?.id); }}
          onCancelar={() => setFatAprov({ aberto: false, mensagem: "" })}
        />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* ─── VIEW: LISTA ────────────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      {ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ordens de Serviço</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {lista.length} · {usuario.nome}</p>
        </div>
        {perms.incluir ? (
          <button onClick={() => { setForm({ ...OS_VAZIA(), id_empresa: getEmpresaAtiva() }); setErroForm(""); setView("form"); }} style={btnPrimary()}>
            <Plus size={16} /> Nova OS
          </button>
        ) : (
          <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Sem permissão</span>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nº da OS ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}>
          <option value="">Todos os status</option>
          <option value="ABERTA">Aberta</option>
          <option value="EM_EXECUCAO">Em execução</option>
          <option value="FATURADA">Faturada</option>
        </select>
      </div>

      {/* Erro */}
      {erro && <Aviso cor="destructive"><AlertCircle size={16} /> {erro}</Aviso>}

      {/* Tabela */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}>
            <Wrench size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma OS encontrada.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead><tr>
                {["OS", "Cliente", "Veículo", "Status", "Entrada", "Serviços", "Total", ""].map((h, i) => (
                  <th key={i} style={th(i >= 5)}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.map((os) => (
                  <tr key={os.id} onClick={() => abrirDetalhe(os)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <td style={td()}>
                      <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 14, color: C.primary }}>{os.numero}</span>
                    </td>
                    <td style={{ ...td(), fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nomeCliente(os.id_cliente)}
                    </td>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{os.id_veiculo ? nomeVeiculo(os.id_veiculo) : "—"}</td>
                    <td style={td()}><Badge texto={os.status} cor={STATUS_CORES[os.status]} /></td>
                    <td style={{ ...td(), color: C.muted }}>{os.data_entrada ? new Date(os.data_entrada).toLocaleDateString("pt-BR") : "—"}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(os.valor_servicos)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(os.valor_total)}</td>
                    <td style={td()}>
                      <button onClick={(e) => { e.stopPropagation(); abrirDetalhe(os); }} style={btnIcon()}><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── MODAL REGISTRAR VENDA PERDIDA ────────────────────── */}
        {modalVendaPerdida && (
          <div onClick={() => setModalVendaPerdida(null)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Registrar venda perdida</span>
                <button onClick={() => setModalVendaPerdida(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Produto</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{modalVendaPerdida.nome_produto}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Quantidade *</label>
                  <input value={modalVendaPerdida.quantidade} onChange={e => setModalVendaPerdida(m => ({ ...m, quantidade: e.target.value }))} inputMode="decimal" placeholder="Ex: 2" style={{ ...inp(), width: "100%", fontFamily: mono }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Motivo *</label>
                  <select value={modalVendaPerdida.motivo} onChange={e => setModalVendaPerdida(m => ({ ...m, motivo: e.target.value }))} style={{ ...sel(), width: "100%" }}>
                    <option value="">Selecione...</option>
                    <option value="SEM_ESTOQUE">Sem estoque</option>
                    <option value="PRECO_ALTO">Preço alto</option>
                    <option value="PRAZO_ENTREGA">Prazo de entrega</option>
                    <option value="CONCORRENTE">Concorrente</option>
                    <option value="CLIENTE_DESISTIU">Cliente desistiu</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Concorrente (opcional)</label>
                  <input value={modalVendaPerdida.concorrente} onChange={e => setModalVendaPerdida(m => ({ ...m, concorrente: e.target.value }))} placeholder="Ex: Concorrente X" style={{ ...inp(), width: "100%" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Observação (opcional)</label>
                  <textarea value={modalVendaPerdida.observacao} onChange={e => setModalVendaPerdida(m => ({ ...m, observacao: e.target.value }))} placeholder="Detalhes..." style={{ ...inp(), width: "100%", minHeight: 60, fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setModalVendaPerdida(null)} style={btnGhost()}>Cancelar</button>
                  <button onClick={registrarVendaPerdida} disabled={salvandoVendaPerdida} style={{ ...btnPrimary(), opacity: salvandoVendaPerdida ? 0.6 : 1 }}>
                    {salvandoVendaPerdida ? "Registrando..." : "Registrar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
