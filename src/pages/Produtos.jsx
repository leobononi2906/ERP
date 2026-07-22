import { useState, useEffect } from "react";
import { Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Lock, ShieldCheck, Eye, Package, Boxes, Receipt } from "lucide-react";
import { C, mono, fmtBRL, num, rpc, SUPA_URL, SUPA_KEY } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge } from "../ui";
const SITUACOES = ["ATIVO", "INATIVO"];
const ORIGENS = [
  { v: 0, t: "0 - Nacional" }, { v: 1, t: "1 - Estrangeira (import. direta)" }, { v: 2, t: "2 - Estrangeira (merc. interno)" },
  { v: 3, t: "3 - Nacional >40% import." }, { v: 4, t: "4 - Nacional (PPB)" }, { v: 5, t: "5 - Nacional <40% import." },
  { v: 6, t: "6 - Estrangeira s/ similar (direta)" }, { v: 7, t: "7 - Estrangeira s/ similar (interno)" }, { v: 8, t: "8 - Nacional >70% import." },
];
const vazio = () => ({ id: null, referencia: "", nome: "", descricao: "", codigo_barras: "", ncm: "", id_grupo: "", id_marca: "", id_unidade: "", preco_custo: "", preco_venda: "", estoque_atual: 0, estoque_minimo: 0, estoque_maximo: 0, situacao: "ATIVO", origem: 0, produzido: false, cest: "", cfop_padrao: "", cst_csosn: "", aliquota_icms: "" });

export default function Produtos({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.produtos) || {};
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(vazio());
  const [prot, setProt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [busca, setBusca] = useState("");
  const [fGrupo, setFGrupo] = useState("");

  useEffect(() => {
    let a = true;
    rpc("produtos_dados").then((j) => { if (a && j && j.produtos) { setProdutos(j.produtos); setGrupos(j.grupos || []); setMarcas(j.marcas || []); setUnidades(j.unidades || []); setLive(true); } }).catch(() => { }).finally(() => a && setLoading(false));
    return () => { a = false; };
  }, []);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };
  const abrirNovo = () => { setForm(vazio()); setProt(false); setErroForm(""); setView("form"); };
  const abrirEditar = (p) => { setForm({ ...vazio(), ...p }); setProt(false); setErroForm(""); setView("form"); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar() {
    if (!form.nome.trim()) { setErroForm("O nome do produto é obrigatório."); return; }
    setErroForm(""); setSaving(true);
    const g = grupos.find((x) => String(x.id) === String(form.id_grupo)), m = marcas.find((x) => String(x.id) === String(form.id_marca)), u = unidades.find((x) => String(x.id) === String(form.id_unidade));
    const salvo = { ...form, grupo_nome: g?.descricao || null, marca_nome: m?.descricao || null, unidade_sigla: u?.sigla || null };
    try { const row = await rpc("produto_salvar", { p: { ...form, _ator: usuario.id } }); salvo.id = row.id || form.id; aplicar(salvo); notificar(form.id ? "Produto atualizado — registrado na auditoria." : "Produto cadastrado."); }
    catch (e) { if (!salvo.id) salvo.id = Math.max(0, ...produtos.map((p) => p.id)) + 1; aplicar(salvo); notificar("Salvo localmente (demo — sem conexão).", "warn"); }
    finally { setSaving(false); setView("lista"); }
  }
  const aplicar = (p) => setProdutos((l) => l.some((x) => x.id === p.id) ? l.map((x) => x.id === p.id ? p : x) : [...l, p]);

  const filtrados = produtos.filter((p) => { const q = busca.trim().toLowerCase(); const okB = !q || (p.nome || "").toLowerCase().includes(q) || (p.referencia || "").toLowerCase().includes(q); return okB && (!fGrupo || String(p.id_grupo) === fGrupo); });

  if (view === "form") return <FormProduto form={form} setF={setF} grupos={grupos} marcas={marcas} unidades={unidades} salvar={salvar} saving={saving} voltar={() => setView("lista")} erro={erroForm} perms={perms} prot={prot} destravar={() => setProt(true)} toast={toast} />;

  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Produtos</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {produtos.length} · {usuario.nome} · {live ? "ao vivo" : "demo"}</p></div>
        {perms.incluir ? <button onClick={abrirNovo} style={btnPrimary()}><Plus size={16} /> Novo produto</button> : <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Sem permissão para incluir</span>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou referência..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
        <select value={fGrupo} onChange={(e) => setFGrupo(e.target.value)} style={sel()}><option value="">Todos os grupos</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}</select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ height: 28, background: C.surface2, borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Package size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum produto encontrado.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 680 }}>
              <thead><tr>{["Produto", "Grupo", "Marca", "Preço venda", "Estoque", "Situação", ""].map((h, i) => <th key={i} style={th(i === 3)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((p) => { const baixo = num(p.estoque_atual) <= num(p.estoque_minimo); return (
                <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }} onMouseEnter={(e) => e.currentTarget.style.background = C.surface2} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={td()}><div style={{ fontWeight: 500 }}>{p.nome}</div><div style={{ fontSize: 11, color: C.textMuted, fontFamily: mono }}>{p.referencia}</div></td>
                  <td style={td()}>{p.grupo_nome || "—"}</td>
                  <td style={td()}>{p.marca_nome || "—"}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(p.preco_venda)}</td>
                  <td style={td()}><span style={{ fontFamily: mono }}>{num(p.estoque_atual)}</span> <span style={{ fontSize: 11, color: C.textMuted }}>{p.unidade_sigla}</span>{baixo && <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, background: C.warningBg, color: C.warning, padding: "1px 6px", borderRadius: 4 }}>BAIXO</span>}</td>
                  <td style={td()}><Badge texto={p.situacao} /></td>
                  <td style={{ ...td(), textAlign: "right" }}><button onClick={() => abrirEditar(p)} style={btnIcon()}>{(perms.editar || perms.aprovar) ? <Pencil size={15} /> : <Eye size={15} />}</button></td>
                </tr>); })}</tbody>
            </table></div>}
      </div>
    </>
  );
}

