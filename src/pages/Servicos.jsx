import { useState, useEffect } from "react";
import { Search, Plus, Pencil, ArrowLeft, Save, X, AlertCircle, CheckCircle2, Lock, Wrench } from "lucide-react";
import { C, mono, fmtBRL, num, rpc, SUPA_URL, SUPA_KEY } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton } from "../ui";

const hdrs = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const schema = "Teste ERP";
const schemaHdr = { ...hdrs, "Accept-Profile": schema, "Content-Profile": schema };
async function sbQ(table, qs = "") {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, { headers: { ...schemaHdr, Range: "0-9999" } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

const VAZIO = () => ({ id: null, codigo: "", nome: "", descricao: "", preco: "", unidade: "UN", situacao: "ATIVO", id_grupo: "" });

export default function Servicos({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.produtos) || {};

  const [lista, setLista] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(VAZIO());
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fSituacao, setFSituacao] = useState("ATIVO");

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  /* ─── Gerenciar Áreas (grupos de serviço) ───────────────── */
  const [modalAreas, setModalAreas] = useState(false);
  const [formArea, setFormArea] = useState({ id: null, codigo: "", descricao: "", ativo: true });
  async function salvarArea() {
    if (!formArea.descricao.trim()) { notificar("Descrição da área é obrigatória.", "erro"); return; }
    setSaving(true);
    try {
      const res = await rpc("grupo_servico_salvar", {
        p_id: formArea.id || null, p_codigo: formArea.codigo || null,
        p_descricao: formArea.descricao, p_ativo: formArea.ativo !== false,
      });
      setGrupos((l) => { const sem = l.filter((x) => x.id !== res.id); return [...sem, res].sort((a, b) => (a.descricao || "").localeCompare(b.descricao || "")); });
      setFormArea({ id: null, codigo: "", descricao: "", ativo: true });
      notificar("Área salva.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    let ok = true;
    Promise.all([
      sbQ("servicos", "order=nome"),
      sbQ("grupos_servico", "order=descricao"),
    ]).then(([s, g]) => {
      if (!ok) return;
      setLista(Array.isArray(s) ? s : []);
      setGrupos(Array.isArray(g) ? g : []);
    }).catch(() => {}).finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  const nomeGrupo = (id) => (grupos.find(g => g.id === id) || {}).descricao || "—";

  async function salvar() {
    if (!form.nome) { setErroForm("Nome é obrigatório."); return; }
    setErroForm(""); setSaving(true);
    try {
      const res = await rpc("servico_salvar", {
        p_id: form.id || null,
        p_codigo: form.codigo || null,
        p_nome: form.nome,
        p_descricao: form.descricao || null,
        p_preco: num(form.preco) || 0,
        p_unidade: form.unidade || "UN",
        p_situacao: form.situacao || "ATIVO",
        p_id_grupo: num(form.id_grupo) || null,
      });
      setLista(l => {
        const sem = l.filter(s => s.id !== res.id);
        return [...sem, res].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      });
      notificar(form.id ? "Serviço atualizado." : "Serviço criado.");
      setView("lista");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(false); }
  }

  const filtrados = lista.filter(s => {
    const q = busca.trim().toLowerCase();
    const okBusca = !q || (s.nome || "").toLowerCase().includes(q) || (s.codigo || "").toLowerCase().includes(q);
    const okSit = !fSituacao || s.situacao === fSituacao;
    return okBusca && okSit;
  });

  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  /* ─── FORM ────────────────────────────────────────────── */
  if (view === "form") {
    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <div>
        {ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.id ? "Editar Serviço" : "Novo Serviço"}</h1>
        </div>
        {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}
        <Secao titulo="Dados do Serviço">
          <Campo label="Código">
            <input value={form.codigo} onChange={e => setF("codigo", e.target.value)} placeholder="Ex: SRV001" style={inp(true)} />
          </Campo>
          <Campo label="Nome *" span={2}>
            <input value={form.nome} onChange={e => setF("nome", e.target.value)} placeholder="Nome do serviço" style={inp(true)} />
          </Campo>
          <Campo label="Grupo">
            <select value={form.id_grupo} onChange={e => setF("id_grupo", e.target.value)} style={sel(true)}>
              <option value="">Sem grupo</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Preço">
            <input value={form.preco} onChange={e => setF("preco", e.target.value)} inputMode="decimal" placeholder="0,00" style={inp(true)} />
          </Campo>
          <Campo label="Unidade">
            <select value={form.unidade} onChange={e => setF("unidade", e.target.value)} style={sel(true)}>
              {["UN", "HR", "KG", "M2", "M", "PC", "CJ"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Campo>
          <Campo label="Descrição" span={3}>
            <textarea value={form.descricao} onChange={e => setF("descricao", e.target.value)} rows={3} style={{ ...inp(true), height: "auto", resize: "vertical" }} placeholder="Descrição detalhada do serviço" />
          </Campo>
        </Secao>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
            <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  /* ─── LISTA ───────────────────────────────────────────── */
  return (
    <>
      {ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Serviços</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} serviços</p>
        </div>
        {perms.incluir ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setModalAreas(true)} style={btnGhost()}>
              <Wrench size={14} /> Áreas de Serviço
            </button>
            <button onClick={() => { setForm(VAZIO()); setErroForm(""); setView("form"); }} style={btnPrimary()}>
              <Plus size={16} /> Novo Serviço
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Sem permissão</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou código..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fSituacao} onChange={e => setFSituacao(e.target.value)} style={sel()}>
          <option value="">Todos</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
      </div>

      {modalAreas && (
        <div onClick={() => setModalAreas(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Áreas de Serviço</span>
              <button onClick={() => setModalAreas(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 0 }}>As áreas (auto elétrica, radiador, tacógrafo...) organizam a Distribuição de serviços por setor.</p>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto auto", gap: 8, alignItems: "end", marginBottom: 14 }}>
                <Campo label="Código"><input value={formArea.codigo || ""} onChange={(e) => setFormArea((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))} maxLength={10} style={inp(true)} /></Campo>
                <Campo label="Descrição *"><input value={formArea.descricao} onChange={(e) => setFormArea((f) => ({ ...f, descricao: e.target.value }))} style={inp(true)} /></Campo>
                <button onClick={salvarArea} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                {formArea.id && <button onClick={() => setFormArea({ id: null, codigo: "", descricao: "", ativo: true })} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Código", "Descrição", "Situação", ""].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
                <tbody>
                  {grupos.map((g) => (
                    <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}`, opacity: g.ativo === false ? 0.5 : 1 }}>
                      <td style={{ ...td(), fontFamily: mono, fontWeight: 700 }}>{g.codigo || "—"}</td>
                      <td style={{ ...td(), fontWeight: 500 }}>{g.descricao}</td>
                      <td style={td()}><Badge texto={g.ativo === false ? "INATIVO" : "ATIVO"} /></td>
                      <td style={{ ...td(), whiteSpace: "nowrap" }}>
                        <button onClick={() => setFormArea({ id: g.id, codigo: g.codigo || "", descricao: g.descricao, ativo: g.ativo !== false })} style={btnIcon()} title="Editar"><Pencil size={13} /></button>
                        <button onClick={async () => { try { const r = await rpc("grupo_servico_salvar", { p_id: g.id, p_ativo: g.ativo === false }); setGrupos((l) => l.map((x) => x.id === r.id ? r : x)); } catch (e) { notificar("Erro: " + e.message, "erro"); } }} style={{ ...btnIcon(), marginLeft: 4 }} title={g.ativo === false ? "Reativar" : "Inativar"}>{g.ativo === false ? <CheckCircle2 size={13} /> : <X size={13} />}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2, 3].map(i => <Skeleton key={i} h={32} />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}>
            <Wrench size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Nenhum serviço encontrado.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
              <thead><tr>
                {["Código", "Nome", "Grupo", "Preço", "Unidade", "Situação", ""].map((h, i) => (
                  <th key={i} style={th(i === 3)}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), fontFamily: mono, fontWeight: 500 }}>{s.codigo || "—"}</td>
                    <td style={{ ...td(), fontWeight: 500 }}>{s.nome}</td>
                    <td style={{ ...td(), color: C.muted }}>{s.id_grupo ? nomeGrupo(s.id_grupo) : "—"}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(s.preco)}</td>
                    <td style={{ ...td(), color: C.muted }}>{s.unidade}</td>
                    <td style={td()}><Badge texto={s.situacao} cor={s.situacao === "ATIVO" ? "ATIVO" : "INATIVO"} /></td>
                    <td style={td()}>
                      {perms.editar && (
                        <button onClick={() => { setForm({ ...VAZIO(), ...s, preco: s.preco || "" }); setErroForm(""); setView("form"); }} style={btnIcon()}>
                          <Pencil size={14} />
                        </button>
                      )}
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
