import { useState, useEffect } from "react";
import {
  Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle,
  Lock, Wrench, Play, Square, Clock, User, Package, FileText, ChevronDown, ChevronUp, Trash2,
  DollarSign, Send, Eye,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton } from "../ui";


const STATUS_CORES = {
  ABERTA: "ABERTA", EM_EXECUCAO: "ATIVO", FATURADA: "FATURADA", CANCELADA: "CANCELADA",
};

const OS_VAZIA = () => ({
  id: null, numero: "", id_empresa: "", id_cliente: "", id_veiculo: "", id_tipo_os: "",
  id_usuario_abertura: "", id_usuario_responsavel: "", status: "ABERTA",
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
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");

  // detalhe
  const [osAtual, setOsAtual] = useState(null);
  const [osServicos, setOsServicos] = useState([]);
  const [osPecas, setOsPecas] = useState([]);
  const [osApontamentos, setOsApontamentos] = useState([]);
  const [abaDetalhe, setAbaDetalhe] = useState("servicos");
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // defeitos
  const [osDefeitos, setOsDefeitos] = useState([]);
  const [addDefeito, setAddDefeito] = useState(false);
  const [formDefeito, setFormDefeito] = useState("");

  // servico inline
  const [addServico, setAddServico] = useState(false);
  const [formServ, setFormServ] = useState({ id_servico: "", descricao: "", quantidade: 1, valor_unitario: "", id_tecnico: "", id_area: "" });
  const [areas, setAreas] = useState([]);

  // apontamento
  const [apontando, setApontando] = useState(null); // id_servico_os sendo apontado

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  /* ─── Carregar dados iniciais ────────────────────────────────── */
  useEffect(() => {
    let ok = true;
    rpc("os_dados")
      .then((d) => {
        if (!ok) return;
        setLista(Array.isArray(d.ordens_servico) ? d.ordens_servico : []);
        setClientes(Array.isArray(d.clientes) ? d.clientes : []);
        setTiposOs(Array.isArray(d.tipos_os) ? d.tipos_os : []);
        setVeiculos(Array.isArray(d.veiculos) ? d.veiculos : []);
        setUsuarios(Array.isArray(d.usuarios) ? d.usuarios : []);
        setServicos(Array.isArray(d.servicos) ? d.servicos : []);
        setAreas(Array.isArray(d.grupos_servico) ? d.grupos_servico : []);
      })
      .catch((e) => setErro(e.message))
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  /* ─── Carregar detalhe de uma OS ─────────────────────────────── */
  async function abrirDetalhe(os) {
    setOsAtual(os);
    setAbaDetalhe("defeitos");
    setLoadingDetalhe(true);
    setView("detalhe");
    try {
      const d = await rpc("os_detalhe_dados", { p_id_os: os.id });
      setOsServicos(Array.isArray(d.servicos) ? d.servicos : []);
      setOsPecas(Array.isArray(d.pecas) ? d.pecas : []);
      setOsApontamentos(Array.isArray(d.apontamentos) ? d.apontamentos : []);
      setExpedicoesOs(Array.isArray(d.expedicoes) ? d.expedicoes : []);
      setOsDefeitos(Array.isArray(d.defeitos) ? d.defeitos : []);
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

  /* ─── Salvar OS (criar / editar) ─────────────────────────────── */
  async function salvarOS() {
    if (!form.id_cliente) { setErroForm("Selecione o cliente."); return; }
    setErroForm(""); setSaving(true);
    try {
      const saved = await rpc("os_salvar", {
        p_id: form.id || null,
        p_numero: form.numero || proximoNumero(),
        p_id_empresa: num(form.id_empresa) || 1,
        p_id_cliente: num(form.id_cliente),
        p_id_veiculo: num(form.id_veiculo) || null,
        p_id_tipo_os: num(form.id_tipo_os) || null,
        p_id_usuario_abertura: num(form.id_usuario_abertura) || null,
        p_id_usuario_responsavel: num(form.id_usuario_responsavel) || null,
        p_status: form.status || "ABERTA",
        p_data_prevista: form.data_prevista || null,
        p_km_entrada: num(form.km_entrada) || null,
        p_defeito_relatado: form.defeito_relatado || null,
        p_observacao_interna: form.observacao_interna || null,
      });
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
    if (!formServ.id_area) { notificar("Selecione a área/setor do serviço.", "erro"); return; }
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
      setFormServ({ id_servico: "", descricao: "", quantidade: 1, valor_unitario: "", id_tecnico: "", id_area: "" });
      setAddServico(false);
      // Recarregar OS para atualizar totais
      const osAtualizada = await rpc("os_recarregar", { p_id_os: osAtual.id });
      if (osAtualizada) setOsAtual(osAtualizada);
      notificar("Serviço adicionado.");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  /* ─── Defeitos ──────────────────────────────────────────── */
  async function adicionarDefeito() {
    if (!formDefeito.trim()) { notificar("Descrição do defeito é obrigatória.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("os_defeito_salvar", { p_id_os: osAtual.id, p_descricao: formDefeito.trim() });
      setOsDefeitos((l) => [...l, res]);
      setFormDefeito(""); setAddDefeito(false);
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

  /* ─── Solicitar peça (envia para Separação) ─────────────── */
  const [modalPeca, setModalPeca] = useState(false);
  const [formPeca, setFormPeca] = useState({ id_produto: "", quantidade: 1, consumo: false, id_producao: "" });
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [expedicoesOs, setExpedicoesOs] = useState([]);

  async function carregarProdutos() {
    if (produtos.length > 0) return;
    setLoadingProdutos(true);
    try {
      const p = await rpc("os_produtos_dados");
      setProdutos(Array.isArray(p) ? p : []);
    } catch (e) { /* ignore */ }
    finally { setLoadingProdutos(false); }
  }

  async function recarregarDetalheOs(idOs) {
    try {
      const d = await rpc("os_detalhe_dados", { p_id_os: idOs });
      setExpedicoesOs(Array.isArray(d.expedicoes) ? d.expedicoes : []);
      setOsPecas(Array.isArray(d.pecas) ? d.pecas : []);
      return d;
    } catch (e) { /* ignore */ }
  }

  async function solicitarPeca() {
    if (!formPeca.id_produto) { notificar("Selecione um produto.", "erro"); return; }
    setSaving(true);
    try {
      const prod = produtos.find(p => p.id === num(formPeca.id_produto));
      const res = await rpc("os_solicitar_peca", {
        p_id_os: osAtual.id,
        p_id_produto: num(formPeca.id_produto),
        p_quantidade: num(formPeca.quantidade) || 1,
        p_valor_unitario: prod ? prod.preco_venda : 0,
        p_id_usuario: usuario.id,
        p_consumo: !!formPeca.consumo,
        p_id_producao: num(formPeca.id_producao) || null,
      });
      setFormPeca({ id_produto: "", quantidade: 1, consumo: false, id_producao: "" });
      setModalPeca(false);
      await recarregarDetalheOs(osAtual.id);
      notificar(formPeca.consumo ? `Consumo solicitado → Separação ${res.numero}` : `Peça solicitada → Separação ${res.numero}`);
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
  const [formasPag, setFormasPag] = useState([]);
  const [condicoesPag, setCondicoesPag] = useState([]);
  const [fatForma, setFatForma] = useState("");
  const [fatCond, setFatCond] = useState("");

  async function abrirFaturamento() {
    try {
      const d = await rpc("os_faturamento_dados");
      setFormasPag(Array.isArray(d.formas_pagamento) ? d.formas_pagamento : []);
      setCondicoesPag(Array.isArray(d.condicoes_pagamento) ? d.condicoes_pagamento : []);
      setFatForma(""); setFatCond("");
      setModalFaturar(true);
    } catch (e) {
      notificar("Erro ao carregar dados: " + e.message, "erro");
    }
  }

  async function confirmarFaturamento(libCredito = false) {
    if (!fatForma) { notificar("Selecione a forma de pagamento.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("os_faturar", { p: {
        id_os: osAtual.id, id_forma_pagamento: num(fatForma),
        id_condicao_pagamento: num(fatCond) || null, _ator: usuario.id,
        _lib_credito: libCredito,
      }});
      if (res?.ok === false) {
        if (res.credito?.permite_liberacao && perms.aprovar && !libCredito) {
          setSaving(false);
          if (window.confirm(res.msg + "\n\nVocê tem permissão de aprovação. Liberar o crédito e faturar mesmo assim?")) { confirmarFaturamento(true); }
          return;
        }
        notificar(res.msg, "erro"); setSaving(false); return;
      }
      setModalFaturar(false);
      const osAtualizada = await rpc("os_recarregar", { p_id_os: osAtual.id });
      if (osAtualizada) { setOsAtual(osAtualizada); setLista(l => l.map(o => o.id === osAtualizada.id ? osAtualizada : o)); }
      notificar("OS faturada com sucesso!");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
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
    // Calcular horas trabalhadas
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
  const filtrados = lista.filter((o) => {
    const q = busca.trim().toLowerCase();
    const okBusca = !q || (o.numero || "").toLowerCase().includes(q) || nomeCliente(o.id_cliente).toLowerCase().includes(q);
    const okStatus = !fStatus || o.status === fStatus;
    return okBusca && okStatus && !o.cancelada;
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
          <Campo label="Cliente *" span={2}>
            <select value={form.id_cliente} onChange={(e) => setF("id_cliente", e.target.value)} style={sel(true)}>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Veículo">
            <select value={form.id_veiculo} onChange={(e) => setF("id_veiculo", e.target.value)} style={sel(true)}>
              <option value="">Nenhum</option>
              {veicCliente.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
            </select>
          </Campo>
          <Campo label="Responsável">
            <select value={form.id_usuario_responsavel} onChange={(e) => setF("id_usuario_responsavel", e.target.value)} style={sel(true)}>
              <option value="">Selecione...</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
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
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {perms.aprovar && osAtual.status !== "FATURADA" && !osAtual.cancelada && osServicos.length > 0 && (
              <button onClick={abrirAvaliacao} style={btnGhost()}>
                <CheckCircle2 size={14} /> Avaliar
              </button>
            )}
            {perms.aprovar && osAtual.status !== "FATURADA" && !osAtual.cancelada && (
              <button onClick={abrirFaturamento} style={{ ...btnPrimary(), background: C.success }}>
                <DollarSign size={14} /> Faturar OS
              </button>
            )}
            {perms.editar && osAtual.status !== "FATURADA" && (
              <button onClick={() => { setForm({ ...OS_VAZIA(), ...osAtual }); setView("form"); }} style={btnGhost()}>
                <Pencil size={14} /> Editar
              </button>
            )}
          </div>
        </div>

        {/* Painel: Cliente / Veículo / Responsável */}
        <div style={{ display: "grid", gridTemplateColumns: veic ? "2fr 2fr 1fr" : "3fr 1fr", gap: 12, margin: "12px 0" }}>
          {/* Cliente */}
          <div style={cardStyle()}>
            <div style={{ ...infoLabel, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}><User size={12} /> Cliente</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{cli.nome || "—"}</div>
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
                  {perms.editar && osAtual.status !== "FATURADA" && !osAtual.cancelada && (
                    <button onClick={() => setAddDefeito(!addDefeito)} style={btnPrimary()}>
                      <Plus size={14} /> Adicionar defeito
                    </button>
                  )}
                </div>

                {addDefeito && (
                  <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14, display: "flex", gap: 10, alignItems: "end" }}>
                    <Campo label="Descrição do defeito *" span={1}>
                      <input value={formDefeito} onChange={(e) => setFormDefeito(e.target.value)} placeholder="Ex: Vazamento de óleo no motor" style={{ ...inp(true), width: "100%", minWidth: 300 }}
                        onKeyDown={(e) => { if (e.key === "Enter") adicionarDefeito(); }} />
                    </Campo>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={adicionarDefeito} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                      <button onClick={() => setAddDefeito(false)} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
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
                        {perms.editar && osAtual.status !== "FATURADA" && !osAtual.cancelada && (
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
                    <button onClick={() => setAddServico(!addServico)} style={btnPrimary()}>
                      <Plus size={14} /> Adicionar serviço
                    </button>
                  )}
                </div>

                {/* Form inline para adicionar serviço */}
                {addServico && (
                  <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  {areas.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6 }}>Área / Setor *</span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {areas.map((a) => {
                          const on = String(formServ.id_area) === String(a.id);
                          return (
                            <div key={a.id} onClick={() => setFormServ((f) => ({ ...f, id_area: on ? "" : String(a.id) }))} style={{
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
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                    <Campo label="Descrição do serviço *">
                      <input value={formServ.descricao} onChange={(e) => setFormServ((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Trocar farol dianteiro" style={inp(true)} />
                    </Campo>
                    <Campo label="Qtd">
                      <input value={formServ.quantidade} onChange={(e) => setFormServ((f) => ({ ...f, quantidade: e.target.value }))} inputMode="numeric" style={inp(true)} />
                    </Campo>
                    <Campo label="Valor unit.">
                      <input value={formServ.valor_unitario} onChange={(e) => setFormServ((f) => ({ ...f, valor_unitario: e.target.value }))} inputMode="decimal" style={inp(true)} />
                    </Campo>
                    <Campo label="Técnico">
                      <select value={formServ.id_tecnico} onChange={(e) => setFormServ((f) => ({ ...f, id_tecnico: e.target.value }))} style={sel(true)}>
                        <option value="">—</option>
                        {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </Campo>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={adicionarServico} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                      <button onClick={() => setAddServico(false)} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
                    </div>
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
                  {perms.editar && osAtual.status !== "FATURADA" && !osAtual.cancelada && (
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
                      {["Descrição", "Referência", "Qtd", "Valor Unit.", "Total", ""].map((h, i) => (
                        <th key={i} style={th(i >= 2 && i <= 4)}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {osPecas.map((p) => {
                        const aptAbertoProd = p.produzido ? osApontamentos.find((a) => a.id_os_peca === p.id && !a.hora_termino) : null;
                        return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, opacity: p.consumo ? 0.85 : 1 }}>
                          <td style={{ ...td(), fontWeight: 500 }}>
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
                                  <button onClick={() => finalizarApontamento(aptAbertoProd)} style={{ ...btnIcon(), background: C.destructiveBg, color: C.destructive, border: `1px solid ${C.destructive}30` }} title="Finalizar apontamento">
                                    <Square size={14} />
                                  </button>
                                ) : (
                                  <button onClick={() => iniciarApontamentoProducao(p.id)} style={{ ...btnIcon(), background: C.successBg, color: C.success, border: `1px solid ${C.success}30` }} title="Iniciar apontamento">
                                    <Play size={14} />
                                  </button>
                                )}
                                {perms.aprovar && (
                                  <button onClick={() => concluirProducao(p.id)} style={{ ...btnIcon(), color: C.primary, borderColor: C.primary }} title="Concluir produção">
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
                      {["Data", "Colaborador", "Serviço", "Início", "Término", "Horas", ""].map((h, i) => (
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
                            <td style={td()}>
                              {emAberto ? (
                                <button onClick={() => finalizarApontamento(apt)} style={{ ...btnIcon(), background: C.destructiveBg, color: C.destructive, border: `1px solid ${C.destructive}30` }} title="Finalizar">
                                  <Square size={14} />
                                </button>
                              ) : (
                                <button onClick={() => excluirApontamento(apt.id)} style={{ ...btnIcon(), color: C.muted }} title="Excluir">
                                  <Trash2 size={13} />
                                </button>
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
          <div onClick={() => setModalPeca(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Solicitar Peça para Separação</span>
                <button onClick={() => setModalPeca(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
              </div>
              <div style={{ padding: 20 }}>
                {loadingProdutos ? <div style={{ textAlign: "center", padding: 20, color: C.textMuted }}>Carregando produtos...</div> : (
                  <>
                    <Campo label="Produto *">
                      <select value={formPeca.id_produto} onChange={e => setFormPeca(f => ({ ...f, id_produto: e.target.value }))} style={sel(true)}>
                        <option value="">Selecione...</option>
                        {produtos.map(p => <option key={p.id} value={p.id}>{p.referencia ? `${p.referencia} — ` : ""}{p.nome}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Quantidade">
                      <input value={formPeca.quantidade} onChange={e => setFormPeca(f => ({ ...f, quantidade: e.target.value }))} inputMode="numeric" style={inp(true)} />
                    </Campo>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" checked={!!formPeca.consumo} onChange={e => setFormPeca(f => ({ ...f, consumo: e.target.checked }))} />
                      <span><b>Item de consumo</b> — entra no custo da OS, não é cobrado do cliente</span>
                    </label>
                    {formPeca.consumo && osPecas.filter(x => x.produzido && x.status !== "CONCLUIDO").length > 0 && (
                      <Campo label="Vincular à produção (opcional)">
                        <select value={formPeca.id_producao} onChange={e => setFormPeca(f => ({ ...f, id_producao: e.target.value }))} style={sel(true)}>
                          <option value="">— consumo geral da OS —</option>
                          {osPecas.filter(x => x.produzido && x.status !== "CONCLUIDO").map(x => <option key={x.id} value={x.id}>{x.descricao}</option>)}
                        </select>
                      </Campo>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                      <button onClick={() => setModalPeca(false)} style={btnGhost()}>Cancelar</button>
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
          <button onClick={() => { setForm(OS_VAZIA()); setErroForm(""); setView("form"); }} style={btnPrimary()}>
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
      </div>
    </>
  );
}