function Toast({ toast }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.tipo === "warn" ? C.warningBg : C.successBg, color: toast.tipo === "warn" ? C.warning : C.success }}>{toast.tipo === "warn" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{toast.msg}</div>;
}

function FormProduto({ form, setF, grupos, marcas, unidades, salvar, saving, voltar, erro, perms, prot, destravar, toast }) {
  const novo = !form.id;
  const cadOk = novo ? perms.incluir : perms.editar;
  const protOk = novo ? perms.incluir : (prot && perms.aprovar);
  const podeSalvar = cadOk || protOk;
  const custo = num(form.preco_custo), venda = num(form.preco_venda), lucro = venda - custo, margem = venda > 0 ? (lucro / venda) * 100 : 0;
  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={voltar} style={btnIcon()}><ArrowLeft size={18} /></button>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{novo ? "Novo produto" : "Editar produto"}</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{novo ? "Preencha os dados" : form.nome}</p></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><button onClick={voltar} style={btnGhost()}><X size={16} /> {podeSalvar ? "Cancelar" : "Voltar"}</button>{podeSalvar && <button onClick={salvar} disabled={saving} style={btnPrimary()}><Save size={16} /> {saving ? "Salvando..." : "Salvar"}</button>}</div>
      </div>
      {erro && <Aviso cor="destructive">{erro}</Aviso>}
      {!novo && !cadOk && !protOk && <Aviso cor="muted"><Eye size={15} /> Modo leitura. Seu grupo não tem permissão para alterar produtos.</Aviso>}

      <Secao titulo="Dados do produto">
        <Campo label="Referência"><input value={form.referencia} onChange={(e) => setF("referencia", e.target.value)} disabled={!cadOk} style={{ ...inp(true, !cadOk), fontFamily: mono }} /></Campo>
        <Campo label="Nome *" span={2}><input value={form.nome} onChange={(e) => setF("nome", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Grupo"><select value={form.id_grupo} onChange={(e) => setF("id_grupo", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}><option value="">—</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}</select></Campo>
        <Campo label="Marca"><select value={form.id_marca} onChange={(e) => setF("id_marca", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}><option value="">—</option>{marcas.map((m) => <option key={m.id} value={m.id}>{m.descricao}</option>)}</select></Campo>
        <Campo label="Unidade"><select value={form.id_unidade} onChange={(e) => setF("id_unidade", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}><option value="">—</option>{unidades.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}</select></Campo>
        <Campo label="Código de barras"><input value={form.codigo_barras} onChange={(e) => setF("codigo_barras", e.target.value)} disabled={!cadOk} style={{ ...inp(true, !cadOk), fontFamily: mono }} /></Campo>
        <Campo label="Situação"><select value={form.situacao} onChange={(e) => setF("situacao", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}>{SITUACOES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Campo>
        <Campo label="Descrição" span={3}><textarea value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} disabled={!cadOk} rows={2} style={{ ...inp(true, !cadOk), resize: "vertical", height: "auto", paddingTop: 10 }} /></Campo>
        <Campo label="Produção" span={3}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: cadOk ? "pointer" : "default", height: 40 }}>
            <input type="checkbox" checked={!!form.produzido} disabled={!cadOk} onChange={(e) => setF("produzido", e.target.checked)} />
            <span><b>Produto produzido internamente</b> — aparece no botão "Lançar Produção" da OS e pode ter composição de custo</span>
          </label>
        </Campo>
      </Secao>

      {form.produzido && form.id && <Composicao idProduto={form.id} podeEditar={cadOk} />}
      {form.produzido && !form.id && <Aviso cor="muted"><AlertCircle size={15} /> Salve o produto primeiro para montar a composição (peças e serviços que formam o custo).</Aviso>}

      <div style={{ ...cardStyle(), marginBottom: 16, borderLeft: `3px solid ${protOk ? C.blueMid : C.warning}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: protOk ? C.blueMid : C.warning, display: "flex", alignItems: "center", gap: 6 }}>{protOk ? <ShieldCheck size={14} /> : <Lock size={14} />} Preços e fiscal</div>
          {!novo && !protOk && (perms.aprovar ? <button onClick={destravar} style={{ ...btnGhost(), color: C.blueMid, borderColor: C.blueMid }}><Lock size={14} /> Editar preços e fiscal</button> : <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Requer permissão de aprovação</span>)}
        </div>
        {!novo && protOk && <Aviso cor="warning"><AlertCircle size={15} /> Alterações de preço/fiscal serão registradas na auditoria (quem, quando, de/para).</Aviso>}
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Preços</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
          <Campo label="Preço de custo (R$)"><input value={form.preco_custo} onChange={(e) => setF("preco_custo", e.target.value.replace(/[^\d.,]/g, ""))} disabled={!protOk} style={{ ...inp(true, !protOk), fontFamily: mono }} /></Campo>
          <Campo label="Preço de venda (R$)"><input value={form.preco_venda} onChange={(e) => setF("preco_venda", e.target.value.replace(/[^\d.,]/g, ""))} disabled={!protOk} style={{ ...inp(true, !protOk), fontFamily: mono }} /></Campo>
          <Campo label="Margem (calculada)"><div style={{ display: "flex", alignItems: "center", gap: 10, height: 40 }}><span style={{ fontFamily: mono, fontWeight: 700, fontSize: 18, color: margem >= 0 ? C.success : C.destructive }}>{margem.toFixed(1).replace(".", ",")}%</span><span style={{ fontSize: 12, color: C.textMuted }}>lucro {fmtBRL(lucro)}</span></div></Campo>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Receipt size={13} /> Fiscal (NF-e)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <Campo label="Origem da mercadoria" span={2}><select value={form.origem} onChange={(e) => setF("origem", Number(e.target.value))} disabled={!protOk} style={sel(true, !protOk)}>{ORIGENS.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select></Campo>
          <Campo label="NCM"><input value={form.ncm} onChange={(e) => setF("ncm", e.target.value)} disabled={!protOk} style={{ ...inp(true, !protOk), fontFamily: mono }} /></Campo>
          <Campo label="CEST"><input value={form.cest} onChange={(e) => setF("cest", e.target.value)} disabled={!protOk} style={{ ...inp(true, !protOk), fontFamily: mono }} /></Campo>
          <Campo label="CFOP padrão"><input value={form.cfop_padrao} onChange={(e) => setF("cfop_padrao", e.target.value)} disabled={!protOk} style={{ ...inp(true, !protOk), fontFamily: mono }} /></Campo>
          <Campo label="CST / CSOSN"><input value={form.cst_csosn} onChange={(e) => setF("cst_csosn", e.target.value)} disabled={!protOk} style={{ ...inp(true, !protOk), fontFamily: mono }} /></Campo>
          <Campo label="Alíquota ICMS (%)"><input value={form.aliquota_icms} onChange={(e) => setF("aliquota_icms", e.target.value.replace(/[^\d.,]/g, ""))} disabled={!protOk} style={{ ...inp(true, !protOk), fontFamily: mono }} /></Campo>
        </div>
      </div>

      <div style={{ ...cardStyle(), borderLeft: `3px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Boxes size={14} /> Estoque <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: C.textMuted }}>· somente leitura (movimenta no módulo Estoque)</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <ReadStat label="Estoque atual" valor={num(form.estoque_atual)} />
          <ReadStat label="Estoque mínimo" valor={num(form.estoque_minimo)} />
          <ReadStat label="Estoque máximo" valor={num(form.estoque_maximo)} />
        </div>
      </div>
    </>
  );
}
function ReadStat({ label, valor }) {
  return (<div><span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 5 }}>{label}</span><div style={{ background: "#EEF1F6", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", height: 40, boxSizing: "border-box", fontFamily: mono, fontWeight: 600, color: C.muted }}>{valor}</div></div>);
}

/* ═══ COMPOSIÇÃO DO PRODUTO PRODUZIDO ═══════════════════════════ */
function Composicao({ idProduto, podeEditar }) {
  const [itens, setItens] = useState([]);
  const [custoTotal, setCustoTotal] = useState(0);
  const [prods, setProds] = useState([]);
  const [servs, setServs] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [formC, setFormC] = useState({ tipo: "PECA", id_item: "", quantidade: 1, valor_unitario: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    try {
      const r = await rpc("produto_composicao_listar", { p_id_produto: idProduto });
      setItens(Array.isArray(r?.itens) ? r.itens : []);
      setCustoTotal(num(r?.custo_total));
    } catch (e) { setMsg("Erro: " + e.message); }
  }
  useEffect(() => {
    let a = true;
    carregar();
    const hdrs2 = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Accept-Profile": "Teste ERP", Range: "0-9999" };
    Promise.all([
      rpc("produtos_dados"),
      fetch(`${SUPA_URL}/rest/v1/servicos?select=id,nome,preco&situacao=eq.ATIVO&order=nome`, { headers: hdrs2 }).then((r) => r.ok ? r.json() : []),
    ]).then(([pd, sv]) => {
      if (!a) return;
      setProds((pd?.produtos || []).filter((x) => x.id !== idProduto && !x.produzido));
      setServs(Array.isArray(sv) ? sv : []);
      setCarregado(true);
    }).catch(() => a && setCarregado(true));
    return () => { a = false; };
  }, [idProduto]);

  async function adicionar() {
    if (!formC.id_item) { setMsg("Selecione o item."); return; }
    setSaving(true); setMsg("");
    try {
      await rpc("produto_composicao_salvar", { p: {
        id_produto: idProduto, tipo: formC.tipo,
        id_componente: formC.tipo === "PECA" ? num(formC.id_item) : null,
        id_servico: formC.tipo === "SERVICO" ? num(formC.id_item) : null,
        quantidade: num(formC.quantidade) || 1,
        custo_unitario: num(formC.valor_unitario) || null,
      }});
      setFormC({ tipo: formC.tipo, id_item: "", quantidade: 1, valor_unitario: "" });
      await carregar();
    } catch (e) { setMsg("Erro: " + e.message); }
    finally { setSaving(false); }
  }

  async function remover(id) {
    try { await rpc("produto_composicao_excluir", { p_id: id }); await carregar(); }
    catch (e) { setMsg("Erro: " + e.message); }
  }

  const lista = formC.tipo === "PECA" ? prods : servs;

  return (
    <div style={{ ...cardStyle(), marginBottom: 16, borderLeft: "3px solid #6B3FA0" }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B3FA0", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <Boxes size={14} /> Composição do produto
      </div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 0, marginBottom: 12 }}>Peças e serviços que formam o custo de referência. Custo total: <b style={{ fontFamily: mono, color: C.foreground }}>{fmtBRL(custoTotal)}</b></p>
      {msg && <Aviso cor="destructive"><AlertCircle size={15} /> {msg}</Aviso>}

      {podeEditar && carregado && (
        <div style={{ display: "grid", gridTemplateColumns: "110px 2fr 90px 110px auto", gap: 8, alignItems: "end", marginBottom: 12, background: C.surface2, borderRadius: 10, padding: 12 }}>
          <Campo label="Tipo">
            <select value={formC.tipo} onChange={(e) => setFormC((f) => ({ ...f, tipo: e.target.value, id_item: "", valor_unitario: "" }))} style={sel(true)}>
              <option value="PECA">Peça</option>
              <option value="SERVICO">Serviço</option>
            </select>
          </Campo>
          <Campo label={formC.tipo === "PECA" ? "Produto" : "Serviço"}>
            <select value={formC.id_item} onChange={(e) => {
              const it = lista.find((x) => x.id === Number(e.target.value));
              setFormC((f) => ({ ...f, id_item: e.target.value, valor_unitario: it ? (formC.tipo === "PECA" ? (it.preco_custo || it.preco_venda) : it.preco) : "" }));
            }} style={sel(true)}>
              <option value="">Selecione...</option>
              {lista.map((x) => <option key={x.id} value={x.id}>{x.referencia ? `${x.referencia} — ` : ""}{x.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Qtd"><input value={formC.quantidade} onChange={(e) => setFormC((f) => ({ ...f, quantidade: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
          <Campo label="Custo unit."><input value={formC.valor_unitario} onChange={(e) => setFormC((f) => ({ ...f, valor_unitario: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <button onClick={adicionar} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Plus size={14} /></button>
        </div>
      )}

      {itens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: C.textMuted, fontSize: 13 }}>Nenhum item na composição.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Tipo", "Item", "Qtd", "Custo Unit.", "Subtotal", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 4)}>{h}</th>)}</tr></thead>
          <tbody>
            {itens.map((it) => (
              <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={td()}><Badge texto={it.tipo === "PECA" ? "PEÇA" : "SERVIÇO"} cor={it.tipo === "PECA" ? "ATIVO" : "ABERTA"} /></td>
                <td style={{ ...td(), fontWeight: 500 }}>{it.nome}{it.referencia ? <span style={{ color: C.muted, fontFamily: mono, fontSize: 11, marginLeft: 6 }}>{it.referencia}</span> : null}</td>
                <td style={{ ...td(), textAlign: "right" }}>{num(it.quantidade)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(it.custo_unitario)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(num(it.custo_total))}</td>
                <td style={{ ...td(), textAlign: "right" }}>{podeEditar && <button onClick={() => remover(it.id)} style={{ ...btnIcon(), color: C.destructive }} title="Remover"><X size={13} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
