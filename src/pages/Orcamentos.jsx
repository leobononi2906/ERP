import { useState, useEffect } from "react";
import {
  Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle,
  ShoppingCart, Package, Wrench, FileText, Trash2, Eye, ThumbsUp, ThumbsDown,
  ArrowRightCircle, Clock, Calendar,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc, SUPA_URL, SUPA_KEY } from "../config";
import {
  cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo,
  Aviso, Badge, Skeleton,
} from "../ui";

/* ─── helpers ──────────────────────────────────────────────────── */
const hdrs = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };
const schemaHdr = { ...hdrs, "Accept-Profile": "Teste ERP", "Content-Profile": "Teste ERP" };
async function sbQ(t, q = "") {
  const r = await fetch(`${SUPA_URL}/rest/v1/${t}?${q}`, { headers: { ...schemaHdr, Range: "0-9999" } });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}


const STATUS_BADGE = {
  ABERTO: [C.bluePale, C.blueMid],
  APROVADO: [C.successBg, C.success],
  REPROVADO: [C.destructiveBg, C.destructive],
  CONVERTIDO: ["#E8E0F8", "#6B3FA0"],
  VENCIDO: [C.warningBg, C.warning],
};

function StatusBadge({ status, validade }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const vencido = status === "ABERTO" && validade && validade < hoje;
  const s = vencido ? "VENCIDO" : status;
  const [bg, fg] = STATUS_BADGE[s] || [C.surface2, C.muted];
  return (
    <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 4 }}>
      {s}
    </span>
  );
}

const ITEM_VAZIO = { tipo: "PRODUTO", id_produto: "", id_servico: "", descricao: "", referencia: "", quantidade: 1, valor_unitario: "", percentual_desconto: 0 };

