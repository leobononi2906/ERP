import { useState, useEffect } from "react";
import { Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Lock, ShieldCheck, Eye, Package, Boxes, Receipt, Tag, Building2, Printer, History, Camera } from "lucide-react";
import { C, mono, fmtBRL, num, rpc, SUPA_URL, SUPA_KEY } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton } from "../ui";
import { EtiquetasLote } from "../EtiquetasLoteModal";
import { DrawerEstoque, DrawerHistorico } from "../drawers";
const SITUACOES = ["ATIVO", "INATIVO"];
const ORIGENS = [
  { v: 0, t: "0 - Nacional" }, { v: 1, t: "1 - Estrangeira (import. direta)" }, { v: 2, t: "2 - Estrangeira (merc. interno)" },
  { v: 3, t: "3 - Nacional >40% import." }, { v: 4, t: "4 - Nacional (PPB)" }, { v: 5, t: "5 - Nacional <40% import." },
  { v: 6, t: "6 - Estrangeira s/ similar (direta)" }, { v: 7, t: "7 - Estrangeira s/ similar (interno)" }, { v: 8, t: "8 - Nacional >70% import." },
];
const vazio = () => ({ id: null, referencia: "", nome: "", descricao: "", codigo_barras: "", ncm: "", id_grupo: "", id_marca: "", id_unidade: "", preco_custo: "", preco_venda: "", estoque_atual: 0, estoque_minimo: 0, estoque_maximo: 0, situacao: "ATIVO", origem: 0, produzido: false, bloquear_desconto: false, cest: "", cfop_padrao: "", cst_csosn: "", aliquota_icms: "", foto_url: "", localizacao: "" });

// Upload da foto do produto para o Storage (bucket público "produtos"); retorna a URL pública.
async function uploadFotoProduto(file, referencia) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const base = String(referencia || "prod").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "prod";
  const path = `${base}-${Date.now()}.${ext}`;
  const res = await fetch(`${SUPA_URL}/storage/v1/object/produtos/${path}`, {
    method: "POST",
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "x-upsert": "true", "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error("Falha no upload da foto (HTTP " + res.status + ")");
  return `${SUPA_URL}/storage/v1/object/public/produtos/${path}`;
}

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
  const [loteOpen, setLoteOpen] = useState(false);
  const [loteItens, setLoteItens] = useState([]);
  const abrirLote = (pre) => { setLoteItens(pre ? [{ ...pre, qtd: 1 }] : []); setLoteOpen(true); };

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

  const filtrados = produtos.filter((p) => { const q = busca.trim().toLowerCase(); const okB = !q || (p.nome || "").toLowerCase().includes(q) || (p.referencia || "").toLowerCase().includes(q) || (p.codigo_barras || "").toLowerCase().includes(q); return okB && (!fGrupo || String(p.id_grupo) === fGrupo); });

  if (view === "form") return <FormProduto form={form} setF={setF} grupos={grupos} marcas={marcas} unidades={unidades} salvar={salvar} saving={saving} voltar={() => setView("lista")} erro={erroForm} perms={perms} prot={prot} destravar={() => setProt(true)} toast={toast} ator={usuario.id} />;

  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Produtos</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {produtos.length} · {usuario.nome} · {live ? "ao vivo" : "demo"}</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => abrirLote(null)} style={btnGhost()}><Tag size={16} /> Etiquetas</button>
          {perms.incluir ? <button onClick={abrirNovo} style={btnPrimary()}><Plus size={16} /> Novo produto</button> : <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Sem permissão para incluir</span>}
        </div>
      </div>
      {loteOpen && <EtiquetasLote produtos={produtos} itens={loteItens} setItens={setLoteItens} onClose={() => setLoteOpen(false)} />}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, referência ou código de barras..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
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
                  <td style={{ ...td(), textAlign: "right", whiteSpace: "nowrap" }}><button onClick={() => abrirLote(p)} style={{ ...btnIcon(), marginRight: 6 }} title="Imprimir etiqueta"><Tag size={15} /></button><button onClick={() => abrirEditar(p)} style={btnIcon()}>{(perms.editar || perms.aprovar) ? <Pencil size={15} /> : <Eye size={15} />}</button></td>
                </tr>); })}</tbody>
            </table></div>}
      </div>
    </>
  );
}

