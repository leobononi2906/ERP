import { useState, useEffect } from "react";
import {
  Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle,
  Lock, Wrench, Play, Square, Clock, User, Package, FileText, ChevronDown, ChevronUp, Trash2,
  DollarSign, Send, Eye,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc, SUPA_URL, SUPA_KEY } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton } from "../ui";

/* ─── Helpers Supabase REST direto ─────────────────────────────── */
const hdrs = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const schema = "Teste ERP";
const schemaHdr = { ...hdrs, "Accept-Profile": schema, "Content-Profile": schema };

async function sbQ(table, qs = "") {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, { headers: { ...schemaHdr, Range: "0-9999" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function sbInsert(table, row) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, { method: "POST", headers: schemaHdr, body: JSON.stringify(row) });
  if (!r.ok) { const t = await r.text(); throw new Error(t); }
  return r.json();
}
async function sbUpdate(table, id, row) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: schemaHdr, body: JSON.stringify(row) });
  if (!r.ok) { const t = await r.text(); throw new Error(t); }
  return r.json();
}
async function sbDelete(table, id) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: schemaHdr });
  if (!r.ok) throw new Error(`${r.status}`);
}


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

  // servico inline
  const [addServico, setAddServico] = useState(false);
  const [formServ, setFormServ] = useState({ id_servico: "", descricao: "", quantidade: 1, valor_unitario: "", id_tecnico: "" });

  // apontamento
  const [apontando, setApontando] = useState(null); // id_servico_os sendo apontado

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  /* ─── Carregar dados iniciais ────────────────────────────────── */
  useEffect(() => {
    let ok = true;
    Promise.all([
      sbQ("ordens_servico", "order=data_entrada.desc"),
      sbQ("clientes", "select=id,nome,cpf_cnpj&order=nome"),
      sbQ("tipos_os", "ativo=eq.true&order=descricao"),
      sbQ("veiculos", "select=id,placa,id_cliente&ativo=eq.true&order=placa"),
      sbQ("usuarios", "select=id,nome&order=nome"),
      sbQ("servicos", "select=id,codigo,nome,preco&situacao=eq.ATIVO&order=nome"),
    ])
      .then(([os, cli, tip, veic, usr, serv]) => {
        if (!ok) return;
        setLista(Array.isArray(os) ? os : []);
        setClientes(Array.isArray(cli) ? cli : []);
        setTiposOs(Array.isArray(tip) ? tip : []);
        setVeiculos(Array.isArray(veic) ? veic : []);
        setUsuarios(Array.isArray(usr) ? usr : []);
        setServicos(Array.isArray(serv) ? serv : []);
      })
      .catch((e) => setErro(e.message))
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  /* ─── Carregar detalhe de uma OS ─────────────────────────────── */
  async function abrirDetalhe(os) {
    setOsAtual(os);
    setAbaDetalhe("servicos");
    setLoadingDetalhe(true);
    setView("detalhe");
    try {
      const [servs, pecas, apts, exps] = await Promise.all([
        sbQ("os_servicos", `id_os=eq.${os.id}&order=id`),
        sbQ("os_pecas", `id_os=eq.${os.id}&order=id`),
        sbQ("os_apontamentos", `id_os=eq.${os.id}&order=data_apontamento.desc,hora_inicio.desc`),
        sbQ("expedicoes", `id_os=eq.${os.id}&order=criado_em.desc`),
      ]);
      setOsServicos(Array.isArray(servs) ? servs : []);
      setOsPecas(Array.isArray(pecas) ? pecas : []);
      setOsApontamentos(Array.isArray(apts) ? apts : []);
      setExpedicoesOs(Array.isArray(exps) ? exps : []);
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
    if (!form.id_tipo_os) { setErroForm("Selecione o Tipo de OS."); return; }
    if (!form.id_cliente) { setErroForm("Selecione o cliente."); return; }
    setErroForm(""); setSaving(true);
    const payload = {
      numero: form.numero || proximoNumero(),
      id_empresa: num(form.id_empresa) || 1,
      id_cliente: num(form.id_cliente),
      id_veiculo: num(form.id_veiculo) || null,
      id_tipo_os: num(form.id_tipo_os) || null,
      id_usuario_abertura: num(form.id_usuario_abertura) || null,
      id_usuario_responsavel: num(form.id_usuario_responsavel) || null,
      status: form.status || "ABERTA",
      data_prevista: form.data_prevista || null,
      km_entrada: num(form.km_entrada) || null,
      defeito_relatado: form.defeito_relatado || null,
      observacao_interna: form.observacao_interna || null,
    };
    try {
      let res;
      if (form.id) {
        res = await sbUpdate("ordens_servico", form.id, payload);
      } else {
        res = await sbInsert("ordens_servico", payload);
      }
      const saved = Array.isArray(res) ? res[0] : res;
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
      });
      setOsServicos((l) => [...l, res]);
      setFormServ({ id_servico: "", descricao: "", quantidade: 1, valor_unitario: "", id_tecnico: "" });
      setAddServico(false);
      // Recarregar OS para atualizar totais
      const osAtualizada = await sbQ("ordens_servico", `id=eq.${osAtual.id}`);
      if (osAtualizada[0]) setOsAtual(osAtualizada[0]);
      notificar("Serviço adicionado.");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  /* ─── Solicitar peça (envia para Separação) ─────────────── */
  const [modalPeca, setModalPeca] = useState(false);
  const [formPeca, setFormPeca] = useState({ id_produto: "", quantidade: 1 });
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [expedicoesOs, setExpedicoesOs] = useState([]);

  async function carregarProdutos() {
    if (produtos.length > 0) return;
    setLoadingProdutos(true);
    try {
      const p = await sbQ("produtos", "select=id,referencia,nome,preco_venda&situacao=eq.ATIVO&order=nome");
      setProdutos(Array.isArray(p) ? p : []);
    } catch (e) { /* ignore */ }
    finally { setLoadingProdutos(false); }
  }

  async function carregarExpedicoesOs(idOs) {
    try {
      const exp = await sbQ("expedicoes", `id_os=eq.${idOs}&order=criado_em.desc`);
      setExpedicoesOs(Array.isArray(exp) ? exp : []);
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
      });
      setFormPeca({ id_produto: "", quantidade: 1 });
      setModalPeca(false);
      await carregarExpedicoesOs(osAtual.id);
      notificar(`Peça solicitada → Separação ${res.numero}`);
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
      const [fp, cp] = await Promise.all([
        sbQ("formas_pagamento", "ativo=eq.true&order=descricao"),
        sbQ("condicoes_pagamento", "ativo=eq.true&order=descricao"),
      ]);
      setFormasPag(Array.isArray(fp) ? fp : []);
      setCondicoesPag(Array.isArray(cp) ? cp : []);
      setFatForma(""); setFatCond("");
      setModalFaturar(true);
    } catch (e) {
      notificar("Erro ao carregar dados: " + e.message, "erro");
    }
  }

  async function confirmarFaturamento() {
    if (!fatForma) { notificar("Selecione a forma de pagamento.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("os_faturar", { p_id_os: osAtual.id, p_id_forma_pagamento: num(fatForma), p_id_condicao_pagamento: num(fatCond) || null });
      setModalFaturar(false);
      const osAtualizada = await sbQ("ordens_servico", `id=eq.${osAtual.id}`);
      if (osAtualizada[0]) { setOsAtual(osAtualizada[0]); setLista(l => l.map(o => o.id === osAtualizada[0].id ? osAtualizada[0] : o)); }
      notificar("OS faturada com sucesso!");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  /* ─── Apontamento: iniciar / finalizar ───────────────────────── */
  async function iniciarApontamento(idServicoOs) {
    const agora = new Date();
    const horaStr = agora.toTimeString().slice(0, 8);
    try {
      const res = await sbInsert("os_apontamentos", {
        id_os: osAtual.id,
        id_servico_os: idServicoOs,
        id_colaborador: usuario.id,
        data_apontamento: agora.toISOString().slice(0, 10),
        hora_inicio: horaStr,
        horas_trabalhadas: 0,
        fator: 0,
      });
      const saved = Array.isArray(res) ? res[0] : res;
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
    const [hi, mi, si] = apt.hora_inicio.split(":").map(Number);
    const [hf, mf, sf] = horaStr.split(":").map(Number);
    const diffMin = (hf * 60 + mf) - (hi * 60 + mi);
    const horas = Math.max(0, +(diffMin / 60).toFixed(2));
    try {
      const res = await sbUpdate("os_apontamentos", apt.id, {
        hora_termino: horaStr,
        horas_trabalhadas: horas,
        fator: horas,
      });
      const saved = Array.isArray(res) ? res[0] : res;
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
      await sbDelete("os_apontamentos", id);
      setOsApontamentos((l) => l.filter((a) => a.id !== id));
      notificar("Apontamento removido.");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    }
  }

  /* ─── Helpers de nome ────────────────────────────────────────── */
  const nomeCliente = (id) => (clientes.find((c) => c.id === id) || {}).nome || "—";
  const nomeTecnico = (id) => (usuarios.find((u) => u.id === id) || {}).nome || "—";
  const nomeVeiculo = (id) => (veiculos.find((v) => v.id === id) || {}).placa || "—";

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

        {/* Tipo de OS — cards clicáveis */}
        <div style={{ ...cardStyle(), marginBottom: 16, padding: 16 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: 10 }}>Tipo de OS *</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {tiposOs.map((t) => {
              const sel2 = String(form.id_tipo_os) === String(t.id);
              return (
                <div key={t.id} onClick={() => setF("id_tipo_os", String(t.id))} style={{
                  padding: "12px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  border: sel2 ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                  background: sel2 ? "rgba(0,170,238,0.08)" : "#fff",
                  color: sel2 ? C.primary : C.foreground,
                  transition: "all 0.15s",
                }}>
                  <Wrench size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {t.descricao}
                </div>
              );
            })}
          </div>
        </div>

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
          <Campo label="Defeito relatado" span={2}>
            <textarea value={form.defeito_relatado} onChange={(e) => setF("defeito_relatado", e.target.value)} rows={3} style={{ ...inp(true), height: "auto", resize: "vertical" }} />
          </Campo>
          <Campo label="Observação interna" span={3}>
            <textarea value={form.observacao_interna} onChange={(e) => setF("observacao_interna", e.target.value)} rows={2} style={{ ...inp(true), height: "auto", resize: "vertical" }} />
          </Campo>
        </Secao>

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
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
              {nomeCliente(osAtual.id_cliente)} · {osAtual.id_veiculo ? nomeVeiculo(osAtual.id_veiculo) : "sem veículo"}
            </p>
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

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "16px 0" }}>
          {[
            { label: "Serviços", valor: fmtBRL(totalServicos), icone: Wrench },
            { label: "Peças", valor: fmtBRL(totalPecas), icone: Package },
            { label: "Total", valor: fmtBRL(totalServicos + totalPecas), icone: FileText },
            { label: "Apontamentos", valor: `${osApontamentos.length}`, icone: Clock },
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
                  <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
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
                )}

                {osServicos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}>
                    <Wrench size={28} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 8, fontSize: 13 }}>Nenhum serviço adicionado ainda.</div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>
                      {["#", "Descrição", "Técnico", "Qtd", "Valor Unit.", "Total", "Status", "Apontar"].map((h, i) => (
                        <th key={i} style={th(i >= 3 && i <= 5)}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {osServicos.map((sv, i) => {
                        const aptAberto = osApontamentos.find((a) => a.id_servico_os === sv.id && !a.hora_termino);
                        return (
                          <tr key={sv.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={td()}>{i + 1}</td>
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
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Peças da OS</span>
                  {perms.editar && osAtual.status !== "FATURADA" && !osAtual.cancelada && (
                    <button onClick={() => { carregarProdutos(); setModalPeca(true); }} style={btnPrimary()}>
                      <Send size={14} /> Solicitar Peça
                    </button>
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
                      {["Descrição", "Referência", "Qtd", "Valor Unit.", "Total"].map((h, i) => (
                        <th key={i} style={th(i >= 2)}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {osPecas.map((p) => (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ ...td(), fontWeight: 500 }}>{p.descricao}</td>
                          <td style={{ ...td(), color: C.muted, fontFamily: mono }}>{p.referencia || "—"}</td>
                          <td style={{ ...td(), textAlign: "right" }}>{p.quantidade}</td>
                          <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(p.valor_unitario)}</td>
                          <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(p.valor_total)}</td>
                        </tr>
                      ))}
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
                        const servDesc = (osServicos.find((s) => s.id === apt.id_servico_os) || {}).descricao || "—";
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
                  <button onClick={confirmarFaturamento} disabled={saving} style={{ ...btnPrimary(), background: C.success, opacity: saving ? 0.6 : 1 }}>
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