/* ═══════════════════════════════════════════════════════════════ */
export default function Orcamentos({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.orcamentos) || {};

  /* ─── state: dados ─────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [formasPag, setFormasPag] = useState([]);
  const [condPag, setCondPag] = useState([]);
  const [tabelasPreco, setTabelasPreco] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  /* ─── state: UI ────────────────────────────────────────────── */
  const [view, setView] = useState("lista"); // lista | form | detalhe
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");

  /* ─── state: detalhe ───────────────────────────────────────── */
  const [orcAtual, setOrcAtual] = useState(null);
  const [itens, setItens] = useState([]);
  const [loadDet, setLoadDet] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [formItem, setFormItem] = useState({ ...ITEM_VAZIO });

  /* ─── state: modais ────────────────────────────────────────── */
  const [reprovarOpen, setReprovarOpen] = useState(false);
  const [motivoRepr, setMotivoRepr] = useState("");

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };
  const nomeCliente = (id) => (clientes.find((c) => c.id === id) || {}).nome || "—";
  const nomeUsuario = (id) => (usuarios.find((u) => u.id === id) || {}).nome || "—";

  /* ─── carregar dados ───────────────────────────────────────── */
  async function carregar() {
    setLoading(true);
    try {
      const d = await rpc("orcamentos_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null });
      setLista(d.orcamentos ?? []);
      setClientes(d.clientes ?? []);
      setProdutos(d.produtos ?? []);
      setServicos(d.servicos ?? []);
      setUsuarios(d.usuarios ?? []);
      setFormasPag(d.formas_pagamento ?? []);
      setCondPag(d.condicoes_pagamento ?? []);
      setTabelasPreco(d.tabelas_preco ?? []);
      setEmpresas(d.empresas ?? []);
    } catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, [fEmpresa]);

  /* ─── abrir detalhe ────────────────────────────────────────── */
  async function abrirDetalhe(orc) {
    setOrcAtual(orc); setLoadDet(true); setView("detalhe"); setAddItem(false);
    try {
      const it = await sbQ("orcamentos_venda_itens", `id_orcamento=eq.${orc.id}&order=id`);
      setItens(Array.isArray(it) ? it : []);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoadDet(false); }
  }

  async function recarregarDetalhe(id) {
    const [orcs, it] = await Promise.all([
      sbQ("orcamentos_venda", `id=eq.${id}`),
      sbQ("orcamentos_venda_itens", `id_orcamento=eq.${id}&order=id`),
    ]);
    const atualizado = Array.isArray(orcs) ? orcs[0] : orcs;
    setOrcAtual(atualizado);
    setItens(Array.isArray(it) ? it : []);
    setLista((l) => l.map((x) => x.id === atualizado.id ? atualizado : x));
  }

  /* ─── defaults do cliente ──────────────────────────────────── */
  function aplicarDefaultsCliente(idCliente) {
    const cli = clientes.find((c) => c.id === Number(idCliente));
    if (!cli) return;
    setForm((f) => ({
      ...f,
      id_cliente: idCliente,
      id_vendedor: cli.id_vendedor || f.id_vendedor || "",
      id_condicao_pagamento: cli.id_condicao_pagamento || f.id_condicao_pagamento || "",
      id_tabela_preco: cli.id_tabela_preco || f.id_tabela_preco || "",
    }));
  }

  /* ─── salvar orçamento ─────────────────────────────────────── */
  async function salvar() {
    if (!form.id_cliente) { setErroForm("Selecione o cliente."); return; }
    if (!form.id_empresa) { setErroForm("Selecione a empresa."); return; }
    setErroForm(""); setSaving(true);
    try {
      const res = await rpc("orcamento_salvar", { p: { ...form, _ator: usuario.id } });
      if (res?.id) {
        setLista((l) => { const sem = l.filter((x) => x.id !== res.id); return [res, ...sem]; });
        notificar(form.id ? "Orçamento atualizado." : `Orçamento nº ${res.numero} criado.`);
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
        p_id_cliente: orcAtual?.id_cliente || null, p_id_produto: Number(idProduto),
        p_id_empresa: orcAtual?.id_empresa || null, p_id_tabela_preco: orcAtual?.id_tabela_preco || null,
      });
      if (r?.preco != null) {
        setFormItem((f) => ({ ...f, valor_unitario: r.preco }));
        setPrecoOrigem(r.origem === "CLIENTE_PRODUTO" ? "preço especial do cliente" : r.origem === "GERAL" ? "" : "tabela de preço");
      }
    } catch { /* mantém preço padrão */ }
  }

  /* ─── itens ────────────────────────────────────────────────── */
  async function lancarItem(libDesconto = false) {
    if (!formItem.descricao.trim()) { notificar("Descrição obrigatória.", "erro"); return; }
    const qty = num(formItem.quantidade) || 1;
    const vu = num(formItem.valor_unitario) || 0;
    const descP = num(formItem.percentual_desconto) || 0;
    const vDesc = Math.round(qty * vu * descP / 100 * 100) / 100;
    const vt = Math.round((qty * vu - vDesc) * 100) / 100;
    setSaving(true);
    try {
      await rpc("orcamento_lancar_item", { p: {
        id_orcamento: orcAtual.id, tipo: formItem.tipo,
        id_produto: formItem.tipo === "PRODUTO" ? formItem.id_produto || null : null,
        id_servico: formItem.tipo === "SERVICO" ? formItem.id_servico || null : null,
        descricao: formItem.descricao, referencia: formItem.referencia || null,
        quantidade: qty, valor_unitario: vu, percentual_desconto: descP,
        valor_desconto: vDesc, valor_total: vt, _ator: usuario.id,
        _lib_desconto: libDesconto,
      }});
      await recarregarDetalhe(orcAtual.id);
      setFormItem({ ...ITEM_VAZIO }); setAddItem(false); setPrecoOrigem("");
      notificar(libDesconto ? "Item adicionado com desconto liberado." : "Item adicionado.");
    } catch (e) {
      if (String(e.message).includes("DESCONTO_EXCEDIDO")) {
        const msg = String(e.message).split("|")[1] || "Desconto acima do permitido.";
        if (perms.aprovar) {
          setSaving(false);
          if (window.confirm(msg + "\n\nVocê tem permissão de aprovação. Liberar este desconto?")) { lancarItem(true); }
          return;
        }
        notificar(msg + " Peça liberação a um gestor.", "erro");
      } else notificar("Erro: " + e.message, "erro");
    }
    finally { setSaving(false); }
  }

  async function removerItem(idItem) {
    try {
      await rpc("orcamento_remover_item", { p: { id_item: idItem, _ator: usuario.id } });
      await recarregarDetalhe(orcAtual.id);
      notificar("Item removido.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  /* ─── ações de status ──────────────────────────────────────── */
  async function aprovar() {
    setSaving(true);
    try {
      const res = await rpc("orcamento_aprovar", { p: { id_orcamento: orcAtual.id, _ator: usuario.id } });
      if (res?.ok) { await recarregarDetalhe(orcAtual.id); notificar("Orçamento aprovado!"); }
      else notificar(res?.msg || "Erro", "erro");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function reprovar() {
    if (!motivoRepr.trim()) { notificar("Informe o motivo.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("orcamento_reprovar", { p: { id_orcamento: orcAtual.id, motivo: motivoRepr, _ator: usuario.id } });
      if (res?.ok) { await recarregarDetalhe(orcAtual.id); setReprovarOpen(false); setMotivoRepr(""); notificar("Orçamento reprovado."); }
      else notificar(res?.msg || "Erro", "erro");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function converter() {
    setSaving(true);
    try {
      const res = await rpc("orcamento_converter_venda", { p: { id_orcamento: orcAtual.id, _ator: usuario.id } });
      if (res?.ok) { await recarregarDetalhe(orcAtual.id); notificar(res.numero_sep ? `Convertido! Venda criada — produtos na Separação (${res.numero_sep}).` : `Convertido! Venda criada (ID ${res.id_venda}).`); }
      else notificar(res?.msg || "Erro", "erro");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── filtros ──────────────────────────────────────────────── */
  const filtrados = lista.filter((o) => {
    const q = busca.trim().toLowerCase();
    const okB = !q || (o.numero || "").includes(q) || nomeCliente(o.id_cliente).toLowerCase().includes(q);
    return okB && (!fStatus || o.status === fStatus);
  });

  /* ─── toast ────────────────────────────────────────────────── */
  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  /* ═══ FORMULÁRIO ═══════════════════════════════════════════════ */
  if (view === "form") {
    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.id ? `Editar Orçamento ${form.numero}` : "Novo Orçamento"}</h1>
        </div>
        {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}
        <Secao titulo="Dados do Orçamento">
          <Campo label="Empresa *">
            <select value={form.id_empresa || ""} onChange={(e) => setF("id_empresa", e.target.value)} style={sel(true)}>
              <option value="">Selecione...</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Cliente *" span={2}>
            <select value={form.id_cliente || ""} onChange={(e) => aplicarDefaultsCliente(e.target.value)} style={sel(true)}>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Vendedor">
            <select value={form.id_vendedor || ""} onChange={(e) => setF("id_vendedor", e.target.value)} style={sel(true)}>
              <option value="">—</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Tabela de Preço">
            <select value={form.id_tabela_preco || ""} onChange={(e) => setF("id_tabela_preco", e.target.value)} style={sel(true)}>
              <option value="">Padrão</option>
              {tabelasPreco.map((t) => <option key={t.id} value={t.id}>{t.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Validade">
            <input type="date" value={form.data_validade || ""} onChange={(e) => setF("data_validade", e.target.value)} style={inp(true)} />
          </Campo>
          <Campo label="Forma de Pagamento">
            <select value={form.id_forma_pagamento || ""} onChange={(e) => setF("id_forma_pagamento", e.target.value)} style={sel(true)}>
              <option value="">—</option>
              {formasPag.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Condição de Pagamento">
            <select value={form.id_condicao_pagamento || ""} onChange={(e) => setF("id_condicao_pagamento", e.target.value)} style={sel(true)}>
              <option value="">—</option>
              {condPag.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Observação" span={3}>
            <textarea value={form.observacao || ""} onChange={(e) => setF("observacao", e.target.value)} rows={2} style={{ ...inp(true), height: "auto", resize: "vertical" }} />
          </Campo>
        </Secao>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
            <Save size={16} /> {saving ? "Salvando..." : form.id ? "Salvar" : "Criar Orçamento"}
          </button>
        </div>
      </div>
    );
  }

  /* ═══ DETALHE ══════════════════════════════════════════════════ */
  if (view === "detalhe" && orcAtual) {
    const totalProd = itens.filter((i) => i.tipo === "PRODUTO").reduce((s, i) => s + (num(i.valor_total) || 0), 0);
    const totalServ = itens.filter((i) => i.tipo === "SERVICO").reduce((s, i) => s + (num(i.valor_total) || 0), 0);
    const podeEditar = ["ABERTO"].includes(orcAtual.status) && perms.editar;
    const podeAprovar = orcAtual.status === "ABERTO" && perms.aprovar;
    const podeReprovar = ["ABERTO", "APROVADO"].includes(orcAtual.status) && perms.aprovar;
    const podeConverter = ["ABERTO", "APROVADO"].includes(orcAtual.status) && perms.aprovar && itens.length > 0;

    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <button onClick={() => { setView("lista"); carregar(); }} style={btnIcon()}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Orçamento {orcAtual.numero}</h1>
              <StatusBadge status={orcAtual.status} validade={orcAtual.data_validade} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
              {nomeCliente(orcAtual.id_cliente)}
              {orcAtual.id_vendedor ? ` · Vendedor: ${nomeUsuario(orcAtual.id_vendedor)}` : ""}
              {orcAtual.data_validade ? ` · Validade: ${new Date(orcAtual.data_validade + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {podeEditar && <button onClick={() => { setForm({ ...orcAtual }); setErroForm(""); setView("form"); }} style={btnGhost()}><Pencil size={14} /> Editar</button>}
            {podeAprovar && <button onClick={aprovar} disabled={saving} style={{ ...btnPrimary(), background: C.success }}><ThumbsUp size={14} /> Aprovar</button>}
            {podeReprovar && <button onClick={() => { setMotivoRepr(""); setReprovarOpen(true); }} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><ThumbsDown size={14} /> Reprovar</button>}
            {podeConverter && <button onClick={converter} disabled={saving} style={btnPrimary()}><ArrowRightCircle size={14} /> Converter em Venda</button>}
          </div>
        </div>

        {orcAtual.motivo_reprovacao && (
          <Aviso cor="destructive"><AlertCircle size={16} /> Reprovado: {orcAtual.motivo_reprovacao}</Aviso>
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "16px 0" }}>
          {[
            { label: "Produtos", valor: fmtBRL(totalProd), icone: Package },
            { label: "Serviços", valor: fmtBRL(totalServ), icone: Wrench },
            { label: "Total", valor: fmtBRL(num(orcAtual.valor_total)), icone: FileText },
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
            {podeEditar && <button onClick={() => setAddItem(!addItem)} style={btnPrimary()}><Plus size={14} /> Adicionar item</button>}
          </div>

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
                    <select value={formItem.id_produto} onChange={(e) => {
                      const p = produtos.find((x) => x.id === Number(e.target.value));
                      setFormItem((f) => ({ ...f, id_produto: e.target.value, descricao: p ? p.nome : "", valor_unitario: p ? p.preco_venda : "", referencia: p ? p.referencia : "" }));
                      if (e.target.value) resolverPreco(e.target.value);
                    }} style={sel(true)}>
                      <option value="">Selecione...</option>
                      {produtos.map((p) => <option key={p.id} value={p.id}>{p.referencia ? `${p.referencia} — ` : ""}{p.nome}</option>)}
                    </select>
                  </Campo>
                ) : (
                  <Campo label="Serviço" span={2}>
                    <select value={formItem.id_servico} onChange={(e) => {
                      const s = servicos.find((x) => x.id === Number(e.target.value));
                      setFormItem((f) => ({ ...f, id_servico: e.target.value, descricao: s ? s.nome : "", valor_unitario: s ? s.preco : "" }));
                    }} style={sel(true)}>
                      <option value="">Selecione...</option>
                      {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </Campo>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                <Campo label="Descrição"><input value={formItem.descricao} onChange={(e) => setFormItem((f) => ({ ...f, descricao: e.target.value }))} style={inp(true)} /></Campo>
                <Campo label="Qtd"><input value={formItem.quantidade} onChange={(e) => setFormItem((f) => ({ ...f, quantidade: e.target.value }))} inputMode="numeric" style={inp(true)} /></Campo>
                <Campo label={precoOrigem ? `Valor unit. (${precoOrigem})` : "Valor unit."}><input value={formItem.valor_unitario} onChange={(e) => setFormItem((f) => ({ ...f, valor_unitario: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
                <Campo label="Desc %"><input value={formItem.percentual_desconto} onChange={(e) => setFormItem((f) => ({ ...f, percentual_desconto: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
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
                <thead><tr>{["Tipo", "Descrição", "Qtd", "Valor Unit.", "Desc %", "Total", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 5)}>{h}</th>)}</tr></thead>
                <tbody>{itens.map((it) => (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={td()}><Badge texto={it.tipo} cor={it.tipo === "PRODUTO" ? "ATIVO" : "ABERTA"} /></td>
                    <td style={{ ...td(), fontWeight: 500 }}>{it.descricao}{it.referencia ? <span style={{ color: C.muted, fontSize: 11, marginLeft: 6 }}>{it.referencia}</span> : null}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{it.quantidade}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(it.valor_unitario)}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{num(it.percentual_desconto) > 0 ? `${it.percentual_desconto}%` : "—"}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(it.valor_total)}</td>
                    <td style={td()}>{podeEditar && <button onClick={() => removerItem(it.id)} style={{ ...btnIcon(), color: C.destructive }} title="Remover"><Trash2 size={13} /></button>}</td>
                  </tr>
                ))}</tbody>
              </table>}
        </div>

        {/* Modal Reprovar */}
        {reprovarOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setReprovarOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Reprovar Orçamento {orcAtual.numero}</h2>
              <Campo label="Motivo da reprovação *">
                <textarea value={motivoRepr} onChange={(e) => setMotivoRepr(e.target.value)} rows={3} placeholder="Informe o motivo..." style={{ ...inp(true), height: "auto", resize: "vertical" }} />
              </Campo>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={() => setReprovarOpen(false)} style={btnGhost()}>Cancelar</button>
                <button onClick={reprovar} disabled={saving} style={{ ...btnPrimary(), background: C.destructive, opacity: saving ? 0.6 : 1 }}>
                  <ThumbsDown size={14} /> {saving ? "Reprovando..." : "Confirmar Reprovação"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══ LISTA ════════════════════════════════════════════════════ */
  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Orçamentos</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {lista.length}</p></div>
        {perms.incluir && <button onClick={() => { setForm({ id: null, id_empresa: fEmpresa || "", id_cliente: "", id_vendedor: "", data_validade: "", observacao: "" }); setErroForm(""); setView("form"); }} style={btnPrimary()}><Plus size={16} /> Novo Orçamento</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nº ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}>
          <option value="">Todos</option><option value="ABERTO">Aberto</option><option value="APROVADO">Aprovado</option>
          <option value="REPROVADO">Reprovado</option><option value="CONVERTIDO">Convertido</option>
        </select>
        <select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel()}>
          <option value="">Todas empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
        </select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><FileText size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum orçamento encontrado.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead><tr>{["Nº", "Cliente", "Vendedor", "Status", "Emissão", "Validade", "Total", ""].map((h, i) => <th key={i} style={th(i === 6)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((o) => (
                <tr key={o.id} onClick={() => abrirDetalhe(o)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{o.numero}</span></td>
                  <td style={{ ...td(), fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeCliente(o.id_cliente)}</td>
                  <td style={{ ...td(), color: C.muted }}>{o.id_vendedor ? nomeUsuario(o.id_vendedor) : "—"}</td>
                  <td style={td()}><StatusBadge status={o.status} validade={o.data_validade} /></td>
                  <td style={{ ...td(), color: C.muted }}>{o.data_emissao ? new Date(o.data_emissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ ...td(), color: C.muted }}>{o.data_validade ? new Date(o.data_validade + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(o.valor_total)}</td>
                  <td style={td()}><button onClick={(e) => { e.stopPropagation(); abrirDetalhe(o); }} style={btnIcon()}><Eye size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>}
      </div>
    </>
  );
}