function Toast({ toast }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.tipo === "warn" ? C.warningBg : C.successBg, color: toast.tipo === "warn" ? C.warning : C.success }}>{toast.tipo === "warn" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{toast.msg}</div>;
}

// Editor de disponibilidade + preço + fiscal por empresa (fallback no cadastro global)
function EmpresasProduto({ idProduto, ator, podeEditar }) {
  const [dados, setDados] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let a = true;
    rpc("produto_empresas_listar", { p_id_produto: idProduto })
      .then((d) => { if (!a) return; setDados(d || null); setLinhas((d?.empresas || []).map((e) => ({ ...e }))); })
      .catch(() => {})
      .finally(() => { if (a) setLoading(false); });
    return () => { a = false; };
  }, [idProduto]);

  const setCampo = (i, k, v) => setLinhas((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  async function salvar() {
    setSaving(true); setMsg(null);
    try {
      const payload = linhas.map((l) => ({
        id_empresa: l.id_empresa, disponivel: !!l.disponivel,
        cfop_padrao: l.cfop_padrao || null, cst_csosn: l.cst_csosn || null,
        aliquota_icms: l.aliquota_icms === "" || l.aliquota_icms == null ? null : num(l.aliquota_icms),
        cest: l.cest || null, ncm: l.ncm || null,
      }));
      const r = await rpc("produto_empresas_salvar", { p_id_produto: idProduto, p_linhas: payload, p_ator: ator });
      if (r && r.ok === false) { setMsg({ t: "erro", x: r.erro || "Falha ao salvar." }); return; }
      setMsg({ t: "ok", x: "Disponibilidade e preços por empresa salvos." });
    } catch (e) { setMsg({ t: "erro", x: e.message }); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ gridColumn: "1 / -1" }}><Skeleton h={120} /></div>;
  const g = dados?.global || {};
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 10 }}>
        Marque em quais empresas o produto é vendido e, se a tributação difere por empresa, informe o override fiscal. Em branco = usa o fiscal global do produto (CFOP {g.cfop_padrao || "—"} · CST {g.cst_csosn || "—"}). <b>Preço por empresa</b> fica no bloco "Preços por empresa / tabela" abaixo.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 680 }}>
          <thead><tr>
            {["Empresa", "Disp.", "CFOP", "CST/CSOSN", "Alíq %", "CEST", "NCM"].map((h, i) => (
              <th key={i} style={{ ...th(false), padding: "8px 8px", textAlign: i <= 1 ? "left" : "left" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.id_empresa} style={{ borderTop: `1px solid ${C.border}`, opacity: l.disponivel ? 1 : 0.55 }}>
                <td style={{ padding: "6px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>{l.empresa}</td>
                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                  <input type="checkbox" checked={!!l.disponivel} disabled={!podeEditar} onChange={(e) => setCampo(i, "disponivel", e.target.checked)} />
                </td>
                <td style={{ padding: "6px 8px" }}><input value={l.cfop_padrao ?? ""} disabled={!podeEditar} onChange={(e) => setCampo(i, "cfop_padrao", e.target.value)} placeholder={g.cfop_padrao || "global"} style={{ ...inp(true, !podeEditar), width: 74, fontFamily: mono, padding: "5px 8px" }} /></td>
                <td style={{ padding: "6px 8px" }}><input value={l.cst_csosn ?? ""} disabled={!podeEditar} onChange={(e) => setCampo(i, "cst_csosn", e.target.value)} placeholder={g.cst_csosn || "global"} style={{ ...inp(true, !podeEditar), width: 74, fontFamily: mono, padding: "5px 8px" }} /></td>
                <td style={{ padding: "6px 8px" }}><input value={l.aliquota_icms ?? ""} disabled={!podeEditar} onChange={(e) => setCampo(i, "aliquota_icms", e.target.value)} placeholder={g.aliquota_icms != null ? String(g.aliquota_icms) : "global"} inputMode="decimal" style={{ ...inp(true, !podeEditar), width: 64, fontFamily: mono, padding: "5px 8px" }} /></td>
                <td style={{ padding: "6px 8px" }}><input value={l.cest ?? ""} disabled={!podeEditar} onChange={(e) => setCampo(i, "cest", e.target.value)} placeholder={g.cest || "global"} style={{ ...inp(true, !podeEditar), width: 84, fontFamily: mono, padding: "5px 8px" }} /></td>
                <td style={{ padding: "6px 8px" }}><input value={l.ncm ?? ""} disabled={!podeEditar} onChange={(e) => setCampo(i, "ncm", e.target.value)} placeholder={g.ncm || "global"} style={{ ...inp(true, !podeEditar), width: 90, fontFamily: mono, padding: "5px 8px" }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {podeEditar && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}><Save size={14} /> {saving ? "Salvando..." : "Salvar por empresa"}</button>
          {msg && <span style={{ fontSize: 12.5, color: msg.t === "erro" ? C.destructive : C.success }}>{msg.x}</span>}
        </div>
      )}
    </div>
  );
}

function FormProduto({ form, setF, grupos, marcas, unidades, salvar, saving, voltar, erro, perms, prot, destravar, toast, ator }) {
  const novo = !form.id;
  const [drawer, setDrawer] = useState(null); // "estoque" | "hist"
  const [subindoFoto, setSubindoFoto] = useState(false);
  const [fotoErro, setFotoErro] = useState("");
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {!novo && <button onClick={() => setDrawer("estoque")} style={btnGhost()}><Boxes size={16} /> Estoque</button>}
          {!novo && <button onClick={() => setDrawer("hist")} style={btnGhost()}><History size={16} /> Histórico</button>}
          <button onClick={voltar} style={btnGhost()}><X size={16} /> {podeSalvar ? "Cancelar" : "Voltar"}</button>{podeSalvar && <button onClick={salvar} disabled={saving} style={btnPrimary()}><Save size={16} /> {saving ? "Salvando..." : "Salvar"}</button>}
        </div>
      </div>
      {drawer === "estoque" && <DrawerEstoque idProduto={form.id} onClose={() => setDrawer(null)} />}
      {drawer === "hist" && <DrawerHistorico tabela="produtos" registro={form.id} titulo="Histórico do produto" sub={form.nome} onClose={() => setDrawer(null)} />}
      {erro && <Aviso cor="destructive">{erro}</Aviso>}
      {!novo && !cadOk && !protOk && <Aviso cor="muted"><Eye size={15} /> Modo leitura. Seu grupo não tem permissão para alterar produtos.</Aviso>}

      <Secao titulo="Foto do produto">
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 96, height: 96, borderRadius: 10, border: `1px dashed ${C.border}`, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {form.foto_url ? <img src={form.foto_url} alt={form.nome || "produto"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Package size={28} style={{ opacity: 0.3 }} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cadOk && (
              <label style={{ ...btnGhost(), cursor: subindoFoto ? "default" : "pointer", opacity: subindoFoto ? 0.6 : 1, width: "fit-content" }}>
                <Camera size={15} /> {subindoFoto ? "Enviando..." : (form.foto_url ? "Trocar foto" : "Adicionar foto")}
                <input type="file" accept="image/*" disabled={subindoFoto} style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0]; if (!file) return;
                    setFotoErro("");
                    if (!file.type.startsWith("image/")) { setFotoErro("Selecione uma imagem."); e.target.value = ""; return; }
                    if (file.size > 5 * 1024 * 1024) { setFotoErro("Imagem muito grande (máx. 5MB)."); e.target.value = ""; return; }
                    setSubindoFoto(true);
                    try { const url = await uploadFotoProduto(file, form.referencia); setF("foto_url", url); }
                    catch (err) { setFotoErro(err.message); }
                    finally { setSubindoFoto(false); e.target.value = ""; }
                  }} />
              </label>
            )}
            {cadOk && form.foto_url && <button type="button" onClick={() => setF("foto_url", "")} style={{ ...btnGhost(), color: C.destructive, width: "fit-content" }}><X size={14} /> Remover</button>}
            {fotoErro && <span style={{ fontSize: 12, color: C.destructive }}>{fotoErro}</span>}
            <span style={{ fontSize: 11, color: C.textMuted }}>JPG/PNG até 5MB. Salva junto do cadastro; some ao remover.</span>
          </div>
        </div>
      </Secao>

      <Secao titulo="Dados do produto">
        <Campo label="Referência"><input value={form.referencia} onChange={(e) => setF("referencia", e.target.value)} disabled={!cadOk} style={{ ...inp(true, !cadOk), fontFamily: mono }} /></Campo>
        <Campo label="Nome *" span={2}><input value={form.nome} onChange={(e) => setF("nome", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Grupo"><select value={form.id_grupo} onChange={(e) => setF("id_grupo", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}><option value="">—</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}</select></Campo>
        <Campo label="Marca"><select value={form.id_marca} onChange={(e) => setF("id_marca", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}><option value="">—</option>{marcas.map((m) => <option key={m.id} value={m.id}>{m.descricao}</option>)}</select></Campo>
        <Campo label="Unidade"><select value={form.id_unidade} onChange={(e) => setF("id_unidade", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}><option value="">—</option>{unidades.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}</select></Campo>
        <Campo label="Código de barras"><input value={form.codigo_barras} onChange={(e) => setF("codigo_barras", e.target.value)} disabled={!cadOk} style={{ ...inp(true, !cadOk), fontFamily: mono }} /></Campo>
        <Campo label="Situação"><select value={form.situacao} onChange={(e) => setF("situacao", e.target.value)} disabled={!cadOk} style={sel(true, !cadOk)}>{SITUACOES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Campo>
        <Campo label="Localização (prateleira/endereço)"><input value={form.localizacao || ""} onChange={(e) => setF("localizacao", e.target.value)} disabled={!cadOk} placeholder="Ex.: Corredor B · Prat. 3" style={{ ...inp(true, !cadOk), fontFamily: mono }} /></Campo>
        <Campo label="Descrição" span={3}><textarea value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} disabled={!cadOk} rows={2} style={{ ...inp(true, !cadOk), resize: "vertical", height: "auto", paddingTop: 10 }} /></Campo>
        <Campo label="Produção" span={2}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: cadOk ? "pointer" : "default", height: 40 }}>
            <input type="checkbox" checked={!!form.produzido} disabled={!cadOk} onChange={(e) => setF("produzido", e.target.checked)} />
            <span><b>Produto produzido internamente</b> — composição de custo na OS</span>
          </label>
        </Campo>
        <Campo label="Desconto">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: cadOk ? "pointer" : "default", height: 40 }}>
            <input type="checkbox" checked={!!form.bloquear_desconto} disabled={!cadOk} onChange={(e) => setF("bloquear_desconto", e.target.checked)} />
            <span><b>Bloquear desconto</b> — nenhuma política se aplica, desconto sempre 0%</span>
          </label>
        </Campo>
      </Secao>

      {form.id && <Composicao idProduto={form.id} podeEditar={cadOk} />}
      {!form.id && <Aviso cor="muted"><AlertCircle size={15} /> Salve o produto primeiro para montar a composição de custo (peças + serviços) e a mão de obra.</Aviso>}

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

      {!novo && <PrecosEmpresa idProduto={form.id} ator={ator} podeEditar={protOk} custoBase={form.preco_custo} />}
      {novo && <Aviso cor="muted"><AlertCircle size={15} /> Salve o produto para configurar preços por empresa e tabela (markup, margem ou preço manual).</Aviso>}

      {!novo && (
        <Secao titulo="Disponibilidade e fiscal por empresa">
          <EmpresasProduto idProduto={form.id} ator={ator} podeEditar={protOk} />
        </Secao>
      )}
      {novo && <Aviso cor="muted"><AlertCircle size={15} /> Salve o produto para marcar em quais empresas ele é vendido e ajustar o fiscal por empresa.</Aviso>}

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

/* ═══ PREÇOS POR EMPRESA / TABELA (markup, margem ou preço manual) ═══ */
const TIPOS_PRECO = [
  { v: "MARKUP", t: "Markup sobre custo" },
  { v: "MARGEM", t: "Margem fixa (s/ venda)" },
  { v: "MANUAL", t: "Preço manual" },
];
function normTipo(t) { return t === "MARKUP" || t === "MARGEM" ? t : "MANUAL"; }
function calcPreco(tipo, custo, margem, manual) {
  const c = num(custo), m = num(margem);
  if (tipo === "MARKUP") return c * (1 + m / 100);
  if (tipo === "MARGEM") return m < 100 && m >= 0 ? c / (1 - m / 100) : 0;
  return num(manual);
}
function PrecosEmpresa({ idProduto, ator, podeEditar, custoBase }) {
  const [empresas, setEmpresas] = useState([]);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [custoMedio, setCustoMedio] = useState(0);
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let a = true;
    rpc("erp_list", { p_tabela: "empresas", p_limit: 9999 })
      .then((rows) => { if (!a) return; const es = rows || []; setEmpresas(es); if (es[0]) setIdEmpresa(String(es[0].id)); })
      .catch(() => a && setEmpresas([]));
    return () => { a = false; };
  }, []);

  async function carregar(emp) {
    if (!emp) return;
    setLoading(true);
    try {
      const d = await rpc("produto_precos_dados", { p: { id_produto: idProduto, id_empresa: num(emp) } });
      setCustoMedio(num(d?.custo_medio));
      setLinhas((d?.precos || []).map((x) => {
        const tipo = normTipo(x.tipo_calculo);
        return { id_tabela_preco: x.id_tabela_preco, tabela_nome: x.tabela_nome, tipo, margem: x.margem_percentual ?? "", preco: x.preco_venda ?? "" };
      }));
    } catch (e) { setMsg({ tipo: "warn", txt: "Erro ao carregar preços: " + e.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (idEmpresa) carregar(idEmpresa); /* eslint-disable-next-line */ }, [idEmpresa, idProduto]);

  const custo = custoMedio > 0 ? custoMedio : num(custoBase);
  const upd = (i, patch) => setLinhas((ls) => ls.map((l, j) => j === i ? { ...l, ...patch } : l));

  function precoLinha(l) {
    if (l.tipo === "MANUAL") return num(l.preco);
    return calcPreco(l.tipo, custo, l.margem, l.preco);
  }
  function margemReal(preco) { const p = num(preco); return p > 0 ? ((p - custo) / p) * 100 : 0; }

  async function salvarLinha(i) {
    const l = linhas[i];
    const preco = Number(precoLinha(l).toFixed(2));
    if (l.tipo !== "MANUAL" && !(num(l.margem) >= 0)) { setMsg({ tipo: "warn", txt: "Informe a margem/markup." }); return; }
    if (preco <= 0) { setMsg({ tipo: "warn", txt: "Preço resultante inválido (confira o custo)." }); return; }
    setSavingId(l.id_tabela_preco); setMsg(null);
    try {
      await rpc("produto_preco_salvar", { p: {
        id_produto: idProduto, id_empresa: num(idEmpresa), id_tabela_preco: l.id_tabela_preco,
        tipo_calculo: l.tipo, margem_percentual: l.tipo === "MANUAL" ? null : num(l.margem), preco_venda: preco, _ator: ator,
      }});
      upd(i, { preco });
      setMsg({ tipo: "ok", txt: `Preço de "${l.tabela_nome}" salvo (${fmtBRL(preco)}).` });
    } catch (e) { setMsg({ tipo: "warn", txt: "Erro ao salvar: " + e.message }); }
    finally { setSavingId(null); }
  }

  return (
    <div style={{ ...cardStyle(), marginBottom: 16, borderLeft: "3px solid #0F9D6E" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0F9D6E", display: "flex", alignItems: "center", gap: 6 }}>
          <Tag size={14} /> Preços por empresa / tabela
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={15} style={{ color: C.textMuted }} />
          <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={{ ...sel(), minWidth: 200 }}>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome || e.nome_fantasia || `Empresa ${e.id}`}</option>)}
          </select>
        </div>
      </div>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>
        Custo de referência: <b style={{ fontFamily: mono, color: C.foreground }}>{fmtBRL(custo)}</b>
        {custoMedio > 0 ? " (custo médio do estoque)" : " (preço de custo do cadastro)"}
        . Escolha por tabela: <b>Markup</b> (custo + %), <b>Margem fixa</b> (% sobre a venda) ou <b>Preço manual</b>.
      </p>
      {msg && <Aviso cor={msg.tipo === "ok" ? "success" : "warning"}>{msg.tipo === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.txt}</Aviso>}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 40, background: C.surface2, borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
      ) : linhas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "18px 0", color: C.textMuted, fontSize: 13 }}>Nenhuma tabela de preço ativa cadastrada.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Tabela", "Cálculo", "Markup/Margem %", "Preço de venda", "Margem real", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 4)}>{h}</th>)}</tr></thead>
          <tbody>
            {linhas.map((l, i) => {
              const preco = precoLinha(l);
              const manual = l.tipo === "MANUAL";
              return (
                <tr key={l.id_tabela_preco} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ ...td(), fontWeight: 500 }}>{l.tabela_nome}</td>
                  <td style={td()}>
                    <select value={l.tipo} disabled={!podeEditar} onChange={(e) => upd(i, { tipo: e.target.value })} style={{ ...sel(true, !podeEditar), minWidth: 160 }}>
                      {TIPOS_PRECO.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td(), textAlign: "right" }}>
                    <input value={manual ? "" : l.margem} disabled={!podeEditar || manual} placeholder={manual ? "—" : "0"}
                      onChange={(e) => upd(i, { margem: e.target.value.replace(/[^\d.,]/g, "") })}
                      style={{ ...inp(true, !podeEditar || manual), fontFamily: mono, textAlign: "right", width: 110 }} />
                  </td>
                  <td style={{ ...td(), textAlign: "right" }}>
                    {manual ? (
                      <input value={l.preco} disabled={!podeEditar} onChange={(e) => upd(i, { preco: e.target.value.replace(/[^\d.,]/g, "") })}
                        style={{ ...inp(true, !podeEditar), fontFamily: mono, textAlign: "right", width: 120, fontWeight: 600 }} />
                    ) : (
                      <span style={{ fontFamily: mono, fontWeight: 700 }}>{fmtBRL(preco)}</span>
                    )}
                  </td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: margemReal(preco) >= 0 ? C.success : C.destructive }}>{margemReal(preco).toFixed(1).replace(".", ",")}%</td>
                  <td style={{ ...td(), textAlign: "right" }}>
                    {podeEditar && <button onClick={() => salvarLinha(i)} disabled={savingId === l.id_tabela_preco} style={{ ...btnPrimary(), padding: "8px 12px" }}><Save size={14} /> {savingId === l.id_tabela_preco ? "..." : "Salvar"}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!podeEditar && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Lock size={13} /> Edição de preços requer destravar “Preços e fiscal” acima.</div>}
    </div>
  );
}

