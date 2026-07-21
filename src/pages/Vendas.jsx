import { useState, useEffect } from "react";
import { Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Lock, ShoppingCart, Package, Wrench, FileText, DollarSign, Trash2, Eye } from "lucide-react";
import { C, mono, fmtBRL, num, rpc, SUPA_URL, SUPA_KEY, ATOR } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton } from "../ui";

const hdrs = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const schemaHdr = { ...hdrs, "Accept-Profile": "Teste ERP", "Content-Profile": "Teste ERP" };
async function sbQ(t, q = "") { const r = await fetch(`${SUPA_URL}/rest/v1/${t}?${q}`, { headers: { ...schemaHdr, Range: "0-9999" } }); if (!r.ok) throw new Error(r.status); return r.json(); }

const PERMS = {
  Administrador: { incluir: true, editar: true, faturar: true },
  Gestor: { incluir: true, editar: true, faturar: true },
  "Vendedor Loja": { incluir: true, editar: true, faturar: false },
  Estoque: { incluir: false, editar: false, faturar: false },
  Financeiro: { incluir: false, editar: false, faturar: true },
};

const STATUS_CORES = { ABERTA: "ABERTA", FATURADA: "FATURADA", CANCELADA: "CANCELADA" };

export default function Vendas({ simGrupo }) {
  const perms = PERMS[simGrupo] || PERMS.Administrador;
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [formasPag, setFormasPag] = useState([]);
  const [condPag, setCondPag] = useState([]);

  const [view, setView] = useState("lista");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");

  // detalhe
  const [vendaAtual, setVendaAtual] = useState(null);
  const [itens, setItens] = useState([]);
  const [loadDet, setLoadDet] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [formItem, setFormItem] = useState({ tipo: "PRODUTO", id_produto: "", id_servico: "", descricao: "", quantidade: 1, valor_unitario: "" });

  // faturar
  const [fatOpen, setFatOpen] = useState(false);
  const [fatForma, setFatForma] = useState("");
  const [fatCond, setFatCond] = useState("");

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    let ok = true;
    Promise.all([
      sbQ("vendas", "order=criado_em.desc"),
      sbQ("clientes", "select=id,nome&order=nome"),
      sbQ("produtos", "select=id,referencia,nome,preco_venda&situacao=eq.ATIVO&order=nome"),
      sbQ("servicos", "select=id,nome,preco&situacao=eq.ATIVO&order=nome"),
      sbQ("usuarios", "select=id,nome&order=nome"),
      sbQ("formas_pagamento", "ativo=eq.true&order=descricao"),
      sbQ("condicoes_pagamento", "ativo=eq.true&order=descricao"),
    ]).then(([v, c, p, s, u, fp, cp]) => {
      if (!ok) return;
      setLista(Array.isArray(v) ? v : []); setClientes(Array.isArray(c) ? c : []);
      setProdutos(Array.isArray(p) ? p : []); setServicos(Array.isArray(s) ? s : []);
      setUsuarios(Array.isArray(u) ? u : []); setFormasPag(Array.isArray(fp) ? fp : []);
      setCondPag(Array.isArray(cp) ? cp : []);
    }).catch(() => {}).finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  const nomeCliente = (id) => (clientes.find((c) => c.id === id) || {}).nome || "—";
  const nomeUsuario = (id) => (usuarios.find((u) => u.id === id) || {}).nome || "—";

  /* ─── Abrir detalhe ──────────────────────────────────────────── */
  async function abrirDetalhe(venda) {
    setVendaAtual(venda); setLoadDet(true); setView("detalhe");
    try {
      const it = await sbQ("vendas_itens", `id_venda=eq.${venda.id}&order=id`);
      setItens(Array.isArray(it) ? it : []);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoadDet(false); }
  }

  /* ─── Salvar venda ───────────────────────────────────────────── */
  async function salvarVenda() {
    if (!form.id_cliente) { setErroForm("Selecione o cliente."); return; }
    setErroForm(""); setSaving(true);
    try {
      const res = await rpc("venda_salvar", { p: { ...form, _ator: ATOR } });
      if (res && res.id) {
        setLista((l) => { const sem = l.filter((x) => x.id !== res.id); return [res, ...sem]; });
        notificar(form.id ? "Venda atualizada." : `Venda nº ${res.numero} criada.`);
        abrirDetalhe(res);
      }
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── Lançar item ────────────────────────────────────────────── */
  async function lancarItem() {
    if (!formItem.descricao.trim()) { notificar("Descrição obrigatória.", "erro"); return; }
    const vt = (num(formItem.quantidade) || 1) * (num(formItem.valor_unitario) || 0);
    setSaving(true);
    try {
      const res = await rpc("venda_lancar_item", { p: {
        id_venda: vendaAtual.id, tipo: formItem.tipo,
        id_produto: formItem.tipo === "PRODUTO" ? formItem.id_produto : null,
        id_servico: formItem.tipo === "SERVICO" ? formItem.id_servico : null,
        descricao: formItem.descricao, quantidade: num(formItem.quantidade) || 1,
        valor_unitario: num(formItem.valor_unitario) || 0, valor_total: vt, _ator: ATOR,
      }});
      // Recarregar itens e venda
      const [it, vd] = await Promise.all([
        sbQ("vendas_itens", `id_venda=eq.${vendaAtual.id}&order=id`),
        sbQ("vendas", `id=eq.${vendaAtual.id}`),
      ]);
      setItens(Array.isArray(it) ? it : []);
      const vAtualizada = Array.isArray(vd) ? vd[0] : vd;
      setVendaAtual(vAtualizada);
      setLista((l) => l.map((x) => x.id === vAtualizada.id ? vAtualizada : x));
      setFormItem({ tipo: "PRODUTO", id_produto: "", id_servico: "", descricao: "", quantidade: 1, valor_unitario: "" });
      setAddItem(false);
      notificar("Item adicionado." + (res?.estoque ? ` Estoque: ${res.estoque.estoque_posterior}` : ""));
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── Remover item ───────────────────────────────────────────── */
  async function removerItem(idItem) {
    try {
      await rpc("venda_remover_item", { p: { id_item: idItem, _ator: ATOR } });
      const [it, vd] = await Promise.all([
        sbQ("vendas_itens", `id_venda=eq.${vendaAtual.id}&order=id`),
        sbQ("vendas", `id=eq.${vendaAtual.id}`),
      ]);
      setItens(Array.isArray(it) ? it : []);
      const vAtualizada = Array.isArray(vd) ? vd[0] : vd;
      setVendaAtual(vAtualizada);
      setLista((l) => l.map((x) => x.id === vAtualizada.id ? vAtualizada : x));
      notificar("Item removido e estoque devolvido.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  /* ─── Faturar ────────────────────────────────────────────────── */
  async function faturar() {
    if (!fatForma) { notificar("Selecione a forma de pagamento.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("venda_faturar", { p: {
        id_venda: vendaAtual.id, id_forma_pagamento: fatForma,
        id_condicao_pagamento: fatCond || null, _ator: ATOR,
      }});
      if (res && res.ok === false) { notificar(res.msg, "erro"); setSaving(false); return; }
      const vd = await sbQ("vendas", `id=eq.${vendaAtual.id}`);
      const vAtualizada = Array.isArray(vd) ? vd[0] : vd;
      setVendaAtual(vAtualizada);
      setLista((l) => l.map((x) => x.id === vAtualizada.id ? vAtualizada : x));
      setFatOpen(false);
      notificar("Venda faturada com sucesso!");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  const filtrados = lista.filter((v) => {
    const q = busca.trim().toLowerCase();
    const okB = !q || (v.numero || "").includes(q) || nomeCliente(v.id_cliente).toLowerCase().includes(q);
    return okB && (!fStatus || v.status === fStatus) && !v.cancelada;
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
          <Campo label="Cliente *" span={2}>
            <select value={form.id_cliente || ""} onChange={(e) => setF("id_cliente", e.target.value)} style={sel(true)}>
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

    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Venda {vendaAtual.numero}</h1>
              <Badge texto={vendaAtual.status} cor={STATUS_CORES[vendaAtual.status]} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
              {nomeCliente(vendaAtual.id_cliente)} {vendaAtual.id_vendedor ? `· Vendedor: ${nomeUsuario(vendaAtual.id_vendedor)}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!isFaturada && perms.editar && <button onClick={() => { setForm({ ...vendaAtual }); setView("form"); }} style={btnGhost()}><Pencil size={14} /> Editar</button>}
            {!isFaturada && perms.faturar && itens.length > 0 && <button onClick={() => { setFatForma(vendaAtual.id_forma_pagamento || ""); setFatCond(vendaAtual.id_condicao_pagamento || ""); setFatOpen(true); }} style={btnPrimary()}><DollarSign size={14} /> Faturar</button>}
          </div>
        </div>

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
            {!isFaturada && perms.editar && <button onClick={() => setAddItem(!addItem)} style={btnPrimary()}><Plus size={14} /> Adicionar item</button>}
          </div>

          {addItem && (
            <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Campo label="Tipo">
                  <select value={formItem.tipo} onChange={(e) => setFormItem((f) => ({ ...f, tipo: e.target.value, id_produto: "", id_servico: "", descricao: "", valor_unitario: "" }))} style={sel(true)}>
                    <option value="PRODUTO">Produto</option>
                    <option value="SERVICO">Serviço</option>
                  </select>
                </Campo>
                {formItem.tipo === "PRODUTO" ? (
                  <Campo label="Produto" span={2}>
                    <select value={formItem.id_produto} onChange={(e) => {
                      const p = produtos.find((x) => x.id === Number(e.target.value));
                      setFormItem((f) => ({ ...f, id_produto: e.target.value, descricao: p ? p.nome : "", valor_unitario: p ? p.preco_venda : "" }));
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
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                <Campo label="Descrição"><input value={formItem.descricao} onChange={(e) => setFormItem((f) => ({ ...f, descricao: e.target.value }))} style={inp(true)} /></Campo>
                <Campo label="Qtd"><input value={formItem.quantidade} onChange={(e) => setFormItem((f) => ({ ...f, quantidade: e.target.value }))} inputMode="numeric" style={inp(true)} /></Campo>
                <Campo label="Valor unit."><input value={formItem.valor_unitario} onChange={(e) => setFormItem((f) => ({ ...f, valor_unitario: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={lancarItem} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                  <button onClick={() => setAddItem(false)} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
                </div>
              </div>
            </div>
          )}

          {loadDet ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={28} />)}</div>
            : itens.length === 0 ? <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}><ShoppingCart size={28} style={{ opacity: 0.3 }} /><div style={{ marginTop: 8, fontSize: 13 }}>Nenhum item adicionado.</div></div>
              : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Tipo", "Descrição", "Qtd", "Valor Unit.", "Total", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 4)}>{h}</th>)}</tr></thead>
                <tbody>{itens.map((it) => (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={td()}><Badge texto={it.tipo} cor={it.tipo === "PRODUTO" ? "ATIVO" : "ABERTA"} /></td>
                    <td style={{ ...td(), fontWeight: 500 }}>{it.descricao}</td>
                    <td style={{ ...td(), textAlign: "right" }}>{it.quantidade}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(it.valor_unitario)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(it.valor_total)}</td>
                    <td style={td()}>{!isFaturada && perms.editar && <button onClick={() => removerItem(it.id)} style={{ ...btnIcon(), color: C.destructive }} title="Remover"><Trash2 size={13} /></button>}</td>
                  </tr>
                ))}</tbody>
              </table>}
        </div>

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
                <button onClick={faturar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
                  <DollarSign size={14} /> {saving ? "Faturando..." : "Confirmar Faturamento"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══ LISTA ═══ */
  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Vendas</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {lista.length}</p></div>
        {perms.incluir && <button onClick={() => { setForm({ id: null, id_cliente: "", id_vendedor: "", observacao: "" }); setErroForm(""); setView("form"); }} style={btnPrimary()}><Plus size={16} /> Nova Venda</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nº ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}>
          <option value="">Todos</option><option value="ABERTA">Aberta</option><option value="FATURADA">Faturada</option>
        </select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><ShoppingCart size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma venda encontrada.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 650 }}>
              <thead><tr>{["Nº", "Cliente", "Vendedor", "Status", "Data", "Total", ""].map((h, i) => <th key={i} style={th(i === 5)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((v) => (
                <tr key={v.id} onClick={() => abrirDetalhe(v)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{v.numero}</span></td>
                  <td style={{ ...td(), fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeCliente(v.id_cliente)}</td>
                  <td style={{ ...td(), color: C.muted }}>{v.id_vendedor ? nomeUsuario(v.id_vendedor) : "—"}</td>
                  <td style={td()}><Badge texto={v.status} cor={STATUS_CORES[v.status]} /></td>
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