/* ═══ COMPOSIÇÃO DE CUSTO + MÃO DE OBRA ═════════════════════════
   Peças (produtos) + serviços que formam o CUSTO de referência do produto.
   Só para custo/comissão — NÃO baixa estoque. A mão de obra (serviços) é
   dinâmica: horas × valor/hora do serviço; muda no cadastro do serviço,
   muda o MO de todos os produtos.                                        */
function Composicao({ idProduto, podeEditar }) {
  const [itens, setItens] = useState([]);
  const [custoTotal, setCustoTotal] = useState(0);
  const [valorMo, setValorMo] = useState(0);
  const [custoMat, setCustoMat] = useState(0);
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
      setValorMo(num(r?.valor_mo));
      setCustoMat(num(r?.custo_materiais));
    } catch (e) { setMsg("Erro: " + e.message); }
  }
  useEffect(() => {
    let a = true;
    carregar();
    Promise.all([
      rpc("produtos_dados"),
      rpc("produtos_servicos_dados"),
    ]).then(([pd, sv]) => {
      if (!a) return;
      setProds((pd?.produtos || []).filter((x) => x.id !== idProduto));
      setServs(sv.servicos ?? []);
      setCarregado(true);
    }).catch(() => a && setCarregado(true));
    return () => { a = false; };
  }, [idProduto]);

  const isServ = formC.tipo === "SERVICO";

  async function adicionar() {
    if (!formC.id_item) { setMsg("Selecione o item."); return; }
    setSaving(true); setMsg("");
    try {
      await rpc("produto_composicao_salvar", { p: {
        id_produto: idProduto, tipo: formC.tipo,
        id_componente: !isServ ? num(formC.id_item) : null,
        id_servico: isServ ? num(formC.id_item) : null,
        quantidade: num(formC.quantidade) || (isServ ? 1 : 1),
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

  const lista = isServ ? servs : prods;

  return (
    <div style={{ ...cardStyle(), marginBottom: 16, borderLeft: "3px solid #6B3FA0" }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B3FA0", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <Boxes size={14} /> Composição de custo + Mão de obra
      </div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 0, marginBottom: 12 }}>
        Peças (produtos) e serviços que formam o custo de referência — só para custo/comissão, <b>não baixa estoque</b>. A mão de obra é <b>horas × valor/hora do serviço</b> e recalcula sozinha se você mudar o valor/hora no cadastro do serviço.
      </p>

      {/* Totais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { l: "Custo materiais", v: custoMat, c: C.foreground },
          { l: "Mão de obra (MO)", v: valorMo, c: "#6B3FA0" },
          { l: "Custo total", v: custoTotal, c: C.primary },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface2, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted }}>{k.l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: k.c }}>{fmtBRL(k.v)}</div>
          </div>
        ))}
      </div>

      {msg && <Aviso cor="destructive"><AlertCircle size={15} /> {msg}</Aviso>}

      {podeEditar && carregado && (
        <div style={{ display: "grid", gridTemplateColumns: "120px 2fr 100px 120px auto", gap: 8, alignItems: "end", marginBottom: 12, background: C.surface2, borderRadius: 10, padding: 12 }}>
          <Campo label="Tipo">
            <select value={formC.tipo} onChange={(e) => setFormC((f) => ({ ...f, tipo: e.target.value, id_item: "", valor_unitario: "" }))} style={sel(true)}>
              <option value="PECA">Peça</option>
              <option value="SERVICO">Serviço (MO)</option>
            </select>
          </Campo>
          <Campo label={isServ ? "Serviço" : "Produto"}>
            <select value={formC.id_item} onChange={(e) => {
              const it = lista.find((x) => x.id === Number(e.target.value));
              setFormC((f) => ({ ...f, id_item: e.target.value, valor_unitario: it ? (isServ ? (it.valor_hora || it.preco) : (it.preco_custo || it.preco_venda)) : "" }));
            }} style={sel(true)}>
              <option value="">Selecione...</option>
              {lista.map((x) => <option key={x.id} value={x.id}>{x.referencia ? `${x.referencia} — ` : ""}{x.nome}{isServ && num(x.valor_hora) > 0 ? ` (${fmtBRL(x.valor_hora)}/h)` : ""}</option>)}
            </select>
          </Campo>
          <Campo label={isServ ? "Horas" : "Qtd"}><input value={formC.quantidade} onChange={(e) => setFormC((f) => ({ ...f, quantidade: e.target.value }))} inputMode="decimal" placeholder={isServ ? "1.5" : "1"} style={inp(true)} /></Campo>
          <Campo label={isServ ? "Valor/hora" : "Custo unit."}><input value={formC.valor_unitario} onChange={(e) => setFormC((f) => ({ ...f, valor_unitario: e.target.value }))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <button onClick={adicionar} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Plus size={14} /></button>
        </div>
      )}

      {itens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: C.textMuted, fontSize: 13 }}>Nenhum item na composição.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Tipo", "Item", "Qtd / Horas", "Valor unit.", "Subtotal", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 4)}>{h}</th>)}</tr></thead>
          <tbody>
            {itens.map((it) => (
              <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={td()}><Badge texto={it.is_servico ? "MÃO DE OBRA" : "PEÇA"} cor={it.is_servico ? "ABERTA" : "ATIVO"} /></td>
                <td style={{ ...td(), fontWeight: 500 }}>{it.nome}{it.referencia ? <span style={{ color: C.muted, fontFamily: mono, fontSize: 11, marginLeft: 6 }}>{it.referencia}</span> : null}</td>
                <td style={{ ...td(), textAlign: "right" }}>{num(it.quantidade)}{it.is_servico ? " h" : ""}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(it.custo_unitario)}{it.is_servico ? "/h" : ""}</td>
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
